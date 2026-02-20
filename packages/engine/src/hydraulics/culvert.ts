/**
 * Culvert Hydraulics — FHWA HDS-5
 *
 * Implements simplified culvert flow analysis for common culvert types.
 * Determines flow through circular and box culverts under inlet control
 * and outlet control conditions, taking the lower discharge as governing.
 */

export type CulvertShape = "circular" | "box";
export type CulvertMaterial = "concrete" | "corrugated-metal" | "plastic";
export type InletType = "projecting" | "headwall" | "mitered" | "flared";

export interface CulvertInput {
  /** Culvert shape */
  shape: CulvertShape;
  /** Span/diameter in feet */
  span: number;
  /** Rise in feet (same as span for circular) */
  rise: number;
  /** Length in feet */
  length: number;
  /** Slope in ft/ft */
  slope: number;
  /** Manning's n for the barrel */
  manningsN: number;
  /** Inlet type */
  inletType: InletType;
  /** Invert elevation at inlet (ft) */
  inletInvert: number;
  /** Invert elevation at outlet (ft) */
  outletInvert: number;
  /** Tailwater depth at outlet (ft), 0 if free outfall */
  tailwaterDepth: number;
}

export interface CulvertResult {
  /** Discharge for the given headwater depth (cfs) */
  discharge: number;
  /** Headwater depth (ft) */
  headwater: number;
  /** Governing control condition */
  control: "inlet" | "outlet";
  /** Headwater-to-diameter ratio (HW/D) */
  hwdRatio: number;
}

/** Inlet control coefficients for submerged flow: Q/AD^0.5 = c(HW/D)^Y */
const INLET_COEFFICIENTS: Record<string, { c: number; Y: number; Ks: number }> = {
  "circular-headwall":      { c: 0.0398, Y: 0.67, Ks: 0.0018 },
  "circular-projecting":    { c: 0.0540, Y: 0.50, Ks: 0.0045 },
  "circular-mitered":       { c: 0.0463, Y: 0.75, Ks: 0.0018 },
  "circular-flared":        { c: 0.0314, Y: 0.66, Ks: 0.0018 },
  "box-headwall":           { c: 0.0347, Y: 0.81, Ks: 0.0018 },
  "box-projecting":         { c: 0.0510, Y: 0.80, Ks: 0.0045 },
  "box-mitered":            { c: 0.0463, Y: 0.75, Ks: 0.0018 },
  "box-flared":             { c: 0.0314, Y: 0.80, Ks: 0.0018 },
};

/** Entrance loss coefficients (Ke) */
const ENTRANCE_LOSS: Record<string, number> = {
  "headwall":    0.5,
  "projecting":  0.9,
  "mitered":     0.7,
  "flared":      0.2,
};

/**
 * Calculate culvert barrel full-flow area.
 */
function barrelArea(shape: CulvertShape, span: number, rise: number): number {
  if (shape === "circular") {
    return (Math.PI * span * span) / 4;
  }
  return span * rise; // box
}

/**
 * Calculate wetted perimeter for full flow.
 */
function wettedPerimeter(shape: CulvertShape, span: number, rise: number): number {
  if (shape === "circular") {
    return Math.PI * span;
  }
  return 2 * (span + rise); // box
}

/**
 * Inlet control capacity — simplified FHWA nomograph approximation.
 * For unsubmerged flow (HW/D < 1.5):
 *   HW/D = Hc/D + K + Ks * S
 * For submerged flow (HW/D >= 1.5):
 *   HW/D = c * (Q / A*D^0.5)^2 + Y + Ks * S
 *
 * Simplified: given HW, find Q iteratively.
 */
function inletControlDischarge(
  culvert: CulvertInput,
  headwaterDepth: number,
): number {
  const D = culvert.rise;
  const hwdRatio = headwaterDepth / D;
  if (hwdRatio <= 0) return 0;

  const key = `${culvert.shape}-${culvert.inletType}`;
  const coeff = INLET_COEFFICIENTS[key];
  if (!coeff) {
    // Fall back to headwall coefficients
    const fallbackKey = `${culvert.shape}-headwall`;
    const fb = INLET_COEFFICIENTS[fallbackKey]!;
    return inletControlFromCoeffs(culvert, headwaterDepth, fb);
  }

  return inletControlFromCoeffs(culvert, headwaterDepth, coeff);
}

function inletControlFromCoeffs(
  culvert: CulvertInput,
  headwaterDepth: number,
  coeff: { c: number; Y: number; Ks: number },
): number {
  const D = culvert.rise;
  const A = barrelArea(culvert.shape, culvert.span, culvert.rise);
  const hwdRatio = headwaterDepth / D;

  // Simplified: Q = A * D^0.5 * sqrt((hwdRatio - coeff.Y - coeff.Ks * culvert.slope) / coeff.c)
  const adjusted = hwdRatio - coeff.Y - coeff.Ks * (culvert.slope * 100);
  if (adjusted <= 0) return 0;

  const QoverADhalf = Math.sqrt(adjusted / coeff.c);
  return QoverADhalf * A * Math.sqrt(D);
}

/**
 * Outlet control capacity using energy equation.
 * HW = H + ho - L*S
 * H = entrance loss + friction loss + exit loss
 * H = (Ke + 1 + (19.63 * n^2 * L) / R^(4/3)) * V^2 / (2g)
 */
function outletControlDischarge(
  culvert: CulvertInput,
  headwaterDepth: number,
): number {
  const A = barrelArea(culvert.shape, culvert.span, culvert.rise);
  const WP = wettedPerimeter(culvert.shape, culvert.span, culvert.rise);
  const R = A / WP; // hydraulic radius
  const Ke = ENTRANCE_LOSS[culvert.inletType] ?? 0.5;
  const g = 32.174;
  const n = culvert.manningsN;
  const L = culvert.length;
  const S = culvert.slope;
  const D = culvert.rise;

  // Tailwater or D/2, whichever is higher
  const ho = Math.max(culvert.tailwaterDepth, D / 2);

  // Available head: HW = H + ho - L*S
  // => H = HW_elevation - ho + L*S
  // HW_elevation = headwaterDepth (above inlet invert)
  const H = headwaterDepth - ho + L * S;
  if (H <= 0) return 0;

  // H = K * V^2/(2g) where K = Ke + 1 + friction_factor
  const frictionFactor = (19.63 * n * n * L) / Math.pow(R, 4 / 3);
  const K = Ke + 1.0 + frictionFactor;

  // V = sqrt(2gH / K)
  const V = Math.sqrt((2 * g * H) / K);
  return A * V;
}

/**
 * Calculate culvert discharge for a given headwater depth.
 * Returns the LOWER of inlet control and outlet control (governing condition).
 */
export function culvertDischarge(
  culvert: CulvertInput,
  headwaterDepth: number,
): CulvertResult {
  if (headwaterDepth <= 0) {
    return { discharge: 0, headwater: headwaterDepth, control: "inlet", hwdRatio: 0 };
  }

  const Qi = inletControlDischarge(culvert, headwaterDepth);
  const Qo = outletControlDischarge(culvert, headwaterDepth);

  // Governing: the LOWER capacity controls
  const governing = Qi <= Qo ? "inlet" : "outlet";
  const discharge = Math.min(Qi, Qo);

  return {
    discharge: Math.max(0, discharge),
    headwater: headwaterDepth,
    control: governing,
    hwdRatio: headwaterDepth / culvert.rise,
  };
}

/**
 * Generate a headwater-discharge rating curve for a culvert.
 * @param culvert Culvert properties
 * @param maxHW Maximum headwater depth to evaluate (ft)
 * @param nPoints Number of points in the curve
 */
export function culvertRatingCurve(
  culvert: CulvertInput,
  maxHW: number,
  nPoints: number = 20,
): CulvertResult[] {
  const results: CulvertResult[] = [];
  for (let i = 0; i <= nPoints; i++) {
    const hw = (maxHW * i) / nPoints;
    results.push(culvertDischarge(culvert, hw));
  }
  return results;
}

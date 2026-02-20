/**
 * Rational Method — Q = CiA
 *
 * The simplest peak discharge formula, used for pipe sizing on small
 * drainage areas (typically < 200 acres). Required by many jurisdictions.
 *
 * Q = C * i * A
 *   Q = peak discharge (cfs)
 *   C = runoff coefficient (dimensionless, 0–1)
 *   i = rainfall intensity (in/hr) for a duration equal to Tc
 *   A = drainage area (acres)
 *
 * Note: The factor 1.008 (exact conversion) is typically approximated as 1.0.
 */

/** Common runoff coefficients by land use (from typical municipal references) */
export const RUNOFF_COEFFICIENTS: Record<string, { range: [number, number]; typical: number }> = {
  "Business, downtown":           { range: [0.70, 0.95], typical: 0.85 },
  "Business, neighborhood":       { range: [0.50, 0.70], typical: 0.60 },
  "Residential, single family":   { range: [0.30, 0.50], typical: 0.40 },
  "Residential, multi-unit":      { range: [0.40, 0.60], typical: 0.50 },
  "Residential, apartments":      { range: [0.50, 0.70], typical: 0.60 },
  "Industrial, light":            { range: [0.50, 0.80], typical: 0.65 },
  "Industrial, heavy":            { range: [0.60, 0.90], typical: 0.75 },
  "Parks, cemeteries":            { range: [0.10, 0.25], typical: 0.18 },
  "Playgrounds":                  { range: [0.20, 0.35], typical: 0.28 },
  "Railroad yard":                { range: [0.20, 0.40], typical: 0.30 },
  "Unimproved":                   { range: [0.10, 0.30], typical: 0.20 },
  "Pavement, asphalt/concrete":   { range: [0.70, 0.95], typical: 0.85 },
  "Pavement, brick":              { range: [0.70, 0.85], typical: 0.78 },
  "Roofs":                        { range: [0.75, 0.95], typical: 0.85 },
  "Lawns, sandy soil, flat":      { range: [0.05, 0.10], typical: 0.08 },
  "Lawns, sandy soil, steep":     { range: [0.15, 0.20], typical: 0.18 },
  "Lawns, clay soil, flat":       { range: [0.13, 0.17], typical: 0.15 },
  "Lawns, clay soil, steep":      { range: [0.25, 0.35], typical: 0.30 },
};

/**
 * IDF curve point: rainfall intensity for a given duration and return period.
 */
export interface IDFPoint {
  /** Duration in minutes */
  duration: number;
  /** Rainfall intensity in inches/hour */
  intensity: number;
}

/**
 * IDF curve for a specific return period.
 */
export interface IDFCurve {
  /** Return period label (e.g., "10-year") */
  label: string;
  /** Return period in years */
  returnPeriod: number;
  /** Intensity-duration data points */
  points: IDFPoint[];
}

/**
 * Interpolate rainfall intensity from an IDF curve for a given duration.
 * Uses log-log interpolation (standard for IDF curves).
 * @param curve IDF curve data points
 * @param duration Storm duration in minutes
 * @returns Rainfall intensity in inches/hour
 */
export function interpolateIDF(curve: IDFPoint[], duration: number): number {
  if (curve.length === 0) throw new Error("IDF curve has no data points");
  if (duration <= 0) throw new Error("Duration must be positive");

  // Clamp to curve range
  if (duration <= curve[0].duration) return curve[0].intensity;
  if (duration >= curve[curve.length - 1].duration)
    return curve[curve.length - 1].intensity;

  // Log-log interpolation
  for (let i = 1; i < curve.length; i++) {
    if (duration <= curve[i].duration) {
      const logD = Math.log(duration);
      const logD0 = Math.log(curve[i - 1].duration);
      const logD1 = Math.log(curve[i].duration);
      const logI0 = Math.log(curve[i - 1].intensity);
      const logI1 = Math.log(curve[i].intensity);
      const frac = (logD - logD0) / (logD1 - logD0);
      return Math.exp(logI0 + frac * (logI1 - logI0));
    }
  }

  return curve[curve.length - 1].intensity;
}

/**
 * Calculate composite (area-weighted) runoff coefficient.
 */
export function compositeC(
  areas: { c: number; area: number }[],
): number {
  if (areas.length === 0) throw new Error("At least one area required");
  const totalArea = areas.reduce((s, a) => s + a.area, 0);
  if (totalArea <= 0) throw new Error("Total area must be positive");
  return areas.reduce((s, a) => s + a.c * a.area, 0) / totalArea;
}

export interface RationalMethodInput {
  /** Runoff coefficient C (0–1), or array of sub-areas for composite C */
  c: number | { c: number; area: number }[];
  /** Rainfall intensity in in/hr, OR IDF curve + Tc for auto-lookup */
  intensity:
    | number
    | { idfCurve: IDFPoint[]; tcMinutes: number };
  /** Total drainage area in acres */
  area: number;
  /** Frequency factor for return periods > 10 years (optional, default 1.0) */
  frequencyFactor?: number;
}

export interface RationalMethodResult {
  /** Peak discharge in cfs */
  peakFlow: number;
  /** Runoff coefficient used */
  c: number;
  /** Rainfall intensity used (in/hr) */
  intensity: number;
  /** Drainage area (acres) */
  area: number;
}

/**
 * Calculate peak discharge using the Rational Method.
 * Q = C * i * A (optionally * frequency factor)
 */
export function rationalMethod(input: RationalMethodInput): RationalMethodResult {
  // Resolve C
  const c = typeof input.c === "number"
    ? input.c
    : compositeC(input.c);

  if (c < 0 || c > 1) throw new Error("Runoff coefficient C must be between 0 and 1");
  if (input.area <= 0) throw new Error("Area must be positive");

  // Resolve intensity
  let intensity: number;
  if (typeof input.intensity === "number") {
    intensity = input.intensity;
  } else {
    intensity = interpolateIDF(
      input.intensity.idfCurve,
      input.intensity.tcMinutes,
    );
  }

  if (intensity <= 0) throw new Error("Rainfall intensity must be positive");

  const ff = input.frequencyFactor ?? 1.0;
  const peakFlow = c * intensity * input.area * ff;

  return { peakFlow, c, intensity, area: input.area };
}

/**
 * Generate a Modified Rational Method trapezoidal hydrograph.
 * Creates a simplified hydrograph with linear rise, constant peak, and linear fall.
 *
 * @param peakFlow Peak flow from Q=CiA (cfs)
 * @param tcHours Time of concentration (hours)
 * @param stormDurationHours Total storm duration (hours)
 * @param timeStep Time step for output (hours)
 */
export function modifiedRationalHydrograph(
  peakFlow: number,
  tcHours: number,
  stormDurationHours: number,
  timeStep: number = 0.1,
): { time: number; flow: number }[] {
  const result: { time: number; flow: number }[] = [];
  const totalDuration = stormDurationHours + tcHours;

  for (let t = 0; t <= totalDuration + timeStep / 2; t += timeStep) {
    let flow: number;
    if (t <= tcHours) {
      // Rising limb
      flow = peakFlow * (t / tcHours);
    } else if (t <= stormDurationHours) {
      // Constant peak
      flow = peakFlow;
    } else {
      // Falling limb
      flow = peakFlow * (1 - (t - stormDurationHours) / tcHours);
    }
    result.push({ time: t, flow: Math.max(0, flow) });
  }

  return result;
}

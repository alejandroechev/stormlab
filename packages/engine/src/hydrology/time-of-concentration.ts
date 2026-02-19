/**
 * Time of Concentration (Tc) — TR-55 Chapter 3
 *
 * Tc is the time for runoff to travel from the hydraulically most distant
 * point of the watershed to the outlet. It is the sum of travel times for
 * consecutive flow segments: sheet flow, shallow concentrated flow, and
 * open channel flow.
 */

/** Sheet flow travel time using Manning's kinematic solution (TR-55 Eq. 3-3) */
export interface SheetFlowSegment {
  type: "sheet";
  /** Manning's roughness coefficient for sheet flow */
  manningsN: number;
  /** Flow length in feet (max 300 ft per TR-55) */
  length: number;
  /** 2-year, 24-hour rainfall depth in inches */
  rainfall2yr: number;
  /** Land slope in ft/ft */
  slope: number;
}

/** Shallow concentrated flow (TR-55 Figure 3-1) */
export interface ShallowConcentratedFlowSegment {
  type: "shallow";
  /** Flow length in feet */
  length: number;
  /** Watercourse slope in ft/ft */
  slope: number;
  /** Surface type: paved or unpaved */
  surface: "paved" | "unpaved";
}

/** Channel flow using Manning's equation */
export interface ChannelFlowSegment {
  type: "channel";
  /** Flow length in feet */
  length: number;
  /** Wetted perimeter in feet */
  wettedPerimeter: number;
  /** Cross-sectional flow area in sq ft */
  area: number;
  /** Manning's roughness coefficient */
  manningsN: number;
  /** Channel slope in ft/ft */
  slope: number;
}

export type FlowSegment =
  | SheetFlowSegment
  | ShallowConcentratedFlowSegment
  | ChannelFlowSegment;

/**
 * Calculate sheet flow travel time (hours).
 * TR-55 Eq. 3-3: Tt = 0.007 * (nL)^0.8 / (P2^0.5 * s^0.4)
 */
export function sheetFlowTravelTime(seg: SheetFlowSegment): number {
  if (seg.length > 300) {
    throw new Error("Sheet flow length cannot exceed 300 ft per TR-55");
  }
  if (seg.slope <= 0) throw new Error("Slope must be positive");
  if (seg.rainfall2yr <= 0) throw new Error("Rainfall must be positive");

  const nL = seg.manningsN * seg.length;
  const numerator = 0.007 * Math.pow(nL, 0.8);
  const denominator =
    Math.pow(seg.rainfall2yr, 0.5) * Math.pow(seg.slope, 0.4);
  return numerator / denominator;
}

/**
 * Calculate shallow concentrated flow velocity (ft/s) and travel time (hours).
 * TR-55 Figure 3-1 approximation:
 *   Unpaved: V = 16.1345 * s^0.5
 *   Paved:   V = 20.3282 * s^0.5
 */
export function shallowConcentratedFlowTravelTime(
  seg: ShallowConcentratedFlowSegment,
): number {
  if (seg.slope <= 0) throw new Error("Slope must be positive");

  const k = seg.surface === "paved" ? 20.3282 : 16.1345;
  const velocity = k * Math.pow(seg.slope, 0.5); // ft/s
  const travelTimeSec = seg.length / velocity;
  return travelTimeSec / 3600; // convert to hours
}

/**
 * Calculate channel flow travel time (hours) using Manning's equation.
 * V = (1.49 / n) * R^(2/3) * s^(1/2)
 * where R = A / P (hydraulic radius)
 */
export function channelFlowTravelTime(seg: ChannelFlowSegment): number {
  if (seg.slope <= 0) throw new Error("Slope must be positive");
  if (seg.area <= 0) throw new Error("Flow area must be positive");
  if (seg.wettedPerimeter <= 0)
    throw new Error("Wetted perimeter must be positive");

  const R = seg.area / seg.wettedPerimeter;
  const velocity =
    (1.49 / seg.manningsN) * Math.pow(R, 2 / 3) * Math.pow(seg.slope, 0.5);
  const travelTimeSec = seg.length / velocity;
  return travelTimeSec / 3600;
}

/**
 * Calculate travel time for any flow segment.
 */
export function segmentTravelTime(seg: FlowSegment): number {
  switch (seg.type) {
    case "sheet":
      return sheetFlowTravelTime(seg);
    case "shallow":
      return shallowConcentratedFlowTravelTime(seg);
    case "channel":
      return channelFlowTravelTime(seg);
  }
}

/**
 * Calculate total Time of Concentration as the sum of all segment travel times.
 * @returns Tc in hours
 */
export function calculateTc(segments: FlowSegment[]): number {
  if (segments.length === 0) throw new Error("At least one segment required");
  return segments.reduce((sum, seg) => sum + segmentTravelTime(seg), 0);
}

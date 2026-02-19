/**
 * Reach Routing — Manning's equation for standard channel shapes
 */

import { type HydrographPoint } from "../hydrology/unit-hydrograph.js";

export interface ReachRoutingInput {
  /** Channel length in feet */
  length: number;
  /** Manning's roughness coefficient */
  manningsN: number;
  /** Channel slope in ft/ft */
  slope: number;
  /** Channel cross-section shape */
  shape:
    | { type: "rectangular"; width: number }
    | { type: "trapezoidal"; bottomWidth: number; sideSlope: number }
    | { type: "circular"; diameter: number };
  /** Inflow hydrograph */
  inflow: HydrographPoint[];
}

/**
 * Calculate flow area and wetted perimeter for a given depth and shape.
 */
function channelGeometry(
  shape: ReachRoutingInput["shape"],
  depth: number,
): { area: number; wettedPerimeter: number } {
  switch (shape.type) {
    case "rectangular": {
      const area = shape.width * depth;
      const wp = shape.width + 2 * depth;
      return { area, wettedPerimeter: wp };
    }
    case "trapezoidal": {
      const topWidth = shape.bottomWidth + 2 * shape.sideSlope * depth;
      const area = ((shape.bottomWidth + topWidth) / 2) * depth;
      const sideLength = Math.sqrt(
        depth * depth + (shape.sideSlope * depth) ** 2,
      );
      const wp = shape.bottomWidth + 2 * sideLength;
      return { area, wettedPerimeter: wp };
    }
    case "circular": {
      const r = shape.diameter / 2;
      if (depth >= shape.diameter) {
        return {
          area: Math.PI * r * r,
          wettedPerimeter: Math.PI * shape.diameter,
        };
      }
      const theta = 2 * Math.acos((r - depth) / r);
      const area = (r * r * (theta - Math.sin(theta))) / 2;
      const wp = r * theta;
      return { area, wettedPerimeter: wp };
    }
  }
}

/**
 * Calculate Manning's flow for a given depth.
 * Q = (1.49/n) * A * R^(2/3) * S^(1/2)
 */
function manningsFlow(
  shape: ReachRoutingInput["shape"],
  depth: number,
  n: number,
  slope: number,
): number {
  if (depth <= 0) return 0;
  const { area, wettedPerimeter } = channelGeometry(shape, depth);
  if (area <= 0 || wettedPerimeter <= 0) return 0;
  const R = area / wettedPerimeter;
  return (1.49 / n) * area * Math.pow(R, 2 / 3) * Math.pow(slope, 0.5);
}

/**
 * Find normal depth for a given flow using bisection.
 */
function normalDepth(
  flow: number,
  shape: ReachRoutingInput["shape"],
  n: number,
  slope: number,
  maxDepth: number = 50,
): number {
  if (flow <= 0) return 0;

  let lo = 0;
  let hi = maxDepth;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const Q = manningsFlow(shape, mid, n, slope);
    if (Math.abs(Q - flow) < 0.001) return mid;
    if (Q < flow) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

/**
 * Route an inflow hydrograph through a reach using simple translation + attenuation.
 *
 * Uses the kinematic wave approximation: the hydrograph is translated by the
 * travel time through the reach, with minor attenuation from storage effects.
 */
export function routeReach(input: ReachRoutingInput): {
  outflow: HydrographPoint[];
  peakOutflow: number;
  timeToPeakOutflow: number;
  travelTime: number;
} {
  const { length, manningsN, slope, shape, inflow } = input;

  if (inflow.length < 2) throw new Error("Inflow must have at least 2 points");

  // Estimate travel time using peak flow velocity
  const peakFlow = Math.max(...inflow.map((p) => p.flow));
  const avgFlow = peakFlow * 0.7; // Use ~70% of peak for average velocity
  const depth = normalDepth(avgFlow, shape, manningsN, slope);
  const { area, wettedPerimeter } = channelGeometry(shape, depth);

  let travelTime: number;
  if (area > 0) {
    const velocity = avgFlow / area;
    travelTime = length / velocity / 3600; // hours
  } else {
    travelTime = 0;
  }

  // Translate hydrograph by travel time
  const outflow: HydrographPoint[] = inflow.map((p) => ({
    time: p.time,
    flow: 0,
  }));

  const dt = inflow[1].time - inflow[0].time;
  const lagSteps = Math.round(travelTime / dt);

  let peakOutflow = 0;
  let timeToPeakOutflow = 0;

  for (let i = 0; i < inflow.length; i++) {
    const outIdx = i + lagSteps;
    if (outIdx < outflow.length) {
      outflow[outIdx].flow = inflow[i].flow;
      if (outflow[outIdx].flow > peakOutflow) {
        peakOutflow = outflow[outIdx].flow;
        timeToPeakOutflow = outflow[outIdx].time;
      }
    }
  }

  return { outflow, peakOutflow, timeToPeakOutflow, travelTime };
}

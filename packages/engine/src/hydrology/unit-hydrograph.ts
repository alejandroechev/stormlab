/**
 * SCS Dimensionless Unit Hydrograph — TR-55 Chapter 4
 *
 * Generates a runoff hydrograph using the SCS dimensionless unit hydrograph
 * (peak factor = 484) and the SCS rainfall-runoff procedure.
 */

import { getCumulativeRainfall, type StormType } from "./rainfall.js";
import { calculateRunoff } from "./runoff.js";

/** SCS dimensionless unit hydrograph ordinates (t/Tp vs q/qp) */
const SCS_UH_ORDINATES: [number, number][] = [
  [0.0, 0.0],
  [0.1, 0.03],
  [0.2, 0.1],
  [0.3, 0.19],
  [0.4, 0.31],
  [0.5, 0.47],
  [0.6, 0.66],
  [0.7, 0.82],
  [0.8, 0.93],
  [0.9, 0.99],
  [1.0, 1.0],
  [1.1, 0.99],
  [1.2, 0.93],
  [1.3, 0.86],
  [1.4, 0.78],
  [1.5, 0.68],
  [1.6, 0.56],
  [1.7, 0.46],
  [1.8, 0.39],
  [1.9, 0.33],
  [2.0, 0.28],
  [2.2, 0.207],
  [2.4, 0.147],
  [2.6, 0.107],
  [2.8, 0.077],
  [3.0, 0.055],
  [3.2, 0.04],
  [3.4, 0.029],
  [3.6, 0.021],
  [3.8, 0.015],
  [4.0, 0.011],
  [4.5, 0.005],
  [5.0, 0.0],
];

/**
 * Interpolate the dimensionless unit hydrograph at a given t/Tp ratio.
 */
function interpolateUH(tRatio: number): number {
  if (tRatio <= 0) return 0;
  if (tRatio >= 5.0) return 0;

  for (let i = 1; i < SCS_UH_ORDINATES.length; i++) {
    if (tRatio <= SCS_UH_ORDINATES[i][0]) {
      const [t0, q0] = SCS_UH_ORDINATES[i - 1];
      const [t1, q1] = SCS_UH_ORDINATES[i];
      const frac = (tRatio - t0) / (t1 - t0);
      return q0 + frac * (q1 - q0);
    }
  }
  return 0;
}

export interface HydrographPoint {
  /** Time in hours from start of storm */
  time: number;
  /** Flow rate in cfs */
  flow: number;
}

export interface HydrographResult {
  /** Time series of flow values */
  hydrograph: HydrographPoint[];
  /** Peak flow in cfs */
  peakFlow: number;
  /** Time to peak in hours */
  timeToPeak: number;
  /** Total runoff volume in acre-feet */
  totalVolume: number;
}

/**
 * Calculate the SCS unit hydrograph peak flow.
 * qp = (484 * A * Q) / Tp  (cfs, with A in sq mi, Q in inches, Tp in hours)
 *
 * @param area Drainage area in acres
 * @param runoffDepth Runoff depth in inches
 * @param Tp Time to peak in hours
 * @param peakFactor Peak rate factor (default 484)
 */
export function unitHydrographPeakFlow(
  area: number,
  runoffDepth: number,
  Tp: number,
  peakFactor: number = 484,
): number {
  const areaSqMi = area / 640; // convert acres to square miles
  return (peakFactor * areaSqMi * runoffDepth) / Tp;
}

/**
 * Generate a runoff hydrograph for a subcatchment using the SCS method.
 *
 * This uses discrete convolution of excess rainfall increments with the
 * SCS unit hydrograph.
 *
 * @param area Drainage area in acres
 * @param cn Curve Number
 * @param tc Time of concentration in hours
 * @param stormType SCS storm type
 * @param totalRainfall Total 24-hour rainfall depth in inches
 * @param timeStep Computation time step in hours (default: auto)
 * @param iaRatio Initial abstraction ratio (default: 0.2)
 */
export function generateHydrograph(
  area: number,
  cn: number,
  tc: number,
  stormType: StormType,
  totalRainfall: number,
  timeStep?: number,
  iaRatio: number = 0.2,
): HydrographResult {
  // Auto time step: use Tc/5 or 0.1 hr, whichever is smaller, but at least 0.01 hr
  const dt = timeStep ?? Math.max(0.01, Math.min(tc / 5, 0.1));

  // Lag time = 0.6 * Tc
  const lag = 0.6 * tc;
  // Time to peak: Tp = dt/2 + lag
  const Tp = dt / 2 + lag;

  // Generate incremental excess rainfall (runoff) for each time step
  const S = 1000 / cn - 10;
  const Ia = iaRatio * S;

  const nSteps = Math.ceil(24 / dt);
  const excessRainfall: number[] = [];
  let prevCumRain = 0;
  let prevCumExcess = 0;

  for (let i = 1; i <= nSteps; i++) {
    const t = Math.min(i * dt, 24);
    const cumRain = getCumulativeRainfall(stormType, totalRainfall, t);
    const cumExcess = calculateRunoff(cumRain, cn, iaRatio).runoffDepth;
    excessRainfall.push(cumExcess - prevCumExcess);
    prevCumRain = cumRain;
    prevCumExcess = cumExcess;
  }

  // Generate unit hydrograph ordinates
  const uhDuration = 5 * Tp;
  const nUhSteps = Math.ceil(uhDuration / dt);
  const unitHydrograph: number[] = [];
  const areaSqMi = area / 640;

  // qp for 1 inch of excess rainfall
  const qpUnit = (484 * areaSqMi) / Tp;

  for (let i = 0; i <= nUhSteps; i++) {
    const t = i * dt;
    const tRatio = t / Tp;
    unitHydrograph.push(qpUnit * interpolateUH(tRatio));
  }

  // Discrete convolution: Q(t) = Σ P_excess(j) * UH(t - j*dt)
  const totalSteps = nSteps + nUhSteps;
  const flowValues: number[] = new Array(totalSteps + 1).fill(0);

  for (let j = 0; j < excessRainfall.length; j++) {
    if (excessRainfall[j] <= 0) continue;
    for (let k = 0; k < unitHydrograph.length; k++) {
      flowValues[j + k] += excessRainfall[j] * unitHydrograph[k];
    }
  }

  // Build hydrograph output
  const hydrograph: HydrographPoint[] = [];
  let peakFlow = 0;
  let timeToPeak = 0;

  for (let i = 0; i < flowValues.length; i++) {
    const time = i * dt;
    const flow = Math.max(0, flowValues[i]);
    hydrograph.push({ time, flow });
    if (flow > peakFlow) {
      peakFlow = flow;
      timeToPeak = time;
    }
  }

  // Total volume: integrate flow over time (trapezoidal rule), convert cfs*hr to acre-ft
  // 1 cfs-hour = 1 acre-foot / 12.1 (approximately)
  // More precisely: 1 cfs * 1 hr = 3600 ft³ = 3600/43560 acre-ft = 0.08264 acre-ft
  let totalVolume = 0;
  for (let i = 1; i < hydrograph.length; i++) {
    const dtHr = hydrograph[i].time - hydrograph[i - 1].time;
    const avgFlow = (hydrograph[i].flow + hydrograph[i - 1].flow) / 2;
    totalVolume += avgFlow * dtHr * (3600 / 43560);
  }

  return { hydrograph, peakFlow, timeToPeak, totalVolume };
}

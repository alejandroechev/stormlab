/**
 * Modified Puls (Storage-Indication) Pond Routing
 *
 * Routes an inflow hydrograph through a pond using the storage-indication method.
 * This is the standard method used by TR-20 and similar stormwater modeling tools.
 */

import {
  type StageStoragePoint,
  interpolateStorage,
  interpolateStage,
} from "./stage-storage.js";
import {
  type OutletStructure,
  compositeOutletDischarge,
} from "./outlet-structures.js";

export interface PondRoutingInput {
  /** Inflow hydrograph: array of [time_hours, flow_cfs] */
  inflow: [number, number][];
  /** Stage-storage curve */
  stageStorage: StageStoragePoint[];
  /** Outlet structures */
  outlets: OutletStructure[];
  /** Initial water surface elevation (feet) */
  initialWSE: number;
}

export interface PondRoutingResult {
  /** Outflow hydrograph: array of { time, inflow, outflow, stage, storage } */
  timeSeries: {
    time: number;
    inflow: number;
    outflow: number;
    stage: number;
    storage: number;
  }[];
  /** Peak inflow (cfs) */
  peakInflow: number;
  /** Peak outflow (cfs) */
  peakOutflow: number;
  /** Peak stage (ft) */
  peakStage: number;
  /** Peak storage (cu ft) */
  peakStorage: number;
  /** Time of peak outflow (hours) */
  timeToPeakOutflow: number;
}

/**
 * Build the 2S/dt + O vs O relationship for the storage-indication method.
 * We precompute this as a lookup table for fast routing.
 */
function buildStorageIndicationCurve(
  stageStorage: StageStoragePoint[],
  outlets: OutletStructure[],
  dt: number,
  nPoints: number = 200,
): { indicator: number; outflow: number; stage: number; storage: number }[] {
  const minStage = stageStorage[0].stage;
  const maxStage = stageStorage[stageStorage.length - 1].stage;
  const curve: {
    indicator: number;
    outflow: number;
    stage: number;
    storage: number;
  }[] = [];

  for (let i = 0; i <= nPoints; i++) {
    const stage = minStage + ((maxStage - minStage) * i) / nPoints;
    const storage = interpolateStorage(stageStorage, stage);
    const outflow = compositeOutletDischarge(outlets, stage);
    const indicator = (2 * storage) / (dt * 3600) + outflow;
    curve.push({ indicator, outflow, stage, storage });
  }

  return curve;
}

/**
 * Interpolate outflow from the storage-indication curve given an indicator value.
 */
function interpolateFromSICurve(
  curve: { indicator: number; outflow: number; stage: number; storage: number }[],
  indicatorValue: number,
): { outflow: number; stage: number; storage: number } {
  if (indicatorValue <= curve[0].indicator) {
    return {
      outflow: curve[0].outflow,
      stage: curve[0].stage,
      storage: curve[0].storage,
    };
  }
  if (indicatorValue >= curve[curve.length - 1].indicator) {
    return {
      outflow: curve[curve.length - 1].outflow,
      stage: curve[curve.length - 1].stage,
      storage: curve[curve.length - 1].storage,
    };
  }

  for (let i = 1; i < curve.length; i++) {
    if (indicatorValue <= curve[i].indicator) {
      const frac =
        (indicatorValue - curve[i - 1].indicator) /
        (curve[i].indicator - curve[i - 1].indicator);
      return {
        outflow:
          curve[i - 1].outflow + frac * (curve[i].outflow - curve[i - 1].outflow),
        stage:
          curve[i - 1].stage + frac * (curve[i].stage - curve[i - 1].stage),
        storage:
          curve[i - 1].storage + frac * (curve[i].storage - curve[i - 1].storage),
      };
    }
  }
  const last = curve[curve.length - 1];
  return { outflow: last.outflow, stage: last.stage, storage: last.storage };
}

/**
 * Route an inflow hydrograph through a pond using the Modified Puls method.
 */
export function routePond(input: PondRoutingInput): PondRoutingResult {
  const { inflow, stageStorage, outlets, initialWSE } = input;

  if (inflow.length < 2) throw new Error("Inflow must have at least 2 points");

  // Determine time step from inflow hydrograph
  const dt = inflow[1][0] - inflow[0][0]; // hours

  // Build storage-indication curve
  const siCurve = buildStorageIndicationCurve(stageStorage, outlets, dt);

  // Initial conditions
  let storage = interpolateStorage(stageStorage, initialWSE);
  let outflow = compositeOutletDischarge(outlets, initialWSE);

  const timeSeries: PondRoutingResult["timeSeries"] = [];
  let peakInflow = 0;
  let peakOutflow = 0;
  let peakStage = initialWSE;
  let peakStorage = storage;
  let timeToPeakOutflow = 0;

  // Add initial point
  timeSeries.push({
    time: inflow[0][0],
    inflow: inflow[0][1],
    outflow,
    stage: initialWSE,
    storage,
  });

  peakInflow = inflow[0][1];

  // Route each time step
  for (let i = 1; i < inflow.length; i++) {
    const I1 = inflow[i - 1][1];
    const I2 = inflow[i][1];

    // Storage-indication equation:
    // (2S2/dt + O2) = (I1 + I2) + (2S1/dt - O1)
    const leftSide = I1 + I2 + ((2 * storage) / (dt * 3600) - outflow);

    // Look up O2 from the storage-indication curve
    const result = interpolateFromSICurve(siCurve, leftSide);
    outflow = result.outflow;
    storage = result.storage;
    const stage = result.stage;

    timeSeries.push({
      time: inflow[i][0],
      inflow: I2,
      outflow,
      stage,
      storage,
    });

    if (I2 > peakInflow) peakInflow = I2;
    if (outflow > peakOutflow) {
      peakOutflow = outflow;
      timeToPeakOutflow = inflow[i][0];
    }
    if (stage > peakStage) peakStage = stage;
    if (storage > peakStorage) peakStorage = storage;
  }

  return {
    timeSeries,
    peakInflow,
    peakOutflow,
    peakStage,
    peakStorage,
    timeToPeakOutflow,
  };
}

/**
 * Subcatchment Model — integrates all hydrology components into a single computation unit.
 *
 * A subcatchment combines: land use → CN → rainfall → runoff → Tc → unit hydrograph
 * to produce an outflow hydrograph.
 */

import { compositeCN, type SubArea } from "./curve-number.js";
import { type StormType } from "./rainfall.js";
import { type FlowSegment, calculateTc } from "./time-of-concentration.js";
import {
  generateHydrograph,
  type HydrographResult,
} from "./unit-hydrograph.js";

export interface SubcatchmentInput {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Sub-areas with CN and area data */
  subAreas: SubArea[];
  /** Flow segments for Tc calculation */
  flowSegments: FlowSegment[];
  /** Override Tc in hours (if provided, flowSegments are ignored) */
  tcOverride?: number;
  /** Override composite CN (if provided, subAreas CN weighting is skipped) */
  cnOverride?: number;
}

export interface RainfallEvent {
  /** Event label (e.g., "100-year") */
  label: string;
  /** SCS storm type */
  stormType: StormType;
  /** Total 24-hour rainfall depth in inches */
  totalDepth: number;
}

export interface SubcatchmentResult {
  id: string;
  name: string;
  /** Composite Curve Number used */
  compositeCN: number;
  /** Total drainage area in acres */
  totalArea: number;
  /** Time of concentration in hours */
  tc: number;
  /** Hydrograph result */
  hydrograph: HydrographResult;
}

/**
 * Run the full subcatchment computation for a given rainfall event.
 */
export function computeSubcatchment(
  input: SubcatchmentInput,
  event: RainfallEvent,
  iaRatio: number = 0.2,
): SubcatchmentResult {
  const cn = input.cnOverride ?? compositeCN(input.subAreas);
  const totalArea = input.subAreas.reduce((sum, s) => sum + s.area, 0);
  const tc = input.tcOverride ?? calculateTc(input.flowSegments);

  const hydrograph = generateHydrograph(
    totalArea,
    cn,
    tc,
    event.stormType,
    event.totalDepth,
    undefined,
    iaRatio,
  );

  return {
    id: input.id,
    name: input.name,
    compositeCN: cn,
    totalArea,
    tc,
    hydrograph,
  };
}

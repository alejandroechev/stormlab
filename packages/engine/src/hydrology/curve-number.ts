/**
 * SCS/NRCS Curve Number lookup and composite CN calculation.
 */

/** Hydrologic soil groups */
export type SoilGroup = "A" | "B" | "C" | "D";

/** A single land-use sub-area with its CN and area */
export interface SubArea {
  description: string;
  soilGroup: SoilGroup;
  cn: number;
  area: number; // acres
}

/**
 * Calculate the composite (area-weighted) Curve Number for multiple sub-areas.
 */
export function compositeCN(subAreas: SubArea[]): number {
  if (subAreas.length === 0) throw new Error("At least one sub-area required");
  const totalArea = subAreas.reduce((sum, s) => sum + s.area, 0);
  if (totalArea <= 0) throw new Error("Total area must be positive");
  const weightedCN = subAreas.reduce((sum, s) => sum + s.cn * s.area, 0);
  return Math.round(weightedCN / totalArea);
}

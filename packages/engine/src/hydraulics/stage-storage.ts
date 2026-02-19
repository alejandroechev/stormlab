/**
 * Stage-Storage Calculations
 *
 * Calculate storage volume as a function of water surface elevation (stage)
 * for common pond shapes.
 */

export interface StageStoragePoint {
  /** Elevation/stage in feet */
  stage: number;
  /** Cumulative storage volume in cubic feet */
  storage: number;
}

/**
 * Generate stage-storage curve for a rectangular prismatic pond.
 * @param length Bottom length in feet
 * @param width Bottom width in feet
 * @param maxDepth Maximum depth in feet
 * @param sideSlope Horizontal:Vertical side slope ratio (0 for vertical walls)
 * @param baseElevation Bottom elevation in feet
 * @param nPoints Number of points to generate
 */
export function prismaticStageStorage(
  length: number,
  width: number,
  maxDepth: number,
  sideSlope: number = 0,
  baseElevation: number = 0,
  nPoints: number = 20,
): StageStoragePoint[] {
  const points: StageStoragePoint[] = [];

  for (let i = 0; i <= nPoints; i++) {
    const depth = (maxDepth * i) / nPoints;
    const stage = baseElevation + depth;

    // At depth d, the surface dimensions expand by sideSlope * d on each side
    const L = length + 2 * sideSlope * depth;
    const W = width + 2 * sideSlope * depth;

    // Volume by integration of trapezoid: use prismoidal formula
    // V = (d/3) * (A_bottom + A_top + sqrt(A_bottom * A_top))
    const Abottom = length * width;
    const Atop = L * W;
    const storage =
      (depth / 3) * (Abottom + Atop + Math.sqrt(Abottom * Atop));

    points.push({ stage, storage });
  }

  return points;
}

/**
 * Generate stage-storage curve for a conical pond.
 * @param topRadius Top radius in feet
 * @param maxDepth Maximum depth in feet
 * @param baseElevation Bottom elevation in feet
 * @param nPoints Number of points
 */
export function conicalStageStorage(
  topRadius: number,
  maxDepth: number,
  baseElevation: number = 0,
  nPoints: number = 20,
): StageStoragePoint[] {
  const points: StageStoragePoint[] = [];

  for (let i = 0; i <= nPoints; i++) {
    const depth = (maxDepth * i) / nPoints;
    const stage = baseElevation + depth;
    // Radius at given depth (linear interpolation from 0 at bottom to topRadius at top)
    const r = (topRadius * depth) / maxDepth;
    // Volume of cone frustum from 0 to depth
    const storage = (Math.PI * depth * r * r) / 3;
    points.push({ stage, storage });
  }

  return points;
}

/**
 * Generate stage-storage curve for a cylindrical tank.
 * @param radius Cylinder radius in feet
 * @param maxDepth Maximum depth in feet
 * @param baseElevation Bottom elevation in feet
 * @param nPoints Number of points
 */
export function cylindricalStageStorage(
  radius: number,
  maxDepth: number,
  baseElevation: number = 0,
  nPoints: number = 20,
): StageStoragePoint[] {
  const points: StageStoragePoint[] = [];
  const area = Math.PI * radius * radius;

  for (let i = 0; i <= nPoints; i++) {
    const depth = (maxDepth * i) / nPoints;
    const stage = baseElevation + depth;
    points.push({ stage, storage: area * depth });
  }

  return points;
}

/**
 * Interpolate storage volume at a given stage from a stage-storage curve.
 */
export function interpolateStorage(
  curve: StageStoragePoint[],
  stage: number,
): number {
  if (stage <= curve[0].stage) return curve[0].storage;
  if (stage >= curve[curve.length - 1].stage)
    return curve[curve.length - 1].storage;

  for (let i = 1; i < curve.length; i++) {
    if (stage <= curve[i].stage) {
      const frac =
        (stage - curve[i - 1].stage) / (curve[i].stage - curve[i - 1].stage);
      return (
        curve[i - 1].storage + frac * (curve[i].storage - curve[i - 1].storage)
      );
    }
  }
  return curve[curve.length - 1].storage;
}

/**
 * Interpolate stage at a given storage volume from a stage-storage curve.
 */
export function interpolateStage(
  curve: StageStoragePoint[],
  storage: number,
): number {
  if (storage <= curve[0].storage) return curve[0].stage;
  if (storage >= curve[curve.length - 1].storage)
    return curve[curve.length - 1].stage;

  for (let i = 1; i < curve.length; i++) {
    if (storage <= curve[i].storage) {
      const frac =
        (storage - curve[i - 1].storage) /
        (curve[i].storage - curve[i - 1].storage);
      return (
        curve[i - 1].stage + frac * (curve[i].stage - curve[i - 1].stage)
      );
    }
  }
  return curve[curve.length - 1].stage;
}

/**
 * Outlet Structure Hydraulics
 *
 * Standard equations for weirs, orifices, and culverts.
 */

/**
 * Broad-crested weir discharge.
 * Q = C * L * H^1.5
 * @param coefficient Weir coefficient C (typically 2.6–3.1 for broad-crested)
 * @param length Weir length in feet
 * @param head Head above weir crest in feet
 */
export function broadCrestedWeirDischarge(
  coefficient: number,
  length: number,
  head: number,
): number {
  if (head <= 0) return 0;
  return coefficient * length * Math.pow(head, 1.5);
}

/**
 * Sharp-crested weir discharge (contracted).
 * Q = C * L * H^1.5
 * @param coefficient Weir coefficient (typically 3.33 for sharp-crested rectangular)
 * @param length Weir length in feet
 * @param head Head above weir crest in feet
 */
export function sharpCrestedWeirDischarge(
  coefficient: number,
  length: number,
  head: number,
): number {
  if (head <= 0) return 0;
  return coefficient * length * Math.pow(head, 1.5);
}

/**
 * V-notch (triangular) weir discharge.
 * Q = C * tan(θ/2) * H^2.5
 * @param coefficient V-notch coefficient (typically 2.49)
 * @param angle Notch angle in degrees
 * @param head Head above notch vertex in feet
 */
export function vNotchWeirDischarge(
  coefficient: number,
  angle: number,
  head: number,
): number {
  if (head <= 0) return 0;
  const halfAngleRad = ((angle / 2) * Math.PI) / 180;
  return coefficient * Math.tan(halfAngleRad) * Math.pow(head, 2.5);
}

/**
 * Orifice discharge.
 * Q = C * A * sqrt(2 * g * H)
 * @param coefficient Orifice discharge coefficient (typically 0.6)
 * @param area Orifice cross-sectional area in sq ft
 * @param head Head above center of orifice in feet
 */
export function orificeDischarge(
  coefficient: number,
  area: number,
  head: number,
): number {
  if (head <= 0) return 0;
  const g = 32.174; // ft/s²
  return coefficient * area * Math.sqrt(2 * g * head);
}

/**
 * Circular orifice discharge given diameter.
 * @param coefficient Discharge coefficient (typically 0.6)
 * @param diameter Orifice diameter in feet
 * @param head Head above center of orifice in feet
 */
export function circularOrificeDischarge(
  coefficient: number,
  diameter: number,
  head: number,
): number {
  const area = (Math.PI * diameter * diameter) / 4;
  return orificeDischarge(coefficient, area, head);
}

/** Outlet structure definition */
export type OutletStructure =
  | {
      type: "weir";
      subtype: "broad-crested" | "sharp-crested";
      coefficient: number;
      length: number;
      crestElevation: number;
    }
  | {
      type: "vnotch-weir";
      coefficient: number;
      angle: number;
      crestElevation: number;
    }
  | {
      type: "orifice";
      coefficient: number;
      diameter: number;
      centerElevation: number;
    };

/**
 * Calculate discharge for an outlet structure at a given water surface elevation.
 */
export function outletDischarge(
  outlet: OutletStructure,
  waterSurfaceElevation: number,
): number {
  switch (outlet.type) {
    case "weir": {
      const head = waterSurfaceElevation - outlet.crestElevation;
      return outlet.subtype === "broad-crested"
        ? broadCrestedWeirDischarge(outlet.coefficient, outlet.length, head)
        : sharpCrestedWeirDischarge(outlet.coefficient, outlet.length, head);
    }
    case "vnotch-weir": {
      const head = waterSurfaceElevation - outlet.crestElevation;
      return vNotchWeirDischarge(outlet.coefficient, outlet.angle, head);
    }
    case "orifice": {
      const head = waterSurfaceElevation - outlet.centerElevation;
      return circularOrificeDischarge(
        outlet.coefficient,
        outlet.diameter,
        head,
      );
    }
  }
}

/**
 * Calculate total discharge for multiple outlet structures at a given WSE.
 */
export function compositeOutletDischarge(
  outlets: OutletStructure[],
  waterSurfaceElevation: number,
): number {
  return outlets.reduce(
    (total, outlet) =>
      total + outletDischarge(outlet, waterSurfaceElevation),
    0,
  );
}

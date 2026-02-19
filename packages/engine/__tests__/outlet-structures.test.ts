import { describe, it, expect } from "vitest";
import {
  broadCrestedWeirDischarge,
  vNotchWeirDischarge,
  orificeDischarge,
  circularOrificeDischarge,
  outletDischarge,
  compositeOutletDischarge,
  type OutletStructure,
} from "../src/hydraulics/outlet-structures.js";

describe("Outlet Structures", () => {
  describe("broadCrestedWeirDischarge", () => {
    it("should return zero for zero or negative head", () => {
      expect(broadCrestedWeirDischarge(2.85, 10, 0)).toBe(0);
      expect(broadCrestedWeirDischarge(2.85, 10, -1)).toBe(0);
    });

    it("should calculate Q = C * L * H^1.5", () => {
      // C=2.85, L=10ft, H=2ft => Q = 2.85 * 10 * 2^1.5 = 80.61
      const Q = broadCrestedWeirDischarge(2.85, 10, 2);
      expect(Q).toBeCloseTo(2.85 * 10 * Math.pow(2, 1.5), 2);
    });
  });

  describe("vNotchWeirDischarge", () => {
    it("should return zero for zero head", () => {
      expect(vNotchWeirDischarge(2.49, 90, 0)).toBe(0);
    });

    it("should calculate for 90-degree V-notch", () => {
      // C=2.49, angle=90°, H=1ft => Q = 2.49 * tan(45°) * 1^2.5 = 2.49
      const Q = vNotchWeirDischarge(2.49, 90, 1);
      expect(Q).toBeCloseTo(2.49, 2);
    });
  });

  describe("orificeDischarge", () => {
    it("should return zero for zero head", () => {
      expect(orificeDischarge(0.6, 1.0, 0)).toBe(0);
    });

    it("should calculate Q = C * A * sqrt(2gH)", () => {
      // C=0.6, A=1.0 sq ft, H=4ft
      // Q = 0.6 * 1.0 * sqrt(2 * 32.174 * 4) = 0.6 * sqrt(257.39) = 0.6 * 16.04 = 9.63
      const Q = orificeDischarge(0.6, 1.0, 4);
      expect(Q).toBeCloseTo(9.63, 1);
    });
  });

  describe("circularOrificeDischarge", () => {
    it("should compute area from diameter", () => {
      // D=2ft, A = π/4 * 4 = 3.1416 sq ft
      const Q = circularOrificeDischarge(0.6, 2, 4);
      const expectedArea = Math.PI;
      const expectedQ = 0.6 * expectedArea * Math.sqrt(2 * 32.174 * 4);
      expect(Q).toBeCloseTo(expectedQ, 2);
    });
  });

  describe("compositeOutletDischarge", () => {
    it("should sum discharges from multiple outlets", () => {
      const outlets: OutletStructure[] = [
        {
          type: "orifice",
          coefficient: 0.6,
          diameter: 1,
          centerElevation: 100,
        },
        {
          type: "weir",
          subtype: "broad-crested",
          coefficient: 2.85,
          length: 10,
          crestElevation: 105,
        },
      ];
      // At WSE=108: orifice has 8ft head, weir has 3ft head
      const Q = compositeOutletDischarge(outlets, 108);
      const orificeQ = circularOrificeDischarge(0.6, 1, 8);
      const weirQ = broadCrestedWeirDischarge(2.85, 10, 3);
      expect(Q).toBeCloseTo(orificeQ + weirQ, 2);
    });

    it("should only include outlets with positive head", () => {
      const outlets: OutletStructure[] = [
        {
          type: "orifice",
          coefficient: 0.6,
          diameter: 1,
          centerElevation: 100,
        },
        {
          type: "weir",
          subtype: "broad-crested",
          coefficient: 2.85,
          length: 10,
          crestElevation: 105,
        },
      ];
      // At WSE=103: orifice active (3ft head), weir inactive (-2ft head)
      const Q = compositeOutletDischarge(outlets, 103);
      const orificeQ = circularOrificeDischarge(0.6, 1, 3);
      expect(Q).toBeCloseTo(orificeQ, 2);
    });
  });
});

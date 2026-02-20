import { describe, it, expect } from "vitest";
import {
  rationalMethod,
  compositeC,
  interpolateIDF,
  modifiedRationalHydrograph,
  RUNOFF_COEFFICIENTS,
  type IDFPoint,
} from "../src/hydrology/rational-method.js";

// Sample IDF curve for testing (typical urban area)
const sampleIDF: IDFPoint[] = [
  { duration: 5, intensity: 7.0 },
  { duration: 10, intensity: 5.5 },
  { duration: 15, intensity: 4.6 },
  { duration: 30, intensity: 3.2 },
  { duration: 60, intensity: 2.1 },
  { duration: 120, intensity: 1.3 },
  { duration: 360, intensity: 0.6 },
];

describe("Rational Method", () => {
  describe("Q = CiA", () => {
    it("should calculate peak flow for simple inputs", () => {
      // C=0.5, i=3.0 in/hr, A=10 acres => Q = 0.5 * 3.0 * 10 = 15.0 cfs
      const result = rationalMethod({ c: 0.5, intensity: 3.0, area: 10 });
      expect(result.peakFlow).toBeCloseTo(15.0, 2);
      expect(result.c).toBe(0.5);
      expect(result.intensity).toBe(3.0);
    });

    it("should calculate for impervious surface", () => {
      // C=0.9, i=4.5 in/hr, A=5 acres => Q = 20.25 cfs
      const result = rationalMethod({ c: 0.9, intensity: 4.5, area: 5 });
      expect(result.peakFlow).toBeCloseTo(20.25, 2);
    });

    it("should apply frequency factor for large return periods", () => {
      // Standard Q=CiA with Cf=1.25 for 100-year
      const base = rationalMethod({ c: 0.5, intensity: 3.0, area: 10 });
      const adj = rationalMethod({
        c: 0.5,
        intensity: 3.0,
        area: 10,
        frequencyFactor: 1.25,
      });
      expect(adj.peakFlow).toBeCloseTo(base.peakFlow * 1.25, 2);
    });

    it("should throw for invalid C", () => {
      expect(() => rationalMethod({ c: -0.1, intensity: 3.0, area: 10 })).toThrow();
      expect(() => rationalMethod({ c: 1.1, intensity: 3.0, area: 10 })).toThrow();
    });

    it("should throw for zero area", () => {
      expect(() => rationalMethod({ c: 0.5, intensity: 3.0, area: 0 })).toThrow();
    });
  });

  describe("compositeC", () => {
    it("should calculate area-weighted C", () => {
      // 50% impervious (C=0.9), 50% lawn (C=0.15)
      // Composite = (0.9*5 + 0.15*5) / 10 = 0.525
      const c = compositeC([
        { c: 0.9, area: 5 },
        { c: 0.15, area: 5 },
      ]);
      expect(c).toBeCloseTo(0.525, 3);
    });

    it("should handle unequal areas", () => {
      // 80% lawn (C=0.2), 20% roof (C=0.85)
      // Composite = (0.2*80 + 0.85*20) / 100 = 0.33
      const c = compositeC([
        { c: 0.2, area: 80 },
        { c: 0.85, area: 20 },
      ]);
      expect(c).toBeCloseTo(0.33, 2);
    });

    it("should work with composite C as input to rationalMethod", () => {
      const result = rationalMethod({
        c: [
          { c: 0.9, area: 5 },
          { c: 0.15, area: 5 },
        ],
        intensity: 3.0,
        area: 10,
      });
      expect(result.c).toBeCloseTo(0.525, 3);
      expect(result.peakFlow).toBeCloseTo(0.525 * 3.0 * 10, 2);
    });
  });

  describe("interpolateIDF", () => {
    it("should return exact value at defined duration", () => {
      expect(interpolateIDF(sampleIDF, 60)).toBe(2.1);
    });

    it("should interpolate between points (log-log)", () => {
      const i = interpolateIDF(sampleIDF, 45);
      // Between 30min (3.2) and 60min (2.1), should be ~2.6
      expect(i).toBeGreaterThan(2.1);
      expect(i).toBeLessThan(3.2);
    });

    it("should clamp at minimum duration", () => {
      expect(interpolateIDF(sampleIDF, 1)).toBe(7.0);
    });

    it("should clamp at maximum duration", () => {
      expect(interpolateIDF(sampleIDF, 1000)).toBe(0.6);
    });

    it("should work with IDF curve in rationalMethod", () => {
      // Tc = 30 min → i should be 3.2 in/hr
      const result = rationalMethod({
        c: 0.5,
        intensity: { idfCurve: sampleIDF, tcMinutes: 30 },
        area: 10,
      });
      expect(result.intensity).toBeCloseTo(3.2, 1);
      expect(result.peakFlow).toBeCloseTo(0.5 * 3.2 * 10, 1);
    });
  });

  describe("modifiedRationalHydrograph", () => {
    it("should produce a trapezoidal hydrograph", () => {
      const hg = modifiedRationalHydrograph(100, 0.5, 1.0, 0.1);
      // Should start at 0, rise to 100, hold, then drop back to 0
      expect(hg[0].flow).toBe(0);
      expect(hg[hg.length - 1].flow).toBe(0);

      const peak = Math.max(...hg.map((p) => p.flow));
      expect(peak).toBeCloseTo(100, 1);
    });

    it("should reach peak at Tc", () => {
      const hg = modifiedRationalHydrograph(50, 0.5, 2.0, 0.1);
      // At t=Tc (0.5 hr), flow should reach peak
      const atTc = hg.find((p) => Math.abs(p.time - 0.5) < 0.05);
      expect(atTc?.flow).toBeCloseTo(50, 1);
    });

    it("should have total duration = storm + Tc", () => {
      const hg = modifiedRationalHydrograph(50, 0.5, 2.0, 0.1);
      const lastNonZero = [...hg].reverse().find((p) => p.flow > 0);
      expect(lastNonZero?.time).toBeCloseTo(2.5, 0);
    });
  });

  describe("RUNOFF_COEFFICIENTS", () => {
    it("should have expected land use types", () => {
      expect(RUNOFF_COEFFICIENTS["Pavement, asphalt/concrete"]).toBeDefined();
      expect(RUNOFF_COEFFICIENTS["Lawns, sandy soil, flat"]).toBeDefined();
      expect(RUNOFF_COEFFICIENTS["Residential, single family"]).toBeDefined();
    });

    it("should have valid coefficient ranges", () => {
      for (const [, val] of Object.entries(RUNOFF_COEFFICIENTS)) {
        expect(val.range[0]).toBeGreaterThanOrEqual(0);
        expect(val.range[1]).toBeLessThanOrEqual(1);
        expect(val.typical).toBeGreaterThanOrEqual(val.range[0]);
        expect(val.typical).toBeLessThanOrEqual(val.range[1]);
      }
    });
  });
});

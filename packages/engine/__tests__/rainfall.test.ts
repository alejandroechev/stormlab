import { describe, it, expect } from "vitest";
import {
  getCumulativeRainfall,
  getIncrementalRainfall,
  getRainfallDistribution,
} from "../src/hydrology/rainfall.js";

describe("Rainfall Distributions", () => {
  describe("getCumulativeRainfall", () => {
    it("should return 0 at time=0", () => {
      expect(getCumulativeRainfall("II", 5.0, 0)).toBe(0);
    });

    it("should return total depth at time=24", () => {
      expect(getCumulativeRainfall("II", 5.0, 24)).toBe(5.0);
    });

    it("should return ~66.3% of depth at hour 12 for Type II", () => {
      // Type II has its peak at hour 12: cumulative fraction = 0.663
      const result = getCumulativeRainfall("II", 5.0, 12);
      expect(result).toBeCloseTo(5.0 * 0.663, 2);
    });

    it("should interpolate between defined points", () => {
      // Between hour 11.5 (0.283) and 12.0 (0.663) for Type II
      const result = getCumulativeRainfall("II", 10.0, 11.75);
      const expected = 10.0 * (0.283 + (0.663 - 0.283) * 0.5);
      expect(result).toBeCloseTo(expected, 2);
    });

    it("should work for all storm types", () => {
      for (const type of ["I", "IA", "II", "III"] as const) {
        expect(getCumulativeRainfall(type, 5.0, 0)).toBe(0);
        expect(getCumulativeRainfall(type, 5.0, 24)).toBe(5.0);
      }
    });
  });

  describe("getIncrementalRainfall", () => {
    it("should return increments that sum to total depth", () => {
      const increments = getIncrementalRainfall("II", 5.0, 0.5);
      const total = increments.reduce((sum, [, inc]) => sum + inc, 0);
      expect(total).toBeCloseTo(5.0, 4);
    });

    it("should have the peak increment near hour 12 for Type II", () => {
      const increments = getIncrementalRainfall("II", 5.0, 0.5);
      const peakEntry = increments.reduce((max, entry) =>
        entry[1] > max[1] ? entry : max,
      );
      // Peak should be the 12.0-hour increment (from 11.5 to 12.0)
      expect(peakEntry[0]).toBe(12);
    });

    it("should throw for non-positive time step", () => {
      expect(() => getIncrementalRainfall("II", 5.0, 0)).toThrow();
      expect(() => getIncrementalRainfall("II", 5.0, -1)).toThrow();
    });
  });

  describe("getRainfallDistribution", () => {
    it("should return the raw distribution data", () => {
      const dist = getRainfallDistribution("II");
      expect(dist.length).toBeGreaterThan(0);
      expect(dist[0]).toEqual([0.0, 0.0]);
      expect(dist[dist.length - 1]).toEqual([24.0, 1.0]);
    });

    it("should return a copy (not mutate internal data)", () => {
      const dist1 = getRainfallDistribution("II");
      dist1[0] = [99, 99];
      const dist2 = getRainfallDistribution("II");
      expect(dist2[0]).toEqual([0.0, 0.0]);
    });
  });
});

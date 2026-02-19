import { describe, it, expect } from "vitest";
import {
  generateHydrograph,
  unitHydrographPeakFlow,
} from "../src/hydrology/unit-hydrograph.js";

describe("Unit Hydrograph", () => {
  describe("unitHydrographPeakFlow", () => {
    it("should calculate peak flow for known inputs", () => {
      // 100 acres, 2 inches runoff, Tp = 0.5 hr
      // qp = 484 * (100/640) * 2 / 0.5 = 484 * 0.15625 * 2 / 0.5 = 302.5 cfs
      const qp = unitHydrographPeakFlow(100, 2, 0.5);
      expect(qp).toBeCloseTo(302.5, 1);
    });

    it("should scale linearly with area", () => {
      const qp1 = unitHydrographPeakFlow(100, 1, 1);
      const qp2 = unitHydrographPeakFlow(200, 1, 1);
      expect(qp2).toBeCloseTo(qp1 * 2, 4);
    });

    it("should scale linearly with runoff depth", () => {
      const qp1 = unitHydrographPeakFlow(100, 1, 1);
      const qp2 = unitHydrographPeakFlow(100, 3, 1);
      expect(qp2).toBeCloseTo(qp1 * 3, 4);
    });
  });

  describe("generateHydrograph", () => {
    it("should produce a hydrograph with non-zero peak flow", () => {
      const result = generateHydrograph(
        100,  // 100 acres
        80,   // CN=80
        0.5,  // Tc=0.5 hr
        "II", // Type II storm
        5.0,  // 5 inches rainfall
      );
      expect(result.peakFlow).toBeGreaterThan(0);
      expect(result.timeToPeak).toBeGreaterThan(0);
      expect(result.hydrograph.length).toBeGreaterThan(0);
    });

    it("should produce zero flow at time=0", () => {
      const result = generateHydrograph(100, 80, 0.5, "II", 5.0);
      expect(result.hydrograph[0].flow).toBe(0);
    });

    it("should conserve volume (runoff volume ≈ integral of hydrograph)", () => {
      // With CN=80, P=5.0: Q = (5-0.5)^2 / (5-0.5+2.5) = 2.893 in
      // Volume = 2.893 in * 100 acres / 12 = 24.11 acre-ft
      const result = generateHydrograph(100, 80, 0.5, "II", 5.0);
      const expectedRunoff = Math.pow(5.0 - 0.5, 2) / (5.0 - 0.5 + 2.5);
      const expectedVolume = (expectedRunoff * 100) / 12;
      // Allow 5% tolerance for numerical integration
      expect(result.totalVolume).toBeCloseTo(expectedVolume, 0);
    });

    it("should have peak flow occurring after start of storm", () => {
      const result = generateHydrograph(100, 80, 0.5, "II", 5.0);
      expect(result.timeToPeak).toBeGreaterThan(0);
      // For Type II storm, peak rainfall is at hour 12
      // Peak flow should be near hour 12 + lag
      expect(result.timeToPeak).toBeGreaterThan(10);
      expect(result.timeToPeak).toBeLessThan(16);
    });

    it("should produce higher peak for higher CN", () => {
      const result1 = generateHydrograph(100, 70, 0.5, "II", 5.0);
      const result2 = generateHydrograph(100, 90, 0.5, "II", 5.0);
      expect(result2.peakFlow).toBeGreaterThan(result1.peakFlow);
    });

    it("should work with different storm types", () => {
      for (const type of ["I", "IA", "II", "III"] as const) {
        const result = generateHydrograph(100, 80, 0.5, type, 5.0);
        expect(result.peakFlow).toBeGreaterThan(0);
        expect(result.totalVolume).toBeGreaterThan(0);
      }
    });
  });
});

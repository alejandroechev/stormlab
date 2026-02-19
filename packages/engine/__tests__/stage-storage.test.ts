import { describe, it, expect } from "vitest";
import {
  prismaticStageStorage,
  conicalStageStorage,
  cylindricalStageStorage,
  interpolateStorage,
  interpolateStage,
} from "../src/hydraulics/stage-storage.js";

describe("Stage-Storage", () => {
  describe("prismaticStageStorage", () => {
    it("should have zero storage at base elevation", () => {
      const curve = prismaticStageStorage(100, 50, 10, 0, 100);
      expect(curve[0].stage).toBe(100);
      expect(curve[0].storage).toBe(0);
    });

    it("should compute correct volume for vertical walls (sideSlope=0)", () => {
      // Simple rectangular: V = L * W * D
      const curve = prismaticStageStorage(100, 50, 10, 0, 0);
      const lastPoint = curve[curve.length - 1];
      expect(lastPoint.storage).toBeCloseTo(100 * 50 * 10, 0);
    });

    it("should compute larger volume with side slopes", () => {
      const curveVertical = prismaticStageStorage(100, 50, 10, 0, 0);
      const curveSloped = prismaticStageStorage(100, 50, 10, 2, 0);
      expect(curveSloped[curveSloped.length - 1].storage).toBeGreaterThan(
        curveVertical[curveVertical.length - 1].storage,
      );
    });
  });

  describe("conicalStageStorage", () => {
    it("should have zero storage at bottom", () => {
      const curve = conicalStageStorage(20, 10);
      expect(curve[0].storage).toBe(0);
    });

    it("should compute cone volume correctly", () => {
      // V = π * R² * h / 3 for full cone
      const R = 20;
      const h = 10;
      const expected = (Math.PI * R * R * h) / 3;
      const curve = conicalStageStorage(R, h);
      expect(curve[curve.length - 1].storage).toBeCloseTo(expected, 0);
    });
  });

  describe("cylindricalStageStorage", () => {
    it("should compute cylinder volume correctly", () => {
      const R = 10;
      const h = 5;
      const expected = Math.PI * R * R * h;
      const curve = cylindricalStageStorage(R, h);
      expect(curve[curve.length - 1].storage).toBeCloseTo(expected, 0);
    });

    it("should be linear (constant cross-section)", () => {
      const curve = cylindricalStageStorage(10, 10, 0, 10);
      // Check linearity: storage should increase linearly
      for (let i = 1; i < curve.length; i++) {
        const expectedRatio = i / (curve.length - 1);
        const actualRatio =
          curve[i].storage / curve[curve.length - 1].storage;
        expect(actualRatio).toBeCloseTo(expectedRatio, 6);
      }
    });
  });

  describe("interpolation", () => {
    it("should interpolate storage at intermediate stage", () => {
      const curve = cylindricalStageStorage(10, 10, 0, 10);
      const halfStorage = interpolateStorage(curve, 5);
      const fullStorage = curve[curve.length - 1].storage;
      expect(halfStorage).toBeCloseTo(fullStorage / 2, 0);
    });

    it("should interpolate stage at intermediate storage", () => {
      const curve = cylindricalStageStorage(10, 10, 0, 10);
      const fullStorage = curve[curve.length - 1].storage;
      const halfStage = interpolateStage(curve, fullStorage / 2);
      expect(halfStage).toBeCloseTo(5, 0);
    });

    it("should clamp at boundaries", () => {
      const curve = cylindricalStageStorage(10, 10, 0, 10);
      expect(interpolateStorage(curve, -5)).toBe(0);
      expect(interpolateStorage(curve, 100)).toBe(
        curve[curve.length - 1].storage,
      );
    });
  });
});

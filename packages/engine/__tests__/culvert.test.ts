import { describe, it, expect } from "vitest";
import {
  culvertDischarge,
  culvertRatingCurve,
  type CulvertInput,
} from "../src/hydraulics/culvert.js";

const circular24: CulvertInput = {
  shape: "circular",
  span: 2.0,    // 24-inch (2 ft) diameter
  rise: 2.0,
  length: 100,
  slope: 0.01,
  manningsN: 0.013,
  inletType: "headwall",
  inletInvert: 100,
  outletInvert: 99,
  tailwaterDepth: 0,
};

const box3x2: CulvertInput = {
  shape: "box",
  span: 3.0,
  rise: 2.0,
  length: 80,
  slope: 0.005,
  manningsN: 0.013,
  inletType: "headwall",
  inletInvert: 100,
  outletInvert: 99.6,
  tailwaterDepth: 0,
};

describe("Culvert Hydraulics", () => {
  describe("culvertDischarge", () => {
    it("should return zero for zero headwater", () => {
      const result = culvertDischarge(circular24, 0);
      expect(result.discharge).toBe(0);
    });

    it("should return zero for negative headwater", () => {
      const result = culvertDischarge(circular24, -1);
      expect(result.discharge).toBe(0);
    });

    it("should produce positive discharge for positive headwater", () => {
      const result = culvertDischarge(circular24, 3.0);
      expect(result.discharge).toBeGreaterThan(0);
    });

    it("should increase discharge with increasing headwater", () => {
      const r1 = culvertDischarge(circular24, 2.0);
      const r2 = culvertDischarge(circular24, 4.0);
      const r3 = culvertDischarge(circular24, 6.0);
      expect(r2.discharge).toBeGreaterThan(r1.discharge);
      expect(r3.discharge).toBeGreaterThan(r2.discharge);
    });

    it("should report HW/D ratio", () => {
      const result = culvertDischarge(circular24, 4.0);
      expect(result.hwdRatio).toBeCloseTo(2.0, 2);
    });

    it("should identify control type", () => {
      const result = culvertDischarge(circular24, 3.0);
      expect(["inlet", "outlet"]).toContain(result.control);
    });

    it("should work for box culverts", () => {
      const result = culvertDischarge(box3x2, 4.0);
      expect(result.discharge).toBeGreaterThan(0);
    });

    it("should produce reasonable discharge for a 24-inch pipe", () => {
      // A 24" pipe under 4ft of head should carry roughly 20-50 cfs
      const result = culvertDischarge(circular24, 4.0);
      expect(result.discharge).toBeGreaterThan(5);
      expect(result.discharge).toBeLessThan(80);
    });

    it("should produce more flow for a box culvert than similar circular", () => {
      // 3x2 box has more area than 2ft circular
      const circ = culvertDischarge(circular24, 4.0);
      const box = culvertDischarge(box3x2, 4.0);
      expect(box.discharge).toBeGreaterThan(circ.discharge);
    });
  });

  describe("culvertRatingCurve", () => {
    it("should generate monotonically increasing discharges", () => {
      const curve = culvertRatingCurve(circular24, 8.0, 20);
      expect(curve.length).toBe(21);
      expect(curve[0].discharge).toBe(0);

      for (let i = 2; i < curve.length; i++) {
        expect(curve[i].discharge).toBeGreaterThanOrEqual(curve[i - 1].discharge);
      }
    });

    it("should cover the full headwater range", () => {
      const curve = culvertRatingCurve(circular24, 6.0, 10);
      expect(curve[0].headwater).toBe(0);
      expect(curve[curve.length - 1].headwater).toBeCloseTo(6.0, 2);
    });
  });

  describe("inlet types", () => {
    it("should produce more flow with flared inlet than projecting", () => {
      const projecting: CulvertInput = { ...circular24, inletType: "projecting" };
      const flared: CulvertInput = { ...circular24, inletType: "flared" };

      const rp = culvertDischarge(projecting, 4.0);
      const rf = culvertDischarge(flared, 4.0);

      // Flared inlet should have lower entrance loss → more capacity
      expect(rf.discharge).toBeGreaterThan(rp.discharge);
    });
  });

  describe("tailwater effects", () => {
    it("should reduce capacity with higher tailwater", () => {
      const free: CulvertInput = { ...circular24, tailwaterDepth: 0 };
      const submerged: CulvertInput = { ...circular24, tailwaterDepth: 2.0 };

      const rf = culvertDischarge(free, 4.0);
      const rs = culvertDischarge(submerged, 4.0);

      // Higher tailwater → less available head → less outlet control capacity
      expect(rs.discharge).toBeLessThanOrEqual(rf.discharge);
    });
  });
});

import { describe, it, expect } from "vitest";
import { compositeCN, type SubArea } from "../src/hydrology/curve-number.js";

describe("Curve Number", () => {
  describe("compositeCN", () => {
    it("should return the CN when there is a single sub-area", () => {
      const areas: SubArea[] = [
        { description: "Residential", soilGroup: "B", cn: 72, area: 10 },
      ];
      expect(compositeCN(areas)).toBe(72);
    });

    it("should calculate area-weighted composite CN", () => {
      // Example: 50% residential (CN=72) + 50% woods (CN=55)
      // Composite = (72*10 + 55*10) / 20 = 63.5, rounds to 64
      const areas: SubArea[] = [
        { description: "Residential", soilGroup: "B", cn: 72, area: 10 },
        { description: "Woods", soilGroup: "B", cn: 55, area: 10 },
      ];
      expect(compositeCN(areas)).toBe(64);
    });

    it("should weight by area correctly with unequal areas", () => {
      // 80 acres at CN=75, 20 acres at CN=90
      // Composite = (75*80 + 90*20) / 100 = 78
      const areas: SubArea[] = [
        { description: "Pasture", soilGroup: "C", cn: 75, area: 80 },
        { description: "Commercial", soilGroup: "C", cn: 90, area: 20 },
      ];
      expect(compositeCN(areas)).toBe(78);
    });

    it("should throw for empty sub-areas", () => {
      expect(() => compositeCN([])).toThrow();
    });

    it("should throw for zero total area", () => {
      const areas: SubArea[] = [
        { description: "X", soilGroup: "A", cn: 50, area: 0 },
      ];
      expect(() => compositeCN(areas)).toThrow();
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  sheetFlowTravelTime,
  shallowConcentratedFlowTravelTime,
  channelFlowTravelTime,
  calculateTc,
  type SheetFlowSegment,
  type ShallowConcentratedFlowSegment,
  type ChannelFlowSegment,
} from "../src/hydrology/time-of-concentration.js";

describe("Time of Concentration", () => {
  describe("sheetFlowTravelTime", () => {
    it("should calculate Tt for typical residential sheet flow", () => {
      // TR-55 example: n=0.24, L=100ft, P2=3.0in, s=0.01
      // Tt = 0.007 * (0.24*100)^0.8 / (3.0^0.5 * 0.01^0.4)
      const seg: SheetFlowSegment = {
        type: "sheet",
        manningsN: 0.24,
        length: 100,
        rainfall2yr: 3.0,
        slope: 0.01,
      };
      const tt = sheetFlowTravelTime(seg);
      // Expected ~0.30 hours based on TR-55 worksheet
      expect(tt).toBeGreaterThan(0.2);
      expect(tt).toBeLessThan(0.5);
    });

    it("should throw if flow length exceeds 300 ft", () => {
      const seg: SheetFlowSegment = {
        type: "sheet",
        manningsN: 0.24,
        length: 301,
        rainfall2yr: 3.0,
        slope: 0.01,
      };
      expect(() => sheetFlowTravelTime(seg)).toThrow("300 ft");
    });

    it("should throw for zero slope", () => {
      const seg: SheetFlowSegment = {
        type: "sheet",
        manningsN: 0.24,
        length: 100,
        rainfall2yr: 3.0,
        slope: 0,
      };
      expect(() => sheetFlowTravelTime(seg)).toThrow();
    });
  });

  describe("shallowConcentratedFlowTravelTime", () => {
    it("should calculate Tt for unpaved surface", () => {
      const seg: ShallowConcentratedFlowSegment = {
        type: "shallow",
        length: 1000,
        slope: 0.05,
        surface: "unpaved",
      };
      const tt = shallowConcentratedFlowTravelTime(seg);
      // V = 16.1345 * 0.05^0.5 = 3.608 ft/s
      // Tt = 1000 / 3.608 / 3600 = 0.077 hr
      expect(tt).toBeCloseTo(0.077, 2);
    });

    it("should calculate Tt for paved surface", () => {
      const seg: ShallowConcentratedFlowSegment = {
        type: "shallow",
        length: 1000,
        slope: 0.05,
        surface: "paved",
      };
      const tt = shallowConcentratedFlowTravelTime(seg);
      // V = 20.3282 * 0.05^0.5 = 4.546 ft/s
      // Tt = 1000 / 4.546 / 3600 = 0.061 hr
      expect(tt).toBeCloseTo(0.061, 2);
    });
  });

  describe("channelFlowTravelTime", () => {
    it("should calculate Tt for a trapezoidal channel", () => {
      // A=27 sq ft, WP=28.2 ft, n=0.05, S=0.005, L=2000ft
      // R = 27/28.2 = 0.957
      // V = (1.49/0.05) * 0.957^(2/3) * 0.005^0.5 = 29.8 * 0.971 * 0.0707 = 2.047 ft/s
      // Tt = 2000 / 2.047 / 3600 = 0.271 hr
      const seg: ChannelFlowSegment = {
        type: "channel",
        length: 2000,
        wettedPerimeter: 28.2,
        area: 27,
        manningsN: 0.05,
        slope: 0.005,
      };
      const tt = channelFlowTravelTime(seg);
      expect(tt).toBeCloseTo(0.271, 1);
    });
  });

  describe("calculateTc", () => {
    it("should sum travel times of all segments", () => {
      const segments = [
        {
          type: "sheet" as const,
          manningsN: 0.24,
          length: 100,
          rainfall2yr: 3.0,
          slope: 0.01,
        },
        {
          type: "shallow" as const,
          length: 1000,
          slope: 0.05,
          surface: "unpaved" as const,
        },
      ];
      const tc = calculateTc(segments);
      const sheetTt = sheetFlowTravelTime(segments[0]);
      const shallowTt = shallowConcentratedFlowTravelTime(segments[1]);
      expect(tc).toBeCloseTo(sheetTt + shallowTt, 6);
    });

    it("should throw for empty segments", () => {
      expect(() => calculateTc([])).toThrow();
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  getRainfallByState,
  getRainfallDepth,
  generateEventsForState,
  getAvailableStates,
  STATE_RAINFALL_DATA,
} from "../src/hydrology/noaa-rainfall.js";

describe("NOAA Atlas 14 Rainfall Lookup", () => {
  describe("getRainfallByState", () => {
    it("should return data for valid state code", () => {
      const data = getRainfallByState("CO");
      expect(data).toBeDefined();
      expect(data!.name).toBe("Colorado");
      expect(data!.stormType).toBe("II");
    });

    it("should be case-insensitive", () => {
      const data = getRainfallByState("co");
      expect(data).toBeDefined();
      expect(data!.state).toBe("CO");
    });

    it("should return undefined for invalid state", () => {
      expect(getRainfallByState("XX")).toBeUndefined();
    });

    it("should have correct storm types for Pacific states", () => {
      expect(getRainfallByState("CA")!.stormType).toBe("I");
      expect(getRainfallByState("OR")!.stormType).toBe("IA");
      expect(getRainfallByState("WA")!.stormType).toBe("IA");
    });

    it("should have correct storm types for coastal Southeast", () => {
      expect(getRainfallByState("FL")!.stormType).toBe("III");
      expect(getRainfallByState("LA")!.stormType).toBe("III");
      expect(getRainfallByState("TX")!.stormType).toBe("III");
    });
  });

  describe("getRainfallDepth", () => {
    it("should return depth for valid state and return period", () => {
      const depth = getRainfallDepth("CO", "100yr");
      expect(depth).toBeDefined();
      expect(depth).toBeGreaterThan(0);
    });

    it("should return higher depth for higher return period", () => {
      const d2 = getRainfallDepth("NY", "2yr")!;
      const d100 = getRainfallDepth("NY", "100yr")!;
      expect(d100).toBeGreaterThan(d2);
    });

    it("should return undefined for invalid state", () => {
      expect(getRainfallDepth("XX", "100yr")).toBeUndefined();
    });
  });

  describe("generateEventsForState", () => {
    it("should generate 4 standard events", () => {
      const events = generateEventsForState("PA");
      expect(events).toHaveLength(4);
      expect(events.map((e) => e.id)).toEqual(["2yr", "10yr", "25yr", "100yr"]);
    });

    it("should use the correct storm type", () => {
      const events = generateEventsForState("FL");
      expect(events[0].stormType).toBe("III"); // Florida = Type III
    });

    it("should include depth in label", () => {
      const events = generateEventsForState("CO");
      expect(events[0].label).toContain('"'); // contains inches symbol
    });

    it("should return empty for invalid state", () => {
      expect(generateEventsForState("XX")).toEqual([]);
    });
  });

  describe("getAvailableStates", () => {
    it("should return all 50 states + DC", () => {
      const states = getAvailableStates();
      expect(states.length).toBe(51);
    });

    it("should be sorted by name", () => {
      const states = getAvailableStates();
      expect(states[0].name).toBe("Alabama");
      expect(states[states.length - 1].name).toBe("Wyoming");
    });
  });

  describe("data integrity", () => {
    it("should have increasing depths for all states", () => {
      for (const state of STATE_RAINFALL_DATA) {
        const d = state.depths;
        expect(d["5yr"]).toBeGreaterThan(d["2yr"]);
        expect(d["10yr"]).toBeGreaterThan(d["5yr"]);
        expect(d["25yr"]).toBeGreaterThan(d["10yr"]);
        expect(d["50yr"]).toBeGreaterThan(d["25yr"]);
        expect(d["100yr"]).toBeGreaterThan(d["50yr"]);
      }
    });

    it("should have valid storm types for all states", () => {
      for (const state of STATE_RAINFALL_DATA) {
        expect(["I", "IA", "II", "III"]).toContain(state.stormType);
      }
    });

    it("should have positive depths for all states", () => {
      for (const state of STATE_RAINFALL_DATA) {
        for (const val of Object.values(state.depths)) {
          expect(val).toBeGreaterThan(0);
        }
      }
    });
  });
});

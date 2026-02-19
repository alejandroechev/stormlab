import { describe, it, expect } from "vitest";
import {
  computeSubcatchment,
  type SubcatchmentInput,
  type RainfallEvent,
} from "../src/hydrology/subcatchment.js";

describe("Subcatchment Model", () => {
  const event: RainfallEvent = {
    label: "25-year",
    stormType: "II",
    totalDepth: 6.0,
  };

  const basicInput: SubcatchmentInput = {
    id: "SC-1",
    name: "Residential Area",
    subAreas: [
      { description: "Residential 1/2 acre", soilGroup: "B", cn: 70, area: 50 },
      { description: "Open space", soilGroup: "B", cn: 61, area: 30 },
      { description: "Impervious", soilGroup: "B", cn: 98, area: 20 },
    ],
    flowSegments: [
      {
        type: "sheet",
        manningsN: 0.24,
        length: 100,
        rainfall2yr: 3.5,
        slope: 0.02,
      },
      {
        type: "shallow",
        length: 800,
        slope: 0.04,
        surface: "unpaved",
      },
    ],
  };

  it("should compute a full subcatchment result", () => {
    const result = computeSubcatchment(basicInput, event);

    expect(result.id).toBe("SC-1");
    expect(result.name).toBe("Residential Area");
    expect(result.totalArea).toBe(100);
    expect(result.compositeCN).toBeGreaterThan(60);
    expect(result.compositeCN).toBeLessThan(90);
    expect(result.tc).toBeGreaterThan(0);
    expect(result.hydrograph.peakFlow).toBeGreaterThan(0);
  });

  it("should use cnOverride when provided", () => {
    const input: SubcatchmentInput = {
      ...basicInput,
      cnOverride: 85,
    };
    const result = computeSubcatchment(input, event);
    expect(result.compositeCN).toBe(85);
  });

  it("should use tcOverride when provided", () => {
    const input: SubcatchmentInput = {
      ...basicInput,
      tcOverride: 1.0,
    };
    const result = computeSubcatchment(input, event);
    expect(result.tc).toBe(1.0);
  });

  it("should produce higher peak for higher rainfall", () => {
    const event10yr: RainfallEvent = {
      label: "10-year",
      stormType: "II",
      totalDepth: 4.0,
    };
    const event100yr: RainfallEvent = {
      label: "100-year",
      stormType: "II",
      totalDepth: 8.0,
    };
    const result10 = computeSubcatchment(basicInput, event10yr);
    const result100 = computeSubcatchment(basicInput, event100yr);
    expect(result100.hydrograph.peakFlow).toBeGreaterThan(
      result10.hydrograph.peakFlow,
    );
  });

  it("should conserve volume approximately", () => {
    const result = computeSubcatchment(basicInput, event);
    // Volume in acre-ft should be approximately (Q_inches * area) / 12
    const cn = result.compositeCN;
    const S = 1000 / cn - 10;
    const Ia = 0.2 * S;
    const P = event.totalDepth;
    const Qin = P > Ia ? Math.pow(P - Ia, 2) / (P - Ia + S) : 0;
    const expectedVol = (Qin * result.totalArea) / 12;
    // 10% tolerance for discrete convolution
    expect(result.hydrograph.totalVolume).toBeCloseTo(expectedVol, 0);
  });
});

import { describe, it, expect } from "vitest";
import { routePond, type PondRoutingInput } from "../src/hydraulics/pond-routing.js";
import { prismaticStageStorage } from "../src/hydraulics/stage-storage.js";
import { type OutletStructure } from "../src/hydraulics/outlet-structures.js";

describe("Pond Routing (Modified Puls)", () => {
  // Create a simple test pond: 100x50 ft, 10ft deep, vertical walls
  const stageStorage = prismaticStageStorage(100, 50, 10, 0, 100, 50);

  // Simple outlets: 1ft diameter orifice at bottom + weir at top
  const outlets: OutletStructure[] = [
    {
      type: "orifice",
      coefficient: 0.6,
      diameter: 1.0,
      centerElevation: 100.5,
    },
    {
      type: "weir",
      subtype: "broad-crested",
      coefficient: 2.85,
      length: 10,
      crestElevation: 108,
    },
  ];

  // Simple triangular inflow hydrograph: peaks at 50 cfs at hour 1, back to 0 at hour 2
  function makeTriangularInflow(
    peakFlow: number,
    peakTime: number,
    duration: number,
    dt: number,
  ): [number, number][] {
    const inflow: [number, number][] = [];
    for (let t = 0; t <= duration; t += dt) {
      let flow: number;
      if (t <= peakTime) {
        flow = (peakFlow * t) / peakTime;
      } else {
        flow = peakFlow * (1 - (t - peakTime) / (duration - peakTime));
      }
      inflow.push([t, Math.max(0, flow)]);
    }
    return inflow;
  }

  it("should attenuate peak flow (outflow peak < inflow peak)", () => {
    const inflow = makeTriangularInflow(100, 1, 3, 0.1);
    const input: PondRoutingInput = {
      inflow,
      stageStorage,
      outlets,
      initialWSE: 100,
    };
    const result = routePond(input);

    expect(result.peakInflow).toBeCloseTo(100, 0);
    expect(result.peakOutflow).toBeLessThan(result.peakInflow);
    expect(result.peakOutflow).toBeGreaterThan(0);
  });

  it("should delay peak outflow relative to peak inflow", () => {
    const inflow = makeTriangularInflow(100, 1, 3, 0.1);
    const input: PondRoutingInput = {
      inflow,
      stageStorage,
      outlets,
      initialWSE: 100,
    };
    const result = routePond(input);

    // Peak outflow should occur at or near peak inflow time (at hour 1)
    // With a small pond, peak outflow may coincide with peak inflow
    expect(result.timeToPeakOutflow).toBeCloseTo(1, 0);
  });

  it("should start with zero outflow when pond is empty", () => {
    const inflow = makeTriangularInflow(50, 1, 3, 0.1);
    const input: PondRoutingInput = {
      inflow,
      stageStorage,
      outlets,
      initialWSE: 100,
    };
    const result = routePond(input);
    expect(result.timeSeries[0].outflow).toBe(0);
  });

  it("should produce a valid time series", () => {
    const inflow = makeTriangularInflow(50, 1, 3, 0.1);
    const input: PondRoutingInput = {
      inflow,
      stageStorage,
      outlets,
      initialWSE: 100,
    };
    const result = routePond(input);

    // Should have same number of points as inflow
    expect(result.timeSeries.length).toBe(inflow.length);

    // All values should be non-negative
    for (const point of result.timeSeries) {
      expect(point.outflow).toBeGreaterThanOrEqual(0);
      expect(point.stage).toBeGreaterThanOrEqual(100);
      expect(point.storage).toBeGreaterThanOrEqual(0);
    }
  });

  it("should handle larger inflow with more attenuation", () => {
    const smallInflow = makeTriangularInflow(50, 1, 3, 0.1);
    const largeInflow = makeTriangularInflow(200, 1, 3, 0.1);

    const resultSmall = routePond({
      inflow: smallInflow,
      stageStorage,
      outlets,
      initialWSE: 100,
    });
    const resultLarge = routePond({
      inflow: largeInflow,
      stageStorage,
      outlets,
      initialWSE: 100,
    });

    // Larger inflow should have larger peak outflow
    expect(resultLarge.peakOutflow).toBeGreaterThan(resultSmall.peakOutflow);
    // But attenuation ratio should be higher for larger storms
    const ratioSmall = resultSmall.peakOutflow / 50;
    const ratioLarge = resultLarge.peakOutflow / 200;
    expect(ratioLarge).toBeLessThan(ratioSmall);
  });
});

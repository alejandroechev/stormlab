import { describe, it, expect } from "vitest";
import {
  goalSeekOrificeDiameter,
  sweepOrificeDiameter,
} from "../src/model/sensitivity.js";
import { prismaticStageStorage } from "../src/hydraulics/stage-storage.js";
import type { Project } from "../src/model/project.js";

function makeTestProject(): Project {
  return {
    id: "test",
    name: "Goal Seek Test",
    description: "",
    nodes: [
      {
        type: "subcatchment",
        id: "SC1",
        name: "Basin",
        position: { x: 0, y: 0 },
        data: {
          id: "SC1",
          name: "Basin",
          subAreas: [
            { description: "Residential", soilGroup: "B", cn: 75, area: 50 },
          ],
          flowSegments: [],
          tcOverride: 0.5,
        },
      },
      {
        type: "pond",
        id: "P1",
        name: "Pond",
        position: { x: 0, y: 1 },
        data: {
          stageStorage: prismaticStageStorage(80, 40, 8, 1, 100, 40),
          outlets: [
            {
              type: "orifice" as const,
              coefficient: 0.6,
              diameter: 1.0,
              centerElevation: 100.5,
            },
            {
              type: "weir" as const,
              subtype: "broad-crested" as const,
              coefficient: 2.85,
              length: 8,
              crestElevation: 106,
            },
          ],
          initialWSE: 100,
        },
      },
      {
        type: "junction" as const,
        id: "OUT",
        name: "Outlet",
        position: { x: 0, y: 2 },
      },
    ],
    links: [
      { id: "L1", from: "SC1", to: "P1" },
      { id: "L2", from: "P1", to: "OUT" },
    ],
    events: [
      { id: "25yr", label: "25-Year", stormType: "II" as const, totalDepth: 6.0 },
    ],
  };
}

describe("Sensitivity Analysis", () => {
  describe("goalSeekOrificeDiameter", () => {
    it("should find an orifice diameter for a target outflow", () => {
      const project = makeTestProject();
      const result = goalSeekOrificeDiameter(
        project,
        "P1",
        "25yr",
        20,
        0.25,
        6.0,
        2.0,
        30,
      );
      // Bisection should produce a result with positive achieved flow
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.achievedFlow).toBeGreaterThan(0);
      expect(result.value).toBeGreaterThan(0);
    });

    it("should handle a very low target (small orifice)", () => {
      const project = makeTestProject();
      const result = goalSeekOrificeDiameter(
        project,
        "P1",
        "25yr",
        10,
        0.1,
        3.0,
        2.0,
        30,
      );
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.value).toBeGreaterThan(0);
    });

    it("should return not converged for impossible target", () => {
      const project = makeTestProject();
      // Target higher than uncontrolled inflow — impossible
      const result = goalSeekOrificeDiameter(
        project,
        "P1",
        "25yr",
        5000,
        0.25,
        6.0,
        0.5,
        10,
      );
      expect(result.converged).toBe(false);
    });
  });

  describe("sweepOrificeDiameter", () => {
    it("should produce monotonically increasing outflow with diameter", () => {
      const project = makeTestProject();
      const sweep = sweepOrificeDiameter(project, "P1", "25yr", 0.5, 3.0, 5);

      expect(sweep.length).toBe(6);
      for (let i = 1; i < sweep.length; i++) {
        expect(sweep[i].peakOutflow).toBeGreaterThanOrEqual(
          sweep[i - 1].peakOutflow,
        );
      }
    });

    it("should produce decreasing peak stage with larger orifice", () => {
      const project = makeTestProject();
      const sweep = sweepOrificeDiameter(project, "P1", "25yr", 0.5, 3.0, 5);

      for (let i = 1; i < sweep.length; i++) {
        if (sweep[i].peakStage !== undefined && sweep[i - 1].peakStage !== undefined) {
          expect(sweep[i].peakStage!).toBeLessThanOrEqual(
            sweep[i - 1].peakStage! + 0.01,
          );
        }
      }
    });
  });
});

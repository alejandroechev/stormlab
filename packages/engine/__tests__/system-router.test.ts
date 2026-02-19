import { describe, it, expect } from "vitest";
import {
  topologicalSort,
  validateProject,
  getUpstreamNodes,
  type Project,
  type ProjectNode,
  type ProjectLink,
} from "../src/model/project.js";
import { runSimulation } from "../src/model/system-router.js";
import { prismaticStageStorage } from "../src/hydraulics/stage-storage.js";

function makeSubcatchment(
  id: string,
  name: string,
  x: number,
  y: number,
): ProjectNode {
  return {
    type: "subcatchment",
    id,
    name,
    position: { x, y },
    data: {
      id,
      name,
      subAreas: [
        { description: "Residential", soilGroup: "B", cn: 75, area: 50 },
      ],
      flowSegments: [],
      tcOverride: 0.5,
    },
  };
}

describe("Project Model", () => {
  describe("topologicalSort", () => {
    it("should sort a simple chain", () => {
      const nodes: ProjectNode[] = [
        makeSubcatchment("A", "A", 0, 0),
        { type: "junction", id: "B", name: "B", position: { x: 1, y: 0 } },
        { type: "junction", id: "C", name: "C", position: { x: 2, y: 0 } },
      ];
      const links: ProjectLink[] = [
        { id: "L1", from: "A", to: "B" },
        { id: "L2", from: "B", to: "C" },
      ];
      const order = topologicalSort(nodes, links);
      expect(order.indexOf("A")).toBeLessThan(order.indexOf("B"));
      expect(order.indexOf("B")).toBeLessThan(order.indexOf("C"));
    });

    it("should handle converging flows", () => {
      const nodes: ProjectNode[] = [
        makeSubcatchment("A", "A", 0, 0),
        makeSubcatchment("B", "B", 0, 1),
        { type: "junction", id: "C", name: "C", position: { x: 1, y: 0 } },
      ];
      const links: ProjectLink[] = [
        { id: "L1", from: "A", to: "C" },
        { id: "L2", from: "B", to: "C" },
      ];
      const order = topologicalSort(nodes, links);
      expect(order.indexOf("A")).toBeLessThan(order.indexOf("C"));
      expect(order.indexOf("B")).toBeLessThan(order.indexOf("C"));
    });

    it("should throw on cycle", () => {
      const nodes: ProjectNode[] = [
        { type: "junction", id: "A", name: "A", position: { x: 0, y: 0 } },
        { type: "junction", id: "B", name: "B", position: { x: 1, y: 0 } },
      ];
      const links: ProjectLink[] = [
        { id: "L1", from: "A", to: "B" },
        { id: "L2", from: "B", to: "A" },
      ];
      expect(() => topologicalSort(nodes, links)).toThrow("Cycle");
    });
  });

  describe("getUpstreamNodes", () => {
    it("should return upstream node IDs", () => {
      const links: ProjectLink[] = [
        { id: "L1", from: "A", to: "C" },
        { id: "L2", from: "B", to: "C" },
      ];
      expect(getUpstreamNodes("C", links).sort()).toEqual(["A", "B"]);
    });

    it("should return empty for root nodes", () => {
      const links: ProjectLink[] = [{ id: "L1", from: "A", to: "B" }];
      expect(getUpstreamNodes("A", links)).toEqual([]);
    });
  });

  describe("validateProject", () => {
    it("should return no errors for valid project", () => {
      const project: Project = {
        id: "P1",
        name: "Test",
        description: "",
        nodes: [makeSubcatchment("SC1", "SC1", 0, 0)],
        links: [],
        events: [
          { id: "E1", label: "25yr", stormType: "II", totalDepth: 6.0 },
        ],
      };
      expect(validateProject(project)).toEqual([]);
    });

    it("should flag missing events", () => {
      const project: Project = {
        id: "P1",
        name: "Test",
        description: "",
        nodes: [makeSubcatchment("SC1", "SC1", 0, 0)],
        links: [],
        events: [],
      };
      expect(validateProject(project)).toContain("No rainfall events defined");
    });
  });
});

describe("System Router", () => {
  it("should run a simple subcatchment → pond → outlet simulation", () => {
    const stageStorage = prismaticStageStorage(80, 40, 8, 1, 100, 40);

    const project: Project = {
      id: "P1",
      name: "Test Project",
      description: "Integration test",
      nodes: [
        makeSubcatchment("SC1", "North Basin", 0, 0),
        {
          type: "pond",
          id: "P1",
          name: "Detention Pond",
          position: { x: 1, y: 0 },
          data: {
            stageStorage,
            outlets: [
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
                length: 8,
                crestElevation: 106,
              },
            ],
            initialWSE: 100,
          },
        },
        {
          type: "junction",
          id: "OUT",
          name: "Outlet",
          position: { x: 2, y: 0 },
        },
      ],
      links: [
        { id: "L1", from: "SC1", to: "P1" },
        { id: "L2", from: "P1", to: "OUT" },
      ],
      events: [{ id: "25yr", label: "25-Year", stormType: "II", totalDepth: 6.0 }],
    };

    const result = runSimulation(project, "25yr");

    // Subcatchment should produce runoff
    const scResult = result.nodeResults.get("SC1")!;
    expect(scResult.peakOutflow).toBeGreaterThan(0);

    // Pond should attenuate peak
    const pondResult = result.nodeResults.get("P1")!;
    expect(pondResult.peakOutflow).toBeLessThan(scResult.peakOutflow);
    expect(pondResult.peakOutflow).toBeGreaterThan(0);
    expect(pondResult.peakStage).toBeGreaterThan(100);

    // Outlet junction should pass through pond outflow
    const outResult = result.nodeResults.get("OUT")!;
    expect(outResult.peakOutflow).toBeCloseTo(pondResult.peakOutflow, 0);
  });

  it("should sum flows at a junction from multiple subcatchments", () => {
    const project: Project = {
      id: "P2",
      name: "Two-Basin",
      description: "",
      nodes: [
        makeSubcatchment("SC1", "Basin 1", 0, 0),
        makeSubcatchment("SC2", "Basin 2", 0, 1),
        {
          type: "junction",
          id: "J1",
          name: "Confluence",
          position: { x: 1, y: 0 },
        },
      ],
      links: [
        { id: "L1", from: "SC1", to: "J1" },
        { id: "L2", from: "SC2", to: "J1" },
      ],
      events: [{ id: "10yr", label: "10-Year", stormType: "II", totalDepth: 4.5 }],
    };

    const result = runSimulation(project, "10yr");

    const sc1Peak = result.nodeResults.get("SC1")!.peakOutflow;
    const junctionPeak = result.nodeResults.get("J1")!.peakOutflow;

    // Junction peak should be greater than single subcatchment
    expect(junctionPeak).toBeGreaterThan(sc1Peak);
  });
});

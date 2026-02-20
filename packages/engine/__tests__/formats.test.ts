import { describe, it, expect } from "vitest";
import {
  parseSubcatchmentCSV,
  csvRowsToSubcatchmentNodes,
  exportSubcatchmentsCSV,
  exportResultsCSV,
} from "../src/formats/csv.js";
import { importSWMM, exportSWMM } from "../src/formats/swmm.js";
import { importHECHMS, exportHECHMS } from "../src/formats/hechms.js";
import { importGeoJSON, exportGeoJSON } from "../src/formats/geojson.js";
import type { Project, NodeResult } from "../src/model/project.js";

// ─── CSV ──────────────────────────────────────────────────────────

describe("CSV Import/Export", () => {
  const sampleCSV = `name,area,cn,soil_group,tc,description
North Basin,50,75,B,0.5,Residential
South Basin,30,82,C,0.8,Commercial
Open Space,20,61,A,1.0,Park`;

  it("should parse subcatchment CSV", () => {
    const rows = parseSubcatchmentCSV(sampleCSV);
    expect(rows).toHaveLength(3);
    expect(rows[0].name).toBe("North Basin");
    expect(rows[0].area).toBe(50);
    expect(rows[0].cn).toBe(75);
    expect(rows[0].soilGroup).toBe("B");
  });

  it("should convert CSV rows to subcatchment nodes", () => {
    const rows = parseSubcatchmentCSV(sampleCSV);
    const nodes = csvRowsToSubcatchmentNodes(rows);
    expect(nodes).toHaveLength(3);
    expect(nodes[0].type).toBe("subcatchment");
    expect(nodes[0].data.subAreas[0].cn).toBe(75);
  });

  it("should export subcatchments as CSV", () => {
    const rows = parseSubcatchmentCSV(sampleCSV);
    const nodes = csvRowsToSubcatchmentNodes(rows);
    const project: Project = {
      id: "test", name: "Test", description: "", nodes, links: [],
      events: [{ id: "25yr", label: "25yr", stormType: "II", totalDepth: 6 }],
    };
    const csv = exportSubcatchmentsCSV(project);
    expect(csv).toContain("name,area,cn");
    expect(csv).toContain("North Basin");
    expect(csv.split("\n").length).toBe(4); // header + 3 rows
  });

  it("should handle missing optional columns", () => {
    const minimal = "name,area,cn\nBasin A,10,70";
    const rows = parseSubcatchmentCSV(minimal);
    expect(rows[0].soilGroup).toBe("B"); // default
    expect(rows[0].tc).toBe(0.5); // default
  });

  it("should throw on missing required columns", () => {
    expect(() => parseSubcatchmentCSV("area,cn\n10,70")).toThrow("name");
  });

  it("should roundtrip CSV export/import", () => {
    const rows = parseSubcatchmentCSV(sampleCSV);
    const nodes = csvRowsToSubcatchmentNodes(rows);
    const project: Project = {
      id: "test", name: "Test", description: "", nodes, links: [],
      events: [{ id: "25yr", label: "25yr", stormType: "II", totalDepth: 6 }],
    };
    const exported = exportSubcatchmentsCSV(project);
    const reimported = parseSubcatchmentCSV(exported);
    expect(reimported).toHaveLength(3);
    expect(reimported[0].name).toBe("North Basin");
    expect(reimported[0].cn).toBe(75);
  });
});

// ─── SWMM ─────────────────────────────────────────────────────────

describe("EPA SWMM .inp Import/Export", () => {
  const sampleINP = `[TITLE]
;;Example SWMM Project

[SUBCATCHMENTS]
;;Name  Raingage  Outlet  Area  %Imperv  Width  Slope
S1      RG1       J1      10    30       500    0.01
S2      RG1       J1      15    50       600    0.02

[JUNCTIONS]
;;Name  Elevation  MaxDepth
J1      100.0      10.0
J2      95.0       8.0

[CONDUITS]
;;Name  FromNode  ToNode  Length  Roughness
C1      J1        J2      300     0.013
`;

  it("should import SWMM subcatchments", () => {
    const project = importSWMM(sampleINP);
    const scs = project.nodes.filter((n) => n.type === "subcatchment");
    expect(scs).toHaveLength(2);
    expect(scs[0].name).toBe("S1");
  });

  it("should import SWMM junctions", () => {
    const project = importSWMM(sampleINP);
    const juncs = project.nodes.filter((n) => n.type === "junction");
    expect(juncs.length).toBeGreaterThanOrEqual(2);
  });

  it("should import SWMM conduits as reaches", () => {
    const project = importSWMM(sampleINP);
    const reaches = project.nodes.filter((n) => n.type === "reach");
    expect(reaches).toHaveLength(1);
  });

  it("should create valid links", () => {
    const project = importSWMM(sampleINP);
    expect(project.links.length).toBeGreaterThan(0);
  });

  it("should export a valid SWMM .inp", () => {
    const project = importSWMM(sampleINP);
    const exported = exportSWMM(project);
    expect(exported).toContain("[SUBCATCHMENTS]");
    expect(exported).toContain("[JUNCTIONS]");
    expect(exported).toContain("[OPTIONS]");
  });

  it("should roundtrip SWMM import/export", () => {
    const project = importSWMM(sampleINP);
    const exported = exportSWMM(project);
    const reimported = importSWMM(exported);
    expect(reimported.nodes.filter((n) => n.type === "subcatchment").length).toBeGreaterThanOrEqual(1);
  });
});

// ─── HEC-HMS ──────────────────────────────────────────────────────

describe("HEC-HMS .basin Import/Export", () => {
  const sampleBasin = `Basin: Test Watershed
  Description: Example
  End:

Subbasin: North Basin
  Area: 50
  Curve Number: 75
  Lag: 30
  Downstream: Confluence
  End:

Subbasin: South Basin
  Area: 30
  Curve Number: 82
  Downstream: Confluence
  End:

Junction: Confluence
  Downstream: Outlet
  End:

Junction: Outlet
  End:
`;

  it("should import HEC-HMS subbasins", () => {
    const project = importHECHMS(sampleBasin);
    const scs = project.nodes.filter((n) => n.type === "subcatchment");
    expect(scs).toHaveLength(2);
    expect(scs[0].name).toBe("North Basin");
  });

  it("should import HEC-HMS junctions", () => {
    const project = importHECHMS(sampleBasin);
    const juncs = project.nodes.filter((n) => n.type === "junction");
    expect(juncs).toHaveLength(2);
  });

  it("should create downstream links", () => {
    const project = importHECHMS(sampleBasin);
    expect(project.links.length).toBeGreaterThan(0);
  });

  it("should export a valid .basin file", () => {
    const project = importHECHMS(sampleBasin);
    const exported = exportHECHMS(project);
    expect(exported).toContain("Basin:");
    expect(exported).toContain("Subbasin:");
    expect(exported).toContain("Junction:");
    expect(exported).toContain("End:");
  });

  it("should roundtrip HEC-HMS import/export", () => {
    const project = importHECHMS(sampleBasin);
    const exported = exportHECHMS(project);
    const reimported = importHECHMS(exported);
    expect(reimported.nodes.filter((n) => n.type === "subcatchment")).toHaveLength(2);
  });
});

// ─── GeoJSON ──────────────────────────────────────────────────────

describe("GeoJSON Import/Export", () => {
  const sampleGeoJSON = JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[0, 0], [1000, 0], [1000, 1000], [0, 1000], [0, 0]]] },
        properties: { name: "Basin A", cn: 75, soil_group: "B", area: 25 },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [500, 500] },
        properties: { name: "Basin B", cn: 80, area: 15 },
      },
    ],
  });

  it("should import GeoJSON features as subcatchments", () => {
    const project = importGeoJSON(sampleGeoJSON);
    expect(project.nodes).toHaveLength(2);
    expect(project.nodes[0].type).toBe("subcatchment");
    expect(project.nodes[0].name).toBe("Basin A");
  });

  it("should use area from properties when provided", () => {
    const project = importGeoJSON(sampleGeoJSON);
    const sc = project.nodes[0];
    if (sc.type === "subcatchment") {
      expect(sc.data.subAreas[0].area).toBe(25);
    }
  });

  it("should export nodes as GeoJSON", () => {
    const project = importGeoJSON(sampleGeoJSON);
    const exported = exportGeoJSON(project);
    const parsed = JSON.parse(exported);
    expect(parsed.type).toBe("FeatureCollection");
    expect(parsed.features).toHaveLength(2);
    expect(parsed.features[0].properties.name).toBe("Basin A");
  });

  it("should roundtrip GeoJSON import/export", () => {
    const project = importGeoJSON(sampleGeoJSON);
    const exported = exportGeoJSON(project);
    // GeoJSON export uses Point geometry (diagram positions), not polygons
    const parsed = JSON.parse(exported);
    expect(parsed.features[0].properties.cn).toBe(75);
  });
});

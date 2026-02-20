/**
 * GeoJSON import/export for StormLab.
 */

import type { Project, ProjectNode } from "../model/project.js";

interface GeoJSONFeature { type: "Feature"; geometry: { type: string; coordinates: any }; properties: Record<string, any>; }
interface GeoJSONCollection { type: "FeatureCollection"; features: GeoJSONFeature[]; }

function polygonAreaSqFt(coords: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
  }
  return Math.abs(area) / 2;
}

export function importGeoJSON(geojsonText: string): Project {
  const geojson: GeoJSONCollection = JSON.parse(geojsonText);
  if (geojson.type !== "FeatureCollection") throw new Error("Expected a GeoJSON FeatureCollection");

  const nodes: ProjectNode[] = [];
  let yPos = 100;

  for (let i = 0; i < geojson.features.length; i++) {
    const feature = geojson.features[i];
    const p = feature.properties || {};
    const name = p.name || p.NAME || `Area ${i + 1}`;
    const cn = parseInt(p.cn || p.CN || "75");
    const soilGroup = (p.soil_group || p.HSG || "B").toUpperCase();
    const tc = parseFloat(p.tc || p.TC || "0.5");

    let area = parseFloat(p.area || p.AREA || "0");
    if (area === 0 && feature.geometry.type === "Polygon") {
      area = polygonAreaSqFt(feature.geometry.coordinates[0]) / 43560;
    }
    if (area === 0) area = 10;

    const id = `SC-${i + 1}`;
    nodes.push({ type: "subcatchment", id, name, position: { x: 300 + (i % 3) * 200, y: yPos },
      data: { id, name, subAreas: [{ description: p.description || name, soilGroup: soilGroup as "A" | "B" | "C" | "D", cn, area }], flowSegments: [], tcOverride: tc } });
    if (i % 3 === 2) yPos += 160;
  }

  return { id: `geojson-import-${Date.now()}`, name: "GeoJSON Import", description: "Imported from GeoJSON", nodes, links: [], events: [{ id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 }] };
}

export function exportGeoJSON(project: Project): string {
  const features: GeoJSONFeature[] = project.nodes.map((node) => {
    const props: Record<string, any> = { id: node.id, name: node.name, type: node.type };
    if (node.type === "subcatchment") {
      const totalArea = node.data.subAreas.reduce((s, a) => s + a.area, 0);
      props.area = totalArea;
      props.cn = Math.round(node.data.subAreas.reduce((s, a) => s + a.cn * a.area, 0) / totalArea);
      props.tc = node.data.tcOverride;
    }
    if (node.type === "pond") { props.initial_wse = node.data.initialWSE; props.outlets = node.data.outlets.length; }
    if (node.type === "reach") { props.length = node.data.length; props.mannings_n = node.data.manningsN; props.slope = node.data.slope; }

    return { type: "Feature" as const, geometry: { type: "Point", coordinates: [node.position.x, node.position.y] }, properties: props };
  });

  return JSON.stringify({ type: "FeatureCollection", features }, null, 2);
}

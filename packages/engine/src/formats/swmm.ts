/**
 * EPA SWMM .inp format import/export.
 *
 * Handles the text-based section format:
 *   [SUBCATCHMENTS], [SUBAREAS], [JUNCTIONS], [CONDUITS], [XSECTIONS], etc.
 */

import type { Project, ProjectNode, ProjectLink, SubcatchmentNode } from "../model/project.js";

// ─── SWMM .inp Parser ────────────────────────────────────────────

function parseSWMMSections(text: string): Map<string, string[][]> {
  const sections = new Map<string, string[][]>();
  let currentSection = "";
  let currentRows: string[][] = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;

    const sectionMatch = trimmed.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      if (currentSection) sections.set(currentSection, currentRows);
      currentSection = sectionMatch[1].toUpperCase();
      currentRows = [];
    } else if (currentSection) {
      const fields = trimmed.split(/\s+/);
      if (fields.length > 0) currentRows.push(fields);
    }
  }
  if (currentSection) sections.set(currentSection, currentRows);

  return sections;
}

/**
 * Import a SWMM .inp file into a StormLab project.
 */
export function importSWMM(inpText: string): Project {
  const sections = parseSWMMSections(inpText);
  const nodes: ProjectNode[] = [];
  const links: ProjectLink[] = [];

  const subcatchments = sections.get("SUBCATCHMENTS") ?? [];
  let yPos = 100;
  for (const row of subcatchments) {
    if (row.length < 5) continue;
    const [name, , outlet, areaStr, impervStr] = row;
    const area = parseFloat(areaStr) || 10;
    const imperv = parseFloat(impervStr) || 25;
    const cn = Math.min(98, Math.round(55 + 0.45 * imperv));
    const id = `SC-${name}`;

    nodes.push({
      type: "subcatchment",
      id,
      name,
      position: { x: 300, y: yPos },
      data: {
        id, name,
        subAreas: [{ description: `Imported (${imperv}% imperv)`, soilGroup: "B", cn, area }],
        flowSegments: [],
        tcOverride: 0.5,
      },
    });

    if (outlet) {
      links.push({ id: `L-${name}-${outlet}`, from: id, to: `J-${outlet}` });
    }
    yPos += 160;
  }

  const junctions = sections.get("JUNCTIONS") ?? [];
  let jYPos = 100 + subcatchments.length * 160;
  for (const row of junctions) {
    if (row.length < 2) continue;
    const [name] = row;
    const id = `J-${name}`;
    if (!nodes.find((n) => n.id === id)) {
      nodes.push({ type: "junction", id, name, position: { x: 500, y: jYPos } });
      jYPos += 140;
    }
  }

  const conduits = sections.get("CONDUITS") ?? [];
  for (const row of conduits) {
    if (row.length < 5) continue;
    const [name, fromNode, toNode, lengthStr, roughnessStr] = row;
    const reachId = `R-${name}`;

    nodes.push({
      type: "reach", id: reachId, name: `Reach ${name}`,
      position: { x: 400, y: jYPos },
      data: { length: parseFloat(lengthStr) || 500, manningsN: parseFloat(roughnessStr) || 0.013, slope: 0.005, shape: { type: "circular" as const, diameter: 2 } },
    });

    links.push({ id: `L-${fromNode}-${reachId}`, from: `J-${fromNode}`, to: reachId });
    links.push({ id: `L-${reachId}-${toNode}`, from: reachId, to: `J-${toNode}` });
    jYPos += 140;
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validLinks = links.filter((l) => nodeIds.has(l.from) && nodeIds.has(l.to));

  return {
    id: `swmm-import-${Date.now()}`, name: "SWMM Import",
    description: "Imported from EPA SWMM .inp file",
    nodes, links: validLinks,
    events: [{ id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 }],
  };
}

/**
 * Export a StormLab project as a SWMM .inp file.
 */
export function exportSWMM(project: Project): string {
  const lines: string[] = [];
  lines.push("[TITLE]", `;;${project.name}`, "");
  lines.push("[OPTIONS]", "FLOW_UNITS           CFS", "INFILTRATION         CURVE_NUMBER", "ROUTING_MODEL        KINWAVE", "");

  lines.push("[RAINGAGES]", ";;Name           Format  Interval  SCF  Source");
  lines.push("RG1              INTENSITY  0:05  1.0  TIMESERIES  TS1", "");

  const scs = project.nodes.filter((n): n is SubcatchmentNode => n.type === "subcatchment");
  if (scs.length > 0) {
    lines.push("[SUBCATCHMENTS]", ";;Name           Raingage        Outlet          Area     %Imperv  Width    Slope");
    for (const sc of scs) {
      const totalArea = sc.data.subAreas.reduce((s, a) => s + a.area, 0);
      const avgCN = sc.data.subAreas.reduce((s, a) => s + a.cn * a.area, 0) / totalArea;
      const imperv = Math.max(0, Math.min(100, Math.round((avgCN - 55) / 0.45)));
      const downstream = project.links.find((l) => l.from === sc.id);
      const outlet = downstream ? project.nodes.find((n) => n.id === downstream.to)?.name ?? "OUT" : "OUT";
      const width = Math.round(Math.sqrt(totalArea * 43560));
      lines.push(`${sc.name.padEnd(17)}RG1${"".padEnd(13)}${outlet.padEnd(16)}${totalArea.toFixed(1).padStart(8)}  ${String(imperv).padStart(7)}  ${String(width).padStart(7)}  0.50`);
    }
    lines.push("");

    lines.push("[INFILTRATION]", ";;Name           CurveNum   HydCon     DryTime");
    for (const sc of scs) {
      const totalArea = sc.data.subAreas.reduce((s, a) => s + a.area, 0);
      const avgCN = sc.data.subAreas.reduce((s, a) => s + a.cn * a.area, 0) / totalArea;
      lines.push(`${sc.name.padEnd(17)}${avgCN.toFixed(0).padStart(8)}   0.5        7`);
    }
    lines.push("");
  }

  const juncs = project.nodes.filter((n) => n.type === "junction");
  if (juncs.length > 0) {
    lines.push("[JUNCTIONS]", ";;Name           Elevation  MaxDepth   InitDepth  SurDepth   Aponded");
    for (const j of juncs) lines.push(`${j.name.padEnd(17)}100.0      10.0       0.0        0.0        0`);
    lines.push("");
  }

  lines.push("[OUTFALLS]", ";;Name           Elevation  Type       Stage", "OUT              95.0       FREE       NO", "");

  const reaches = project.nodes.filter((n) => n.type === "reach");
  if (reaches.length > 0) {
    lines.push("[CONDUITS]", ";;Name           FromNode        ToNode          Length     Roughness  InOffset   OutOffset");
    for (const r of reaches) {
      if (r.type !== "reach") continue;
      const up = project.links.find((l) => l.to === r.id);
      const dn = project.links.find((l) => l.from === r.id);
      const from = up ? project.nodes.find((n) => n.id === up.from)?.name ?? "J1" : "J1";
      const to = dn ? project.nodes.find((n) => n.id === dn.to)?.name ?? "OUT" : "OUT";
      lines.push(`${r.name.padEnd(17)}${from.padEnd(16)}${to.padEnd(16)}${r.data.length.toFixed(0).padStart(10)}  ${r.data.manningsN.toFixed(3).padStart(9)}  0          0`);
    }
    lines.push("");

    lines.push("[XSECTIONS]", ";;Link           Shape        Geom1      Geom2      Geom3      Geom4");
    for (const r of reaches) {
      if (r.type !== "reach") continue;
      const s = r.data.shape;
      if (s.type === "circular") lines.push(`${r.name.padEnd(17)}CIRCULAR     ${s.diameter.toFixed(1).padStart(10)}  0          0          0`);
      else if (s.type === "trapezoidal") lines.push(`${r.name.padEnd(17)}TRAPEZOIDAL  ${(2).toFixed(1).padStart(10)}  ${s.bottomWidth.toFixed(1).padStart(10)}  ${s.sideSlope.toFixed(1).padStart(10)}  ${s.sideSlope.toFixed(1).padStart(10)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

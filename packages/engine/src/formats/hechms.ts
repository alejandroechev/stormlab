/**
 * HEC-HMS .basin file import/export.
 */

import type { Project, ProjectNode, ProjectLink } from "../model/project.js";

interface HMSElement {
  type: string;
  name: string;
  properties: Map<string, string>;
}

function parseHMSBasin(text: string): HMSElement[] {
  const elements: HMSElement[] = [];
  let current: HMSElement | null = null;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;
    if (trimmed === "End:") { if (current) { elements.push(current); current = null; } continue; }

    const elMatch = trimmed.match(/^(Basin|Subbasin|Reach|Junction|Reservoir|Sink|Diversion):\s*(.+)/i);
    if (elMatch) {
      if (current) elements.push(current);
      current = { type: elMatch[1].toLowerCase(), name: elMatch[2].trim(), properties: new Map() };
      continue;
    }

    if (current) {
      const propMatch = trimmed.match(/^([^:]+):\s*(.*)/);
      if (propMatch) current.properties.set(propMatch[1].trim().toLowerCase(), propMatch[2].trim());
    }
  }
  if (current) elements.push(current);
  return elements;
}

export function importHECHMS(basinText: string): Project {
  const elements = parseHMSBasin(basinText);
  const nodes: ProjectNode[] = [];
  const links: ProjectLink[] = [];
  let yPos = 100;

  for (const el of elements) {
    if (el.type === "basin") continue;
    const downstream = el.properties.get("downstream");

    if (el.type === "subbasin") {
      const area = parseFloat(el.properties.get("area") ?? "10");
      const cn = parseInt(el.properties.get("curve number") ?? "75");
      const tc = parseFloat(el.properties.get("lag") ?? "30") / 60;
      const id = `SC-${el.name.replace(/\s+/g, "_")}`;
      nodes.push({ type: "subcatchment", id, name: el.name, position: { x: 300, y: yPos },
        data: { id, name: el.name, subAreas: [{ description: el.name, soilGroup: "B", cn, area }], flowSegments: [], tcOverride: tc || 0.5 } });
      if (downstream) links.push({ id: `L-${id}-${downstream.replace(/\s+/g, "_")}`, from: id, to: downstream.replace(/\s+/g, "_") });
      yPos += 160;
    }

    if (el.type === "junction" || el.type === "sink") {
      const id = el.name.replace(/\s+/g, "_");
      nodes.push({ type: "junction", id, name: el.name, position: { x: 500, y: yPos } });
      if (downstream) links.push({ id: `L-${id}-${downstream.replace(/\s+/g, "_")}`, from: id, to: downstream.replace(/\s+/g, "_") });
      yPos += 140;
    }

    if (el.type === "reach") {
      const id = `R-${el.name.replace(/\s+/g, "_")}`;
      nodes.push({ type: "reach", id, name: el.name, position: { x: 400, y: yPos },
        data: { length: parseFloat(el.properties.get("length") ?? "1000"), manningsN: parseFloat(el.properties.get("manning's n") ?? "0.035"), slope: parseFloat(el.properties.get("slope") ?? "0.005"), shape: { type: "trapezoidal" as const, bottomWidth: 6, sideSlope: 2 } } });
      if (downstream) links.push({ id: `L-${id}-${downstream.replace(/\s+/g, "_")}`, from: id, to: downstream.replace(/\s+/g, "_") });
      yPos += 140;
    }

    if (el.type === "reservoir") {
      const id = `P-${el.name.replace(/\s+/g, "_")}`;
      nodes.push({ type: "pond", id, name: el.name, position: { x: 400, y: yPos },
        data: { stageStorage: [{ stage: 100, storage: 0 }, { stage: 105, storage: 25000 }, { stage: 110, storage: 60000 }], outlets: [{ type: "orifice" as const, coefficient: 0.6, diameter: 1.0, centerElevation: 100.5 }], initialWSE: 100 } });
      if (downstream) links.push({ id: `L-${id}-${downstream.replace(/\s+/g, "_")}`, from: id, to: downstream.replace(/\s+/g, "_") });
      yPos += 160;
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const nodesByName = new Map(nodes.map((n) => [n.name.replace(/\s+/g, "_"), n.id]));
  const validLinks = links
    .map((l) => ({ ...l, from: nodeIds.has(l.from) ? l.from : nodesByName.get(l.from) ?? l.from, to: nodeIds.has(l.to) ? l.to : nodesByName.get(l.to) ?? l.to }))
    .filter((l) => nodeIds.has(l.from) && nodeIds.has(l.to));

  return { id: `hms-import-${Date.now()}`, name: "HEC-HMS Import", description: "Imported from HEC-HMS .basin file", nodes, links: validLinks, events: [{ id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 }] };
}

export function exportHECHMS(project: Project): string {
  const lines: string[] = [];
  lines.push(`Basin: ${project.name}`, `  Description: ${project.description || "Exported from StormLab"}`, `  End:`, "");

  for (const node of project.nodes) {
    const dn = project.links.find((l) => l.from === node.id);
    const dnName = dn ? project.nodes.find((n) => n.id === dn.to)?.name : undefined;

    if (node.type === "subcatchment") {
      const totalArea = node.data.subAreas.reduce((s, a) => s + a.area, 0);
      const avgCN = node.data.subAreas.reduce((s, a) => s + a.cn * a.area, 0) / totalArea;
      lines.push(`Subbasin: ${node.name}`, `  Area: ${totalArea.toFixed(1)}`, `  Curve Number: ${Math.round(avgCN)}`, `  Lag: ${((node.data.tcOverride ?? 0.5) * 60 * 0.6).toFixed(1)}`);
      if (dnName) lines.push(`  Downstream: ${dnName}`);
      lines.push(`  End:`, "");
    }
    if (node.type === "junction") { lines.push(`Junction: ${node.name}`); if (dnName) lines.push(`  Downstream: ${dnName}`); lines.push(`  End:`, ""); }
    if (node.type === "reach") { lines.push(`Reach: ${node.name}`, `  Length: ${node.data.length}`, `  Manning's n: ${node.data.manningsN}`, `  Slope: ${node.data.slope}`); if (dnName) lines.push(`  Downstream: ${dnName}`); lines.push(`  End:`, ""); }
    if (node.type === "pond") { lines.push(`Reservoir: ${node.name}`); if (dnName) lines.push(`  Downstream: ${dnName}`); lines.push(`  End:`, ""); }
  }
  return lines.join("\n");
}

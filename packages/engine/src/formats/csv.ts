/**
 * CSV Import/Export for StormLab projects.
 *
 * Supports:
 * - Subcatchment data import (name, area, CN, soil group, Tc)
 * - Full project data export (nodes, links, results)
 * - Simulation results export
 */

import type { Project, SubcatchmentNode, NodeResult } from "../model/project.js";

// ─── CSV Parsing Utilities ────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase().trim());
  const rows = lines.slice(1).map(parseCSVRow);
  return { headers, rows };
}

function toCSVValue(val: string | number | undefined): string {
  if (val === undefined || val === null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSVRow(values: (string | number | undefined)[]): string {
  return values.map(toCSVValue).join(",");
}

// ─── Subcatchment CSV Import ──────────────────────────────────────

export interface SubcatchmentCSVRow {
  name: string;
  area: number;
  cn: number;
  soilGroup: string;
  tc: number;
  description: string;
}

/**
 * Parse a CSV file into subcatchment data rows.
 * Expected columns (case-insensitive, order-independent):
 *   name, area, cn, soil_group (or soilgroup or soil), tc, description (optional)
 */
export function parseSubcatchmentCSV(csvText: string): SubcatchmentCSVRow[] {
  const { headers, rows } = parseCSV(csvText);

  const nameIdx = headers.findIndex((h) => h === "name");
  const areaIdx = headers.findIndex((h) => h === "area");
  const cnIdx = headers.findIndex((h) => h === "cn");
  const soilIdx = headers.findIndex((h) =>
    ["soil_group", "soilgroup", "soil", "hsg"].includes(h),
  );
  const tcIdx = headers.findIndex((h) => h === "tc");
  const descIdx = headers.findIndex((h) =>
    ["description", "desc", "landuse", "land_use"].includes(h),
  );

  if (nameIdx === -1) throw new Error("CSV must have a 'name' column");
  if (areaIdx === -1) throw new Error("CSV must have an 'area' column");
  if (cnIdx === -1) throw new Error("CSV must have a 'cn' column");

  return rows
    .filter((r) => r[nameIdx]?.trim())
    .map((r) => ({
      name: r[nameIdx] || "Unnamed",
      area: parseFloat(r[areaIdx]) || 0,
      cn: parseInt(r[cnIdx]) || 75,
      soilGroup: (r[soilIdx] || "B").toUpperCase(),
      tc: tcIdx >= 0 ? parseFloat(r[tcIdx]) || 0.5 : 0.5,
      description: descIdx >= 0 ? r[descIdx] || "" : "",
    }));
}

/**
 * Convert parsed CSV rows into StormLab subcatchment nodes.
 */
export function csvRowsToSubcatchmentNodes(
  rows: SubcatchmentCSVRow[],
  startX: number = 400,
  startY: number = 100,
  spacingY: number = 160,
): SubcatchmentNode[] {
  return rows.map((row, i) => {
    const id = `SC-${i + 1}`;
    return {
      type: "subcatchment" as const,
      id,
      name: row.name,
      position: { x: startX, y: startY + i * spacingY },
      data: {
        id,
        name: row.name,
        subAreas: [
          {
            description: row.description || row.name,
            soilGroup: row.soilGroup as "A" | "B" | "C" | "D",
            cn: row.cn,
            area: row.area,
          },
        ],
        flowSegments: [],
        tcOverride: row.tc,
      },
    };
  });
}

// ─── Project Data Export to CSV ────────────────────────────────────

/**
 * Export all subcatchment data from a project as CSV.
 */
export function exportSubcatchmentsCSV(project: Project): string {
  const header = "name,area,cn,soil_group,tc,description";
  const rows = project.nodes
    .filter((n): n is SubcatchmentNode => n.type === "subcatchment")
    .flatMap((node) =>
      node.data.subAreas.map((sa) =>
        toCSVRow([
          node.name,
          sa.area,
          sa.cn,
          sa.soilGroup,
          node.data.tcOverride ?? "",
          sa.description,
        ]),
      ),
    );
  return [header, ...rows].join("\n");
}

/**
 * Export simulation results as CSV.
 */
export function exportResultsCSV(
  project: Project,
  results: Map<string, NodeResult>,
  eventLabel: string,
): string {
  const header =
    "event,node,type,peak_inflow_cfs,peak_outflow_cfs,time_to_peak_hr,volume_acft,peak_stage_ft";
  const rows = project.nodes.map((node) => {
    const r = results.get(node.id);
    if (!r) return toCSVRow([eventLabel, node.name, node.type]);
    return toCSVRow([
      eventLabel,
      node.name,
      node.type,
      r.peakInflow?.toFixed(2),
      r.peakOutflow.toFixed(2),
      r.timeToPeakOutflow.toFixed(2),
      r.totalVolume.toFixed(2),
      r.peakStage?.toFixed(2),
    ]);
  });
  return [header, ...rows].join("\n");
}

/**
 * Export all events' results as a single CSV.
 */
export function exportAllResultsCSV(
  project: Project,
  allResults: Map<string, Map<string, NodeResult>>,
): string {
  const header =
    "event,node,type,peak_inflow_cfs,peak_outflow_cfs,time_to_peak_hr,volume_acft,peak_stage_ft";
  const rows: string[] = [];

  for (const event of project.events) {
    const results = allResults.get(event.id);
    if (!results) continue;
    for (const node of project.nodes) {
      const r = results.get(node.id);
      if (!r) continue;
      rows.push(
        toCSVRow([
          event.label,
          node.name,
          node.type,
          r.peakInflow?.toFixed(2),
          r.peakOutflow.toFixed(2),
          r.timeToPeakOutflow.toFixed(2),
          r.totalVolume.toFixed(2),
          r.peakStage?.toFixed(2),
        ]),
      );
    }
  }

  return [header, ...rows].join("\n");
}

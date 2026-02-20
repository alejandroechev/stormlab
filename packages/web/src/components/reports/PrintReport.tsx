/**
 * Print-friendly report view — opens in a new window for PDF export via browser Print.
 */
import { useEditorStore } from "../../store/editor-store";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";

function generateReportHTML(): string {
  const state = useEditorStore.getState();
  const { project, results, activeEventId } = state;

  if (!activeEventId) return "";
  const eventResults = results.get(activeEventId);
  if (!eventResults) return "";

  const event = project.events.find((e) => e.id === activeEventId);

  return `report-ready`;
}

export function openPrintReport() {
  const state = useEditorStore.getState();
  const { project, results, activeEventId } = state;

  if (!activeEventId || !results.get(activeEventId)) {
    alert("Run a simulation first before generating a report.");
    return;
  }

  const eventResults = results.get(activeEventId)!;
  const event = project.events.find((e) => e.id === activeEventId);

  // Build the summary rows
  const rows = project.nodes
    .map((node) => {
      const r = eventResults.get(node.id);
      if (!r) return "";
      return `<tr>
        <td>${node.name}</td>
        <td>${node.type}</td>
        <td>${r.peakInflow !== undefined ? r.peakInflow.toFixed(1) : "—"}</td>
        <td><strong>${r.peakOutflow.toFixed(1)}</strong></td>
        <td>${r.timeToPeakOutflow.toFixed(2)}</td>
        <td>${r.totalVolume.toFixed(2)}</td>
        <td>${r.peakStage !== undefined ? r.peakStage.toFixed(2) : "—"}</td>
      </tr>`;
    })
    .join("\n");

  // Multi-event comparison table
  const allEvents = project.events.map((ev) => {
    const evResults = results.get(ev.id);
    if (!evResults) return null;
    return { event: ev, results: evResults };
  }).filter(Boolean);

  const comparisonRows = project.nodes.map((node) => {
    const cells = allEvents.map((er) => {
      if (!er) return "<td>—</td>";
      const r = er.results.get(node.id);
      return `<td>${r ? r.peakOutflow.toFixed(1) : "—"}</td>`;
    }).join("");
    return `<tr><td>${node.name}</td><td>${node.type}</td>${cells}</tr>`;
  }).join("\n");

  const comparisonHeader = allEvents
    .map((er) => `<th>${er?.event.label}</th>`)
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${project.name} — Drainage Report</title>
  <style>
    @media print { body { margin: 0.5in; } }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #222; max-width: 8.5in; margin: 0 auto; padding: 24px; }
    h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 16px; color: #555; margin-top: 32px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    h3 { font-size: 14px; color: #666; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th, td { padding: 6px 10px; border: 1px solid #ddd; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    td strong { color: #c0392b; }
    .meta { color: #888; font-size: 12px; margin-bottom: 4px; }
    .node-detail { page-break-inside: avoid; margin-top: 16px; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 11px; color: #aaa; }
    @media print {
      h2 { page-break-before: auto; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #f0f0f0; padding: 12px; margin-bottom: 24px; border-radius: 6px; text-align: center;">
    <strong>Use your browser's Print function (Ctrl+P) to save as PDF.</strong>
  </div>

  <h1>${project.name}</h1>
  <p class="meta">${project.description || "Stormwater Drainage Report"}</p>
  <p class="meta">Generated: ${new Date().toLocaleDateString()} | Event: ${event?.label ?? activeEventId}</p>

  <h2>Project Summary — ${event?.label}</h2>
  <table>
    <thead>
      <tr>
        <th>Node</th>
        <th>Type</th>
        <th>Peak Q<sub>in</sub> (cfs)</th>
        <th>Peak Q<sub>out</sub> (cfs)</th>
        <th>T<sub>peak</sub> (hr)</th>
        <th>Volume (ac-ft)</th>
        <th>Peak Stage (ft)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  ${allEvents.length > 1 ? `
  <h2>Multi-Event Comparison — Peak Outflow (cfs)</h2>
  <table>
    <thead>
      <tr>
        <th>Node</th>
        <th>Type</th>
        ${comparisonHeader}
      </tr>
    </thead>
    <tbody>
      ${comparisonRows}
    </tbody>
  </table>
  ` : ""}

  <h2>Node Details</h2>
  ${project.nodes.map((node) => {
    const r = eventResults.get(node.id);
    if (!r) return "";

    let details = "";
    if (node.type === "subcatchment") {
      const totalArea = node.data.subAreas.reduce((s: number, a: { area: number }) => s + a.area, 0);
      details = `
        <p>Drainage Area: ${totalArea.toFixed(1)} acres | Tc: ${node.data.tcOverride ?? "computed"} hr</p>
        <table>
          <thead><tr><th>Land Use</th><th>Soil Group</th><th>CN</th><th>Area (ac)</th></tr></thead>
          <tbody>
            ${node.data.subAreas.map((sa: any) =>
              `<tr><td>${sa.description}</td><td>${sa.soilGroup}</td><td>${sa.cn}</td><td>${sa.area}</td></tr>`
            ).join("")}
          </tbody>
        </table>
      `;
    }
    if (node.type === "pond") {
      details = `
        <p>Initial WSE: ${node.data.initialWSE} ft | Max Storage: ${node.data.stageStorage[node.data.stageStorage.length - 1]?.storage?.toLocaleString() ?? "—"} cu ft</p>
        <p>Outlets: ${node.data.outlets.length} structure(s)</p>
        ${r.peakStage !== undefined ? `<p>Peak Stage: <strong>${r.peakStage.toFixed(2)} ft</strong></p>` : ""}
        ${r.peakInflow !== undefined ? `<p>Peak Inflow: ${r.peakInflow.toFixed(1)} cfs → Peak Outflow: <strong>${r.peakOutflow.toFixed(1)} cfs</strong> (${((1 - r.peakOutflow / r.peakInflow) * 100).toFixed(0)}% reduction)</p>` : ""}
      `;
    }
    if (node.type === "reach") {
      details = `<p>Length: ${node.data.length} ft | Slope: ${node.data.slope} ft/ft | n: ${node.data.manningsN}</p>`;
    }

    return `
      <div class="node-detail">
        <h3>${node.name} (${node.type})</h3>
        ${details}
        <p>Peak Outflow: <strong>${r.peakOutflow.toFixed(1)} cfs</strong> at T=${r.timeToPeakOutflow.toFixed(2)} hr | Volume: ${r.totalVolume.toFixed(2)} ac-ft</p>
      </div>
    `;
  }).join("")}

  <div class="footer">
    Report generated by StormLab — hydrology engine validated against TR-55 worked examples.
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

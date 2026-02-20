/**
 * Summary Report — project-wide results table.
 */
import { useEditorStore } from "../../store/editor-store";
import { HydrographChart } from "./HydrographChart";

export function SummaryReport() {
  const project = useEditorStore((s) => s.project);
  const results = useEditorStore((s) => s.results);
  const activeEventId = useEditorStore((s) => s.activeEventId);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);

  if (!activeEventId) return null;
  const eventResults = results.get(activeEventId);
  if (!eventResults) return null;

  const event = project.events.find((e) => e.id === activeEventId);

  return (
    <div style={{ padding: 12 }}>
      <h3
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        Summary — {event?.label ?? activeEventId}
      </h3>

      <table
        style={{
          width: "100%",
          fontSize: 11,
          borderCollapse: "collapse",
          marginBottom: 12,
        }}
      >
        <thead>
          <tr>
            {["Node", "Type", "Q_in", "Q_out", "T_peak", "Volume", "Stage"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid var(--border)",
                    textAlign: "left",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {project.nodes.map((node) => {
            const r = eventResults.get(node.id);
            if (!r) return null;
            return (
              <tr
                key={node.id}
                style={{
                  background:
                    selectedNodeId === node.id
                      ? "rgba(233,69,96,0.15)"
                      : "transparent",
                }}
              >
                <td style={{ padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>
                  {node.name}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {node.type}
                </td>
                <td style={{ padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>
                  {r.peakInflow !== undefined ? r.peakInflow.toFixed(1) : "—"}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid var(--border)",
                    fontWeight: 600,
                    color: "var(--accent)",
                  }}
                >
                  {r.peakOutflow.toFixed(1)}
                </td>
                <td style={{ padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>
                  {r.timeToPeakOutflow.toFixed(2)}
                </td>
                <td style={{ padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>
                  {r.totalVolume.toFixed(2)}
                </td>
                <td style={{ padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>
                  {r.peakStage !== undefined ? r.peakStage.toFixed(2) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Show hydrograph for selected node */}
      {selectedNodeId && <HydrographChart nodeId={selectedNodeId} />}
    </div>
  );
}

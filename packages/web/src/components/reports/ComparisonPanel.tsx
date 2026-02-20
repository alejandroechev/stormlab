/**
 * Pre/Post Development Comparison Panel
 *
 * Shows a side-by-side delta table comparing baseline (pre-development)
 * results against current (post-development) results for each node and event.
 */
import { useEditorStore } from "../../store/editor-store";

function pctChange(pre: number, post: number): string {
  if (pre === 0) return post === 0 ? "—" : "+∞";
  const pct = ((post - pre) / pre) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function deltaColor(pre: number, post: number): string {
  if (post > pre) return "var(--selected-stroke)"; // red = increased (worse)
  if (post < pre) return "var(--node-pond)"; // green = decreased (better)
  return "var(--text-muted)";
}

export function ComparisonPanel() {
  const project = useEditorStore((s) => s.project);
  const results = useEditorStore((s) => s.results);
  const activeEventId = useEditorStore((s) => s.activeEventId);
  const baselineProject = useEditorStore((s) => s.baselineProject);
  const baselineResults = useEditorStore((s) => s.baselineResults);
  const saveAsBaseline = useEditorStore((s) => s.saveAsBaseline);
  const clearBaseline = useEditorStore((s) => s.clearBaseline);

  if (!baselineProject) {
    return (
      <div style={{ padding: 12 }}>
        <h3
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          Pre/Post Comparison
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
          Save the current state as the <strong>pre-development baseline</strong>,
          then modify the project (add impervious areas, change CNs, add ponds)
          and run the simulation again to see the comparison.
        </p>
        <button
          onClick={saveAsBaseline}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            background: "var(--accent)",
            border: "none",
            borderRadius: 5,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          📌 Save as Pre-Development Baseline
        </button>
      </div>
    );
  }

  // We have a baseline — show the comparison
  if (!activeEventId) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "var(--text-muted)" }}>
        Run a simulation to see comparison results.
      </div>
    );
  }

  const currentResults = results.get(activeEventId);
  const baseResults = baselineResults.get(activeEventId);
  const event = project.events.find((e) => e.id === activeEventId);

  if (!currentResults || !baseResults) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "var(--text-muted)" }}>
        Run simulation on both pre and post conditions to see comparison.
        <br />
        <button
          onClick={clearBaseline}
          style={{
            marginTop: 8,
            padding: "4px 10px",
            fontSize: 11,
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          Clear Baseline
        </button>
      </div>
    );
  }

  // Match nodes by name (pre and post may have different node IDs)
  const baseNodesByName = new Map(
    baselineProject.nodes.map((n) => [n.name, n]),
  );

  const rows = project.nodes
    .map((node) => {
      const postR = currentResults.get(node.id);
      const baseNode = baseNodesByName.get(node.name);
      const preR = baseNode ? baseResults.get(baseNode.id) : undefined;
      return { node, preR, postR };
    })
    .filter((r) => r.postR);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            fontWeight: 600,
            margin: 0,
          }}
        >
          Pre/Post — {event?.label}
        </h3>
        <button
          onClick={clearBaseline}
          style={{
            fontSize: 10,
            padding: "2px 8px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      <table
        style={{
          width: "100%",
          fontSize: 10,
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Node</th>
            <th style={thStyle}>Pre Q<sub>out</sub></th>
            <th style={thStyle}>Post Q<sub>out</sub></th>
            <th style={thStyle}>Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ node, preR, postR }) => (
            <tr key={node.id}>
              <td style={tdStyle}>{node.name}</td>
              <td style={tdStyle}>
                {preR ? preR.peakOutflow.toFixed(1) : "—"}
              </td>
              <td style={tdStyle}>
                <strong>{postR!.peakOutflow.toFixed(1)}</strong>
              </td>
              <td
                style={{
                  ...tdStyle,
                  fontWeight: 600,
                  color: preR
                    ? deltaColor(preR.peakOutflow, postR!.peakOutflow)
                    : "var(--text-muted)",
                }}
              >
                {preR
                  ? pctChange(preR.peakOutflow, postR!.peakOutflow)
                  : "new"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Volume comparison */}
      <table
        style={{
          width: "100%",
          fontSize: 10,
          borderCollapse: "collapse",
          marginTop: 12,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Node</th>
            <th style={thStyle}>Pre Vol</th>
            <th style={thStyle}>Post Vol</th>
            <th style={thStyle}>Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ node, preR, postR }) => (
            <tr key={node.id}>
              <td style={tdStyle}>{node.name}</td>
              <td style={tdStyle}>
                {preR ? preR.totalVolume.toFixed(2) : "—"}
              </td>
              <td style={tdStyle}>
                <strong>{postR!.totalVolume.toFixed(2)}</strong>
              </td>
              <td
                style={{
                  ...tdStyle,
                  fontWeight: 600,
                  color: preR
                    ? deltaColor(preR.totalVolume, postR!.totalVolume)
                    : "var(--text-muted)",
                }}
              >
                {preR
                  ? pctChange(preR.totalVolume, postR!.totalVolume)
                  : "new"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "4px 6px",
  borderBottom: "1px solid var(--border)",
  textAlign: "left",
  color: "var(--text-muted)",
  fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: "4px 6px",
  borderBottom: "1px solid var(--border)",
};

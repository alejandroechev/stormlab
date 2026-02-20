/**
 * Hydrograph Chart — renders inflow/outflow time series for a selected node.
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useEditorStore } from "../../store/editor-store";

export function HydrographChart({ nodeId }: { nodeId: string }) {
  const results = useEditorStore((s) => s.results);
  const activeEventId = useEditorStore((s) => s.activeEventId);
  const nodes = useEditorStore((s) => s.project.nodes);

  if (!activeEventId) return null;
  const eventResults = results.get(activeEventId);
  if (!eventResults) return null;
  const nodeResult = eventResults.get(nodeId);
  if (!nodeResult || nodeResult.outflowHydrograph.length === 0) return null;

  const node = nodes.find((n) => n.id === nodeId);

  // Downsample for rendering (max 200 points)
  const hg = nodeResult.outflowHydrograph;
  const step = Math.max(1, Math.floor(hg.length / 200));
  const data = hg
    .filter((_, i) => i % step === 0 || i === hg.length - 1)
    .map((p) => ({
      time: Number(p.time.toFixed(2)),
      flow: Number(p.flow.toFixed(1)),
    }));

  return (
    <div style={{ marginTop: 12 }}>
      <h4 style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>
        {node?.name ?? nodeId} — Outflow Hydrograph
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
          <XAxis
            dataKey="time"
            label={{ value: "Time (hr)", position: "bottom", offset: -2, fill: "#999", fontSize: 10 }}
            tick={{ fontSize: 10, fill: "#999" }}
            stroke="#2a2a4a"
          />
          <YAxis
            label={{ value: "Flow (cfs)", angle: -90, position: "insideLeft", fill: "#999", fontSize: 10 }}
            tick={{ fontSize: 10, fill: "#999" }}
            stroke="#2a2a4a"
          />
          <Tooltip
            contentStyle={{ background: "#16213e", border: "1px solid #2a2a4a", fontSize: 12 }}
            labelFormatter={(v) => `${v} hr`}
          />
          <Line
            type="monotone"
            dataKey="flow"
            stroke="#e94560"
            dot={false}
            strokeWidth={1.5}
            name="Outflow"
          />
          <ReferenceLine
            y={nodeResult.peakOutflow}
            stroke="#e94560"
            strokeDasharray="3 3"
            strokeWidth={0.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

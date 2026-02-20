/**
 * Pond Geometry Editor — visual editor for stage-storage configuration.
 */
import { useState, useCallback } from "react";
import {
  prismaticStageStorage,
  conicalStageStorage,
  cylindricalStageStorage,
  type StageStoragePoint,
} from "@stormlab/engine";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useEditorStore } from "../../store/editor-store";

type PondShape = "prismatic" | "conical" | "cylindrical" | "custom";

interface PondGeometryEditorProps {
  stageStorage: StageStoragePoint[];
  baseElevation: number;
  onChange: (curve: StageStoragePoint[]) => void;
}

export function PondGeometryEditor({
  stageStorage,
  baseElevation,
  onChange,
}: PondGeometryEditorProps) {
  // Subscribe to theme so Recharts re-renders with correct resolved colors
  useEditorStore((s) => s.theme);
  const _cs = getComputedStyle(document.documentElement);
  const cv = (v: string) => _cs.getPropertyValue(v).trim();

  const [shape, setShape] = useState<PondShape>("prismatic");
  const [length, setLength] = useState(100);
  const [width, setWidth] = useState(50);
  const [depth, setDepth] = useState(8);
  const [sideSlope, setSideSlope] = useState(2);
  const [radius, setRadius] = useState(20);

  const generate = useCallback(() => {
    let curve: StageStoragePoint[];
    switch (shape) {
      case "prismatic":
        curve = prismaticStageStorage(length, width, depth, sideSlope, baseElevation, 20);
        break;
      case "conical":
        curve = conicalStageStorage(radius, depth, baseElevation, 20);
        break;
      case "cylindrical":
        curve = cylindricalStageStorage(radius, depth, baseElevation, 20);
        break;
      default:
        return;
    }
    onChange(curve);
  }, [shape, length, width, depth, sideSlope, radius, baseElevation, onChange]);

  // Chart data from current stage-storage curve
  const chartData = stageStorage.map((p) => ({
    stage: Number(p.stage.toFixed(2)),
    storage: Math.round(p.storage),
  }));

  return (
    <div style={{ fontSize: 12 }}>
      <div className="prop-group">
        <label>Pond Shape</label>
        <select
          value={shape}
          onChange={(e) => setShape(e.target.value as PondShape)}
          style={{ width: "100%", background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 6px" }}
        >
          <option value="prismatic">Rectangular / Trapezoidal</option>
          <option value="conical">Conical</option>
          <option value="cylindrical">Cylindrical</option>
          <option value="custom">Custom (manual entry)</option>
        </select>
      </div>

      {shape === "prismatic" && (
        <>
          <div className="prop-row">
            <div className="prop-group">
              <label>Bottom Length (ft)</label>
              <input type="number" value={length} onChange={(e) => setLength(Number(e.target.value))} />
            </div>
            <div className="prop-group">
              <label>Bottom Width (ft)</label>
              <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            </div>
          </div>
          <div className="prop-row">
            <div className="prop-group">
              <label>Max Depth (ft)</label>
              <input type="number" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
            </div>
            <div className="prop-group">
              <label>Side Slope (H:V)</label>
              <input type="number" step="0.5" value={sideSlope} onChange={(e) => setSideSlope(Number(e.target.value))} />
            </div>
          </div>
        </>
      )}

      {(shape === "conical" || shape === "cylindrical") && (
        <div className="prop-row">
          <div className="prop-group">
            <label>{shape === "conical" ? "Top Radius" : "Radius"} (ft)</label>
            <input type="number" value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          </div>
          <div className="prop-group">
            <label>Max Depth (ft)</label>
            <input type="number" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
          </div>
        </div>
      )}

      {shape !== "custom" && (
        <button
          onClick={generate}
          style={{ marginTop: 8, marginBottom: 12, padding: "4px 12px", fontSize: 12, background: "var(--accent)", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}
        >
          Generate Stage-Storage
        </button>
      )}

      {/* Stage-Storage Chart */}
      {chartData.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Stage-Storage Curve ({chartData.length} points)
          </label>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cv('--border')} />
              <XAxis
                dataKey="storage"
                tick={{ fontSize: 9, fill: cv('--text-muted') }}
                stroke={cv('--border')}
                label={{ value: "Storage (cu ft)", position: "bottom", offset: -2, fill: cv('--text-muted'), fontSize: 9 }}
              />
              <YAxis
                dataKey="stage"
                tick={{ fontSize: 9, fill: cv('--text-muted') }}
                stroke={cv('--border')}
                label={{ value: "Stage (ft)", angle: -90, position: "insideLeft", fill: cv('--text-muted'), fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{ background: cv('--surface'), border: `1px solid ${cv('--border')}`, fontSize: 11 }}
              />
              <Line type="monotone" dataKey="stage" stroke={cv('--node-pond')} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Numeric summary */}
      {chartData.length > 1 && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Max storage: {chartData[chartData.length - 1].storage.toLocaleString()} cu ft
          ({(chartData[chartData.length - 1].storage / 43560).toFixed(2)} ac-ft)
        </div>
      )}
    </div>
  );
}

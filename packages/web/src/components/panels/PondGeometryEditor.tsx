/**
 * Pond Geometry Editor — visual editor for stage-storage configuration.
 */
import { useState, useCallback } from "react";
import {
  prismaticStageStorage,
  conicalStageStorage,
  cylindricalStageStorage,
  type StageStoragePoint,
} from "@hydrocad/engine";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

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
          style={{ width: "100%", background: "#0f3460", color: "#eee", border: "1px solid #2a2a4a", borderRadius: 4, padding: "4px 6px" }}
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
          style={{ marginTop: 8, marginBottom: 12, padding: "4px 12px", fontSize: 12, background: "#e94560", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}
        >
          Generate Stage-Storage
        </button>
      )}

      {/* Stage-Storage Chart */}
      {chartData.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>
            Stage-Storage Curve ({chartData.length} points)
          </label>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis
                dataKey="storage"
                tick={{ fontSize: 9, fill: "#999" }}
                stroke="#2a2a4a"
                label={{ value: "Storage (cu ft)", position: "bottom", offset: -2, fill: "#999", fontSize: 9 }}
              />
              <YAxis
                dataKey="stage"
                tick={{ fontSize: 9, fill: "#999" }}
                stroke="#2a2a4a"
                label={{ value: "Stage (ft)", angle: -90, position: "insideLeft", fill: "#999", fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{ background: "#16213e", border: "1px solid #2a2a4a", fontSize: 11 }}
              />
              <Line type="monotone" dataKey="stage" stroke="#22c55e" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Numeric summary */}
      {chartData.length > 1 && (
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          Max storage: {chartData[chartData.length - 1].storage.toLocaleString()} cu ft
          ({(chartData[chartData.length - 1].storage / 43560).toFixed(2)} ac-ft)
        </div>
      )}
    </div>
  );
}

/**
 * Goal-Seek Panel — find orifice diameter to achieve target outflow.
 */
import { useState, useCallback } from "react";
import { useEditorStore } from "../../store/editor-store";
import { goalSeekOrificeDiameter, sweepOrificeDiameter } from "@hydrocad/engine";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

export function GoalSeekPanel() {
  const project = useEditorStore((s) => s.project);
  const activeEventId = useEditorStore((s) => s.activeEventId);
  const results = useEditorStore((s) => s.results);

  const [targetFlow, setTargetFlow] = useState(20);
  const [selectedPondId, setSelectedPondId] = useState("");
  const [seekResult, setSeekResult] = useState<any>(null);
  const [sweepData, setSweepData] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const ponds = project.nodes.filter((n) => n.type === "pond");

  const onGoalSeek = useCallback(() => {
    const pondId = selectedPondId || ponds[0]?.id;
    const eventId = activeEventId || project.events[0]?.id;
    if (!pondId || !eventId) return;

    setRunning(true);
    // Run in a setTimeout to allow UI update
    setTimeout(() => {
      const result = goalSeekOrificeDiameter(
        project, pondId, eventId, targetFlow,
        0.25, 6.0, 1.0, 25,
      );
      setSeekResult(result);

      // Also run a sweep for the chart
      const sweep = sweepOrificeDiameter(project, pondId, eventId, 0.25, 4.0, 12);
      setSweepData(sweep.map((p) => ({
        diameter: Number(p.paramValue.toFixed(2)),
        outflow: Number(p.peakOutflow.toFixed(1)),
      })));
      setRunning(false);
    }, 10);
  }, [project, selectedPondId, activeEventId, targetFlow, ponds]);

  if (ponds.length === 0) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "var(--text-muted)" }}>
        Add a pond to use goal-seek.
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>
        Goal-Seek
      </h3>

      <div className="prop-group">
        <label>Pond</label>
        <select
          value={selectedPondId || ponds[0]?.id || ""}
          onChange={(e) => setSelectedPondId(e.target.value)}
        >
          {ponds.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="prop-group">
        <label>Target Peak Outflow (cfs)</label>
        <input
          type="number"
          step="1"
          value={targetFlow}
          onChange={(e) => setTargetFlow(Number(e.target.value))}
        />
      </div>

      <button
        onClick={onGoalSeek}
        disabled={running}
        style={{
          padding: "6px 14px",
          fontSize: 12,
          background: "var(--accent)",
          border: "none",
          borderRadius: 5,
          color: "#fff",
          cursor: running ? "wait" : "pointer",
          opacity: running ? 0.6 : 1,
          marginBottom: 12,
        }}
      >
        {running ? "Computing..." : "🎯 Find Orifice Size"}
      </button>

      {seekResult && (
        <div style={{ marginTop: 8 }}>
          <div className="result-badge">
            {seekResult.converged ? "✅ Converged" : "⚠️ Approximate"}
          </div>
          <div className="result-badge">
            Diameter: <span className="value">{seekResult.value.toFixed(2)} ft</span>
            {" "}({(seekResult.value * 12).toFixed(0)}")
          </div>
          <div className="result-badge">
            Achieved: <span className="value">{seekResult.achievedFlow.toFixed(1)} cfs</span>
          </div>
          <div className="result-badge">
            Iterations: <span className="value">{seekResult.iterations}</span>
          </div>
        </div>
      )}

      {sweepData.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Orifice Diameter vs Peak Outflow
          </label>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={sweepData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="diameter"
                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                stroke="var(--border)"
                label={{ value: "Diameter (ft)", position: "bottom", offset: -2, fill: "var(--text-muted)", fontSize: 9 }}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                stroke="var(--border)"
                label={{ value: "Q (cfs)", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 9 }}
              />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 11 }} />
              <Line type="monotone" dataKey="outflow" stroke="var(--accent)" dot={{ r: 3 }} strokeWidth={1.5} />
              <ReferenceLine y={targetFlow} stroke="var(--selected-stroke)" strokeDasharray="3 3" strokeWidth={1} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

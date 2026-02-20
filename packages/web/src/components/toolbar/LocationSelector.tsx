/**
 * Location selector — auto-populate rainfall events from NOAA Atlas 14 state data.
 */
import { useState, useCallback } from "react";
import { getAvailableStates, generateEventsForState } from "@stormlab/engine";
import { useEditorStore } from "../../store/editor-store";

export function LocationSelector() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const [selectedState, setSelectedState] = useState("");
  const states = getAvailableStates();

  const onApply = useCallback(() => {
    if (!selectedState) return;
    const events = generateEventsForState(selectedState);
    if (events.length === 0) return;

    const confirmed =
      project.events.length <= 1 ||
      confirm(
        "Replace current rainfall events with NOAA Atlas 14 data for this state?",
      );
    if (!confirmed) return;

    setProject({
      ...project,
      events,
    });
  }, [selectedState, project, setProject]);

  const onReset = useCallback(() => {
    setSelectedState("");
    const defaultEvent = { id: "25yr", label: "25-Year Storm", stormType: "II" as const, totalDepth: 6.0 };
    const confirmed =
      project.events.length <= 1 ||
      confirm("Reset to default rainfall event?");
    if (!confirmed) return;
    setProject({ ...project, events: [defaultEvent] });
  }, [project, setProject]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <select
        value={selectedState}
        onChange={(e) => setSelectedState(e.target.value)}
        style={{
          background: "var(--input-bg)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "4px 6px",
          fontSize: 12,
          width: 80,
        }}
      >
        <option value="">State</option>
        {states.map((s) => (
          <option key={s.code} value={s.code}>
            {s.code}
          </option>
        ))}
      </select>
      {selectedState && (
        <button
          onClick={onApply}
          style={{
            fontSize: 11,
            padding: "4px 8px",
            background: "var(--accent)",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: "pointer",
          }}
          title="Apply NOAA Atlas 14 rainfall data for this state"
        >
          Apply
        </button>
      )}
      {project.events.length > 1 && (
        <button
          onClick={onReset}
          style={{
            fontSize: 11,
            padding: "4px 8px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--text)",
            cursor: "pointer",
          }}
          title="Reset to default single event"
        >
          ✕
        </button>
      )}
    </div>
  );
}

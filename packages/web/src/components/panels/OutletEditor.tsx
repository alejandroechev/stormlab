/**
 * Outlet Structure Editor — add/remove/configure outlet devices.
 */
import { useState, useCallback } from "react";
import type { OutletStructure } from "@hydrocad/engine";

interface OutletEditorProps {
  outlets: OutletStructure[];
  onChange: (outlets: OutletStructure[]) => void;
}

type NewOutletType = "orifice" | "weir" | "vnotch-weir";

function OutletRow({
  outlet,
  index,
  onUpdate,
  onRemove,
}: {
  outlet: OutletStructure;
  index: number;
  onUpdate: (idx: number, outlet: OutletStructure) => void;
  onRemove: (idx: number) => void;
}) {
  const label =
    outlet.type === "orifice"
      ? `Orifice (D=${outlet.diameter} ft)`
      : outlet.type === "vnotch-weir"
        ? `V-Notch (${outlet.angle}°)`
        : `${outlet.subtype === "broad-crested" ? "Broad" : "Sharp"} Weir (L=${outlet.length} ft)`;

  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ border: "1px solid #2a2a4a", borderRadius: 4, padding: 8, marginBottom: 6, background: "#0f3460" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: 12 }}>
          {expanded ? "▼" : "▶"} {index + 1}. {label}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(index); }}
          style={{ background: "#dc2626", border: "none", color: "#fff", borderRadius: 3, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      {expanded && outlet.type === "orifice" && (
        <div style={{ marginTop: 8 }}>
          <div className="prop-row">
            <div className="prop-group">
              <label>Diameter (ft)</label>
              <input
                type="number" step="0.25" value={outlet.diameter}
                onChange={(e) => onUpdate(index, { ...outlet, diameter: Number(e.target.value) })}
              />
            </div>
            <div className="prop-group">
              <label>Center Elev (ft)</label>
              <input
                type="number" step="0.5" value={outlet.centerElevation}
                onChange={(e) => onUpdate(index, { ...outlet, centerElevation: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="prop-group">
            <label>Coefficient</label>
            <input
              type="number" step="0.05" value={outlet.coefficient}
              onChange={(e) => onUpdate(index, { ...outlet, coefficient: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {expanded && outlet.type === "weir" && (
        <div style={{ marginTop: 8 }}>
          <div className="prop-row">
            <div className="prop-group">
              <label>Length (ft)</label>
              <input
                type="number" step="1" value={outlet.length}
                onChange={(e) => onUpdate(index, { ...outlet, length: Number(e.target.value) })}
              />
            </div>
            <div className="prop-group">
              <label>Crest Elev (ft)</label>
              <input
                type="number" step="0.5" value={outlet.crestElevation}
                onChange={(e) => onUpdate(index, { ...outlet, crestElevation: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="prop-row">
            <div className="prop-group">
              <label>Type</label>
              <select
                value={outlet.subtype}
                onChange={(e) => onUpdate(index, { ...outlet, subtype: e.target.value as "broad-crested" | "sharp-crested" })}
                style={{ width: "100%", background: "#16213e", color: "#eee", border: "1px solid #2a2a4a", borderRadius: 4, padding: "4px 6px", fontSize: 12 }}
              >
                <option value="broad-crested">Broad-Crested</option>
                <option value="sharp-crested">Sharp-Crested</option>
              </select>
            </div>
            <div className="prop-group">
              <label>Coefficient</label>
              <input
                type="number" step="0.05" value={outlet.coefficient}
                onChange={(e) => onUpdate(index, { ...outlet, coefficient: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      )}

      {expanded && outlet.type === "vnotch-weir" && (
        <div style={{ marginTop: 8 }}>
          <div className="prop-row">
            <div className="prop-group">
              <label>Angle (°)</label>
              <input
                type="number" step="15" value={outlet.angle}
                onChange={(e) => onUpdate(index, { ...outlet, angle: Number(e.target.value) })}
              />
            </div>
            <div className="prop-group">
              <label>Crest Elev (ft)</label>
              <input
                type="number" step="0.5" value={outlet.crestElevation}
                onChange={(e) => onUpdate(index, { ...outlet, crestElevation: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="prop-group">
            <label>Coefficient</label>
            <input
              type="number" step="0.05" value={outlet.coefficient}
              onChange={(e) => onUpdate(index, { ...outlet, coefficient: Number(e.target.value) })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function OutletEditor({ outlets, onChange }: OutletEditorProps) {
  const [newType, setNewType] = useState<NewOutletType>("orifice");

  const addOutlet = useCallback(() => {
    let newOutlet: OutletStructure;
    switch (newType) {
      case "orifice":
        newOutlet = { type: "orifice", coefficient: 0.6, diameter: 1.0, centerElevation: 100.5 };
        break;
      case "weir":
        newOutlet = { type: "weir", subtype: "broad-crested", coefficient: 2.85, length: 10, crestElevation: 106 };
        break;
      case "vnotch-weir":
        newOutlet = { type: "vnotch-weir", coefficient: 2.49, angle: 90, crestElevation: 100 };
        break;
    }
    onChange([...outlets, newOutlet]);
  }, [newType, outlets, onChange]);

  const updateOutlet = useCallback(
    (idx: number, outlet: OutletStructure) => {
      const updated = [...outlets];
      updated[idx] = outlet;
      onChange(updated);
    },
    [outlets, onChange],
  );

  const removeOutlet = useCallback(
    (idx: number) => {
      onChange(outlets.filter((_, i) => i !== idx));
    },
    [outlets, onChange],
  );

  return (
    <div style={{ fontSize: 12 }}>
      {outlets.map((outlet, i) => (
        <OutletRow
          key={i}
          outlet={outlet}
          index={i}
          onUpdate={updateOutlet}
          onRemove={removeOutlet}
        />
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as NewOutletType)}
          style={{ flex: 1, background: "#0f3460", color: "#eee", border: "1px solid #2a2a4a", borderRadius: 4, padding: "4px 6px", fontSize: 11 }}
        >
          <option value="orifice">Orifice</option>
          <option value="weir">Weir</option>
          <option value="vnotch-weir">V-Notch Weir</option>
        </select>
        <button
          onClick={addOutlet}
          style={{ padding: "4px 10px", fontSize: 11, background: "#22c55e", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

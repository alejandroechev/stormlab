/**
 * Property Panel — edit selected node properties.
 */
import { useEditorStore } from "../../store/editor-store";
import type { ProjectNode } from "@stormlab/engine";
import { type ChangeEvent, useCallback } from "react";
import { HydrographChart } from "../reports/HydrographChart";
import { PondGeometryEditor } from "./PondGeometryEditor";
import { OutletEditor } from "./OutletEditor";

function SubcatchmentProps({ node }: { node: ProjectNode & { type: "subcatchment" } }) {
  const updateNode = useEditorStore((s) => s.updateNode);

  const onNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateNode(node.id, { name: e.target.value } as Partial<ProjectNode>);
    },
    [node.id, updateNode],
  );

  const onTcChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        updateNode(node.id, {
          data: { ...node.data, tcOverride: val },
        } as Partial<ProjectNode>);
      }
    },
    [node.id, node.data, updateNode],
  );

  const onSubAreaChange = useCallback(
    (idx: number, field: string, value: string) => {
      const subAreas = [...node.data.subAreas];
      const numVal = parseFloat(value);
      if (field === "cn" || field === "area") {
        if (isNaN(numVal)) return;
        (subAreas[idx] as any)[field] = numVal;
      } else if (field === "soilGroup") {
        subAreas[idx] = { ...subAreas[idx], soilGroup: value as any };
      } else {
        subAreas[idx] = { ...subAreas[idx], [field]: value };
      }
      updateNode(node.id, {
        data: { ...node.data, subAreas },
      } as Partial<ProjectNode>);
    },
    [node.id, node.data, updateNode],
  );

  const addSubArea = useCallback(() => {
    const subAreas = [
      ...node.data.subAreas,
      { description: "New area", soilGroup: "B" as const, cn: 75, area: 10 },
    ];
    updateNode(node.id, {
      data: { ...node.data, subAreas },
    } as Partial<ProjectNode>);
  }, [node.id, node.data, updateNode]);

  const totalArea = node.data.subAreas.reduce((s, a) => s + a.area, 0);

  return (
    <>
      <div className="prop-group">
        <label>Name</label>
        <input value={node.name} onChange={onNameChange} />
      </div>
      <div className="prop-group">
        <label>Tc Override (hours)</label>
        <input
          type="number"
          step="0.1"
          value={node.data.tcOverride ?? ""}
          onChange={onTcChange}
        />
      </div>
      <div className="prop-group">
        <label>
          Sub-Areas (Total: {totalArea.toFixed(1)} acres)
        </label>
        <table className="sub-areas-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Soil</th>
              <th>CN</th>
              <th>Area</th>
            </tr>
          </thead>
          <tbody>
            {node.data.subAreas.map((sa, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={sa.description}
                    onChange={(e) => onSubAreaChange(i, "description", e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={sa.soilGroup}
                    onChange={(e) => onSubAreaChange(i, "soilGroup", e.target.value)}
                    style={{ width: 40, background: "transparent", color: "#eee", border: "none" }}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={sa.cn}
                    onChange={(e) => onSubAreaChange(i, "cn", e.target.value)}
                    style={{ width: 45 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={sa.area}
                    onChange={(e) => onSubAreaChange(i, "area", e.target.value)}
                    style={{ width: 50 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          style={{ marginTop: 4, fontSize: 11, padding: "3px 8px" }}
          onClick={addSubArea}
        >
          + Add Sub-Area
        </button>
      </div>
    </>
  );
}

function PondProps({ node }: { node: ProjectNode & { type: "pond" } }) {
  const updateNode = useEditorStore((s) => s.updateNode);

  const onNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateNode(node.id, { name: e.target.value } as Partial<ProjectNode>);
    },
    [node.id, updateNode],
  );

  const onWSEChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        updateNode(node.id, {
          data: { ...node.data, initialWSE: val },
        } as Partial<ProjectNode>);
      }
    },
    [node.id, node.data, updateNode],
  );

  return (
    <>
      <div className="prop-group">
        <label>Name</label>
        <input value={node.name} onChange={onNameChange} />
      </div>
      <div className="prop-group">
        <label>Initial WSE (ft)</label>
        <input
          type="number"
          value={node.data.initialWSE}
          onChange={onWSEChange}
        />
      </div>
      <div className="prop-group">
        <label>Stage-Storage</label>
        <PondGeometryEditor
          stageStorage={node.data.stageStorage}
          baseElevation={node.data.initialWSE}
          onChange={(curve) =>
            updateNode(node.id, {
              data: { ...node.data, stageStorage: curve },
            } as Partial<ProjectNode>)
          }
        />
      </div>
      <div className="prop-group">
        <label>Outlet Structures</label>
        <OutletEditor
          outlets={node.data.outlets}
          onChange={(outlets) =>
            updateNode(node.id, {
              data: { ...node.data, outlets },
            } as Partial<ProjectNode>)
          }
        />
      </div>
    </>
  );
}

function ReachProps({ node }: { node: ProjectNode & { type: "reach" } }) {
  const updateNode = useEditorStore((s) => s.updateNode);

  const onNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateNode(node.id, { name: e.target.value } as Partial<ProjectNode>);
    },
    [node.id, updateNode],
  );

  const onFieldChange = useCallback(
    (field: string, value: string) => {
      const val = parseFloat(value);
      if (isNaN(val)) return;
      updateNode(node.id, {
        data: { ...node.data, [field]: val },
      } as Partial<ProjectNode>);
    },
    [node.id, node.data, updateNode],
  );

  return (
    <>
      <div className="prop-group">
        <label>Name</label>
        <input value={node.name} onChange={onNameChange} />
      </div>
      <div className="prop-row">
        <div className="prop-group">
          <label>Length (ft)</label>
          <input
            type="number"
            value={node.data.length}
            onChange={(e) => onFieldChange("length", e.target.value)}
          />
        </div>
        <div className="prop-group">
          <label>Slope (ft/ft)</label>
          <input
            type="number"
            step="0.001"
            value={node.data.slope}
            onChange={(e) => onFieldChange("slope", e.target.value)}
          />
        </div>
      </div>
      <div className="prop-group">
        <label>Manning's n</label>
        <input
          type="number"
          step="0.001"
          value={node.data.manningsN}
          onChange={(e) => onFieldChange("manningsN", e.target.value)}
        />
      </div>
      <div className="prop-group">
        <label>Shape</label>
        <span style={{ fontSize: 12, color: "#999" }}>
          {node.data.shape.type}
          {node.data.shape.type === "trapezoidal" &&
            ` (${node.data.shape.bottomWidth}ft, ${node.data.shape.sideSlope}:1)`}
          {node.data.shape.type === "rectangular" &&
            ` (${node.data.shape.width}ft)`}
          {node.data.shape.type === "circular" &&
            ` (${node.data.shape.diameter}ft)`}
        </span>
      </div>
    </>
  );
}

function JunctionProps({ node }: { node: ProjectNode & { type: "junction" } }) {
  const updateNode = useEditorStore((s) => s.updateNode);

  return (
    <div className="prop-group">
      <label>Name</label>
      <input
        value={node.name}
        onChange={(e) =>
          updateNode(node.id, { name: e.target.value } as Partial<ProjectNode>)
        }
      />
    </div>
  );
}

function NodeResultBadges({ nodeId }: { nodeId: string }) {
  const results = useEditorStore((s) => s.results);
  const activeEventId = useEditorStore((s) => s.activeEventId);

  if (!activeEventId) return null;
  const eventResults = results.get(activeEventId);
  if (!eventResults) return null;
  const r = eventResults.get(nodeId);
  if (!r) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ marginBottom: 8 }}>Results</h3>
      <div className="result-badge">
        Peak Q<sub>out</sub>: <span className="value">{r.peakOutflow.toFixed(1)} cfs</span>
      </div>
      <div className="result-badge">
        T<sub>peak</sub>: <span className="value">{r.timeToPeakOutflow.toFixed(2)} hr</span>
      </div>
      <div className="result-badge">
        Volume: <span className="value">{r.totalVolume.toFixed(2)} ac-ft</span>
      </div>
      {r.peakInflow !== undefined && (
        <div className="result-badge">
          Peak Q<sub>in</sub>: <span className="value">{r.peakInflow.toFixed(1)} cfs</span>
        </div>
      )}
      {r.peakStage !== undefined && (
        <div className="result-badge">
          Peak Stage: <span className="value">{r.peakStage.toFixed(2)} ft</span>
        </div>
      )}
      <HydrographChart nodeId={nodeId} />
    </div>
  );
}

export function PropertyPanel() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedLinkId = useEditorStore((s) => s.selectedLinkId);
  const nodes = useEditorStore((s) => s.project.nodes);
  const removeNode = useEditorStore((s) => s.removeNode);
  const removeLink = useEditorStore((s) => s.removeLink);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (selectedLinkId) {
    return (
      <div className="property-panel">
        <h3>Flow Link</h3>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>
          ID: {selectedLinkId}
        </p>
        <button className="btn-danger" onClick={() => removeLink(selectedLinkId)}>
          Delete Link
        </button>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="property-panel">
        <h3>Properties</h3>
        <p className="empty">Select a node to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <h3>{selectedNode.type}</h3>
      {selectedNode.type === "subcatchment" && (
        <SubcatchmentProps node={selectedNode as any} />
      )}
      {selectedNode.type === "pond" && <PondProps node={selectedNode as any} />}
      {selectedNode.type === "reach" && <ReachProps node={selectedNode as any} />}
      {selectedNode.type === "junction" && (
        <JunctionProps node={selectedNode as any} />
      )}

      <NodeResultBadges nodeId={selectedNode.id} />

      <button className="btn-danger" onClick={() => removeNode(selectedNode.id)}>
        Delete Node
      </button>
    </div>
  );
}

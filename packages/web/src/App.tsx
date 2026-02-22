import { useState } from "react";
import { DiagramCanvas } from "./components/diagram/DiagramCanvas";
import { StencilPanel } from "./components/toolbar/StencilPanel";
import { PropertyPanel } from "./components/panels/PropertyPanel";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ComparisonPanel } from "./components/reports/ComparisonPanel";
import { GoalSeekPanel } from "./components/panels/GoalSeekPanel";
import { ToastContainer } from "./components/Toast";
import { useEditorStore } from "./store/editor-store";
import "./index.css";

type BottomTab = "none" | "comparison" | "goal-seek";

export function App() {
  const nodes = useEditorStore((s) => s.project.nodes);
  const links = useEditorStore((s) => s.project.links);
  const zoom = useEditorStore((s) => s.zoom);
  const baselineProject = useEditorStore((s) => s.baselineProject);
  const [bottomTab, setBottomTab] = useState<BottomTab>("none");

  const showBottom = bottomTab !== "none";

  return (
    <div
      className="app-layout"
      style={{
        gridTemplateRows: showBottom ? "44px 1fr 240px 28px" : "44px 1fr 28px",
      }}
    >
      <Toolbar />
      <StencilPanel />
      <DiagramCanvas />
      <PropertyPanel />

      {showBottom && (
        <div
          style={{
            gridColumn: "2 / 4",
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto" }}>
            {bottomTab === "comparison" && <ComparisonPanel />}
            {bottomTab === "goal-seek" && <GoalSeekPanel />}
          </div>
        </div>
      )}

      <div className="status-bar">
        <span>Nodes: {nodes.length}</span>
        <span>Links: {links.length}</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span style={{ marginLeft: "auto" }} />
        <button
          onClick={() => setBottomTab(bottomTab === "comparison" ? "none" : "comparison")}
          style={{
            background: bottomTab === "comparison" ? "var(--accent)" : "transparent",
            color: bottomTab === "comparison" ? "#fff" : "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            padding: "1px 8px",
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          Pre/Post {baselineProject ? "●" : ""}
        </button>
        <button
          onClick={() => setBottomTab(bottomTab === "goal-seek" ? "none" : "goal-seek")}
          style={{
            background: bottomTab === "goal-seek" ? "var(--accent)" : "transparent",
            color: bottomTab === "goal-seek" ? "#fff" : "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            padding: "1px 8px",
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          Goal-Seek
        </button>
      </div>
      <ToastContainer />
    </div>
  );
}

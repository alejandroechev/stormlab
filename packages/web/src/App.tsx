import { DiagramCanvas } from "./components/diagram/DiagramCanvas";
import { StencilPanel } from "./components/toolbar/StencilPanel";
import { PropertyPanel } from "./components/panels/PropertyPanel";
import { Toolbar } from "./components/toolbar/Toolbar";
import { useEditorStore } from "./store/editor-store";
import "./index.css";

export function App() {
  const nodes = useEditorStore((s) => s.project.nodes);
  const links = useEditorStore((s) => s.project.links);
  const zoom = useEditorStore((s) => s.zoom);

  return (
    <div className="app-layout">
      <Toolbar />
      <StencilPanel />
      <DiagramCanvas />
      <PropertyPanel />
      <div className="status-bar">
        <span>Nodes: {nodes.length}</span>
        <span>Links: {links.length}</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}

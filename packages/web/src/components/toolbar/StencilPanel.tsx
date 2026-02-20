/**
 * Stencil Palette — drag node types onto the canvas.
 */

const stencilItems = [
  { type: "subcatchment", label: "Subcatchment", icon: "SC", color: "#4a9eff" },
  { type: "pond", label: "Pond", icon: "P", color: "#22c55e" },
  { type: "reach", label: "Reach", icon: "R", color: "#f59e0b" },
  { type: "junction", label: "Junction", icon: "J", color: "#a78bfa" },
] as const;

export function StencilPanel() {
  return (
    <div className="stencil-panel">
      <h3>Components</h3>
      {stencilItems.map((item) => (
        <div
          key={item.type}
          className="stencil-item"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("node-type", item.type);
            e.dataTransfer.effectAllowed = "copy";
          }}
        >
          <div className="icon" style={{ background: item.color }}>
            {item.icon}
          </div>
          {item.label}
        </div>
      ))}
      <h3 style={{ marginTop: 24 }}>Instructions</h3>
      <p style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>
        Drag components onto the canvas. Click the bottom port of a node, then
        click the top port of another to create a flow link.
      </p>
    </div>
  );
}

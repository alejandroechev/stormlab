/**
 * SVG Routing Diagram Canvas — the core visual editor.
 *
 * Renders nodes and links as SVG with pan/zoom, drag-to-move,
 * and port-based link creation.
 */
import { useRef, useState, useCallback, type MouseEvent } from "react";
import { useEditorStore } from "../../store/editor-store";
import type { ProjectNode, ProjectLink } from "@hydrocad/engine";

const NODE_W = 120;
const NODE_H = 60;
const GRID = 20;

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

const nodeColors: Record<string, string> = {
  subcatchment: "#4a9eff",
  pond: "#22c55e",
  reach: "#f59e0b",
  junction: "#a78bfa",
};

const nodeIcons: Record<string, string> = {
  subcatchment: "SC",
  pond: "P",
  reach: "R",
  junction: "J",
};

function NodeShape({ node }: { node: ProjectNode }) {
  const selectedId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const moveNode = useEditorStore((s) => s.moveNode);
  const startLinkFrom = useEditorStore((s) => s.startLinkFrom);
  const linkSourceId = useEditorStore((s) => s.linkSourceId);
  const addLink = useEditorStore((s) => s.addLink);

  const isSelected = selectedId === node.id;
  const color = nodeColors[node.type] ?? "#666";
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      // If we're drawing a link and click on a target node
      if (linkSourceId && linkSourceId !== node.id) {
        addLink({
          id: `${linkSourceId}-${node.id}`,
          from: linkSourceId,
          to: node.id,
        });
        return;
      }

      selectNode(node.id);
      setDragging(true);

      const svg = (e.target as SVGElement).ownerSVGElement!;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      dragOffset.current = {
        x: svgP.x - node.position.x,
        y: svgP.y - node.position.y,
      };

      const onMouseMove = (ev: globalThis.MouseEvent) => {
        const pt2 = svg.createSVGPoint();
        pt2.x = ev.clientX;
        pt2.y = ev.clientY;
        const svgP2 = pt2.matrixTransform(svg.getScreenCTM()!.inverse());
        moveNode(
          node.id,
          snap(svgP2.x - dragOffset.current.x),
          snap(svgP2.y - dragOffset.current.y),
        );
      };

      const onMouseUp = () => {
        setDragging(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [node.id, node.position, selectNode, moveNode, linkSourceId, addLink],
  );

  // Output port (bottom center) — click to start a link
  const onPortClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (linkSourceId === node.id) {
        startLinkFrom(null); // cancel
      } else {
        startLinkFrom(node.id);
      }
    },
    [node.id, linkSourceId, startLinkFrom],
  );

  // Input port (top center) — click to complete a link
  const onInputPortClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (linkSourceId && linkSourceId !== node.id) {
        addLink({
          id: `${linkSourceId}-${node.id}`,
          from: linkSourceId,
          to: node.id,
        });
      }
    },
    [node.id, linkSourceId, addLink],
  );

  const x = node.position.x;
  const y = node.position.y;

  return (
    <g
      className="node-group"
      transform={`translate(${x}, ${y})`}
      onMouseDown={onMouseDown}
    >
      {/* Node body */}
      <rect
        className={`node-body ${isSelected ? "selected" : ""}`}
        x={-NODE_W / 2}
        y={-NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={8}
        fill={color}
        stroke={isSelected ? "#e94560" : color}
        opacity={0.9}
      />
      {/* Type icon */}
      <text
        className="node-type-label"
        x={0}
        y={-8}
        dominantBaseline="middle"
      >
        {nodeIcons[node.type]}
      </text>
      {/* Name label */}
      <text className="node-label" x={0} y={10} dominantBaseline="middle">
        {node.name.length > 14 ? node.name.slice(0, 12) + "…" : node.name}
      </text>
      {/* Input port (top) */}
      <circle
        className="node-port"
        cx={0}
        cy={-NODE_H / 2}
        r={5}
        fill="#fff"
        stroke={color}
        strokeWidth={2}
        onClick={onInputPortClick}
      />
      {/* Output port (bottom) */}
      <circle
        className="node-port"
        cx={0}
        cy={NODE_H / 2}
        r={5}
        fill={linkSourceId === node.id ? "#e94560" : "#fff"}
        stroke={color}
        strokeWidth={2}
        onClick={onPortClick}
      />
    </g>
  );
}

function LinkLine({ link }: { link: ProjectLink }) {
  const nodes = useEditorStore((s) => s.project.nodes);
  const selectedLinkId = useEditorStore((s) => s.selectedLinkId);
  const selectLink = useEditorStore((s) => s.selectLink);

  const fromNode = nodes.find((n) => n.id === link.from);
  const toNode = nodes.find((n) => n.id === link.to);
  if (!fromNode || !toNode) return null;

  const x1 = fromNode.position.x;
  const y1 = fromNode.position.y + NODE_H / 2;
  const x2 = toNode.position.x;
  const y2 = toNode.position.y - NODE_H / 2;

  const midY = (y1 + y2) / 2;
  const isSelected = selectedLinkId === link.id;

  return (
    <g onClick={(e) => { e.stopPropagation(); selectLink(link.id); }}>
      <path
        className={`flow-link ${isSelected ? "selected" : ""}`}
        d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
      />
      {/* Arrowhead */}
      <polygon
        className="link-arrow"
        points={`${x2 - 5},${y2 - 10} ${x2 + 5},${y2 - 10} ${x2},${y2 - 2}`}
        fill={isSelected ? "#e94560" : "#6b7280"}
      />
    </g>
  );
}

export function DiagramCanvas() {
  const nodes = useEditorStore((s) => s.project.nodes);
  const links = useEditorStore((s) => s.project.links);
  const pan = useEditorStore((s) => s.pan);
  const zoom = useEditorStore((s) => s.zoom);
  const setPan = useEditorStore((s) => s.setPan);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selectNode = useEditorStore((s) => s.selectNode);
  const startLinkFrom = useEditorStore((s) => s.startLinkFrom);
  const addNode = useEditorStore((s) => s.addNode);

  const svgRef = useRef<SVGSVGElement>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const onBackgroundDown = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (e.button === 0) {
        selectNode(null);
        startLinkFrom(null);
        setPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      }
    },
    [pan, selectNode, startLinkFrom],
  );

  const onBackgroundMove = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (panning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan(panStart.current.panX + dx / zoom, panStart.current.panY + dy / zoom);
      }
    },
    [panning, zoom, setPan],
  );

  const onBackgroundUp = useCallback(() => {
    setPanning(false);
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * delta);
    },
    [zoom, setZoom],
  );

  // Handle drop from stencil
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("node-type") as ProjectNode["type"];
      if (!type) return;

      const svg = svgRef.current!;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());

      const id = `${type.slice(0, 2).toUpperCase()}-${Date.now().toString(36)}`;
      const name = {
        subcatchment: "New Subcatchment",
        pond: "New Pond",
        reach: "New Reach",
        junction: "New Junction",
      }[type];

      const baseNode = {
        id,
        name,
        position: { x: snap(svgP.x), y: snap(svgP.y) },
      };

      let node: ProjectNode;
      switch (type) {
        case "subcatchment":
          node = {
            ...baseNode,
            type: "subcatchment",
            data: {
              id,
              name,
              subAreas: [
                { description: "Default", soilGroup: "B", cn: 75, area: 10 },
              ],
              flowSegments: [],
              tcOverride: 0.5,
            },
          };
          break;
        case "pond":
          node = {
            ...baseNode,
            type: "pond",
            data: {
              stageStorage: [
                { stage: 100, storage: 0 },
                { stage: 105, storage: 25000 },
                { stage: 110, storage: 60000 },
              ],
              outlets: [
                {
                  type: "orifice",
                  coefficient: 0.6,
                  diameter: 1.0,
                  centerElevation: 100.5,
                },
              ],
              initialWSE: 100,
            },
          };
          break;
        case "reach":
          node = {
            ...baseNode,
            type: "reach",
            data: {
              length: 500,
              manningsN: 0.035,
              slope: 0.005,
              shape: { type: "trapezoidal", bottomWidth: 6, sideSlope: 2 },
            },
          };
          break;
        case "junction":
          node = { ...baseNode, type: "junction" };
          break;
        default:
          return;
      }

      addNode(node);
    },
    [addNode],
  );

  return (
    <div
      className={`diagram-area ${panning ? "panning" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <svg
        ref={svgRef}
        onMouseDown={onBackgroundDown}
        onMouseMove={onBackgroundMove}
        onMouseUp={onBackgroundUp}
        onWheel={onWheel}
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#1e1e3a" strokeWidth="0.5" />
          </pattern>
        </defs>
        <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
          <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#grid)" />
          {/* Links first (behind nodes) */}
          {links.map((link) => (
            <LinkLine key={link.id} link={link} />
          ))}
          {/* Nodes on top */}
          {nodes.map((node) => (
            <NodeShape key={node.id} node={node} />
          ))}
        </g>
      </svg>
    </div>
  );
}

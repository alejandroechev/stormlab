/**
 * Zustand store for the project editor state.
 */
import { create } from "zustand";
import type {
  Project,
  ProjectNode,
  ProjectLink,
  RainfallEventDef,
  NodeResult,
} from "@hydrocad/engine";

export interface EditorState {
  project: Project;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  /** When drawing a new link, the source node ID */
  linkSourceId: string | null;
  /** Pan offset */
  pan: { x: number; y: number };
  /** Zoom level (1 = 100%) */
  zoom: number;
  /** Simulation results keyed by event ID */
  results: Map<string, Map<string, NodeResult>>;
  /** Active event ID for display */
  activeEventId: string | null;

  // Actions
  addNode: (node: ProjectNode) => void;
  updateNode: (id: string, updates: Partial<ProjectNode>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;
  selectNode: (id: string | null) => void;

  addLink: (link: ProjectLink) => void;
  removeLink: (id: string) => void;
  selectLink: (id: string | null) => void;
  startLinkFrom: (nodeId: string | null) => void;

  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;

  setProject: (project: Project) => void;
  setResults: (eventId: string, results: Map<string, NodeResult>) => void;
  setActiveEvent: (eventId: string) => void;
}

function emptyProject(): Project {
  return {
    id: crypto.randomUUID(),
    name: "New Project",
    description: "",
    nodes: [],
    links: [],
    events: [
      { id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 },
    ],
  };
}

export const useEditorStore = create<EditorState>((set) => ({
  project: emptyProject(),
  selectedNodeId: null,
  selectedLinkId: null,
  linkSourceId: null,
  pan: { x: 0, y: 0 },
  zoom: 1,
  results: new Map(),
  activeEventId: null,

  addNode: (node) =>
    set((s) => ({
      project: { ...s.project, nodes: [...s.project.nodes, node] },
    })),

  updateNode: (id, updates) =>
    set((s) => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.map((n) =>
          n.id === id ? { ...n, ...updates } as ProjectNode : n,
        ),
      },
    })),

  removeNode: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.filter((n) => n.id !== id),
        links: s.project.links.filter(
          (l) => l.from !== id && l.to !== id,
        ),
      },
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    })),

  moveNode: (id, x, y) =>
    set((s) => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.map((n) =>
          n.id === id ? { ...n, position: { x, y } } : n,
        ),
      },
    })),

  selectNode: (id) =>
    set({ selectedNodeId: id, selectedLinkId: null }),

  addLink: (link) =>
    set((s) => ({
      project: { ...s.project, links: [...s.project.links, link] },
      linkSourceId: null,
    })),

  removeLink: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        links: s.project.links.filter((l) => l.id !== id),
      },
      selectedLinkId: s.selectedLinkId === id ? null : s.selectedLinkId,
    })),

  selectLink: (id) =>
    set({ selectedLinkId: id, selectedNodeId: null }),

  startLinkFrom: (nodeId) => set({ linkSourceId: nodeId }),

  setPan: (x, y) => set({ pan: { x, y } }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),

  setProject: (project) => {
    // Auto-layout if nodes are too clustered (all positions within a small range)
    const xs = project.nodes.map((n) => n.position.x);
    const ys = project.nodes.map((n) => n.position.y);
    const rangeX = Math.max(...xs) - Math.min(...xs);
    const rangeY = Math.max(...ys) - Math.min(...ys);

    if (project.nodes.length > 1 && rangeX < 50 && rangeY < 50) {
      // Nodes are clustered — auto-layout vertically centered
      const startX = 400;
      const startY = 100;
      const spacingY = 160;
      project = {
        ...project,
        nodes: project.nodes.map((n, i) => ({
          ...n,
          position: { x: startX, y: startY + i * spacingY },
        })),
      };
    }

    set({
      project,
      selectedNodeId: null,
      selectedLinkId: null,
      results: new Map(),
      activeEventId: project.events[0]?.id ?? null,
    });
  },

  setResults: (eventId, results) =>
    set((s) => {
      const newResults = new Map(s.results);
      newResults.set(eventId, results);
      return { results: newResults };
    }),

  setActiveEvent: (eventId) => set({ activeEventId: eventId }),
}));

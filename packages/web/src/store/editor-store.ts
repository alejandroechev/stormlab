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
  /** Undo/redo history */
  history: Project[];
  historyIndex: number;

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

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
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

const MAX_HISTORY = 50;

function pushHistory(s: EditorState): Partial<EditorState> {
  const newHistory = s.history.slice(0, s.historyIndex + 1);
  newHistory.push(structuredClone(s.project));
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return { history: newHistory, historyIndex: newHistory.length - 1 };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: emptyProject(),
  selectedNodeId: null,
  selectedLinkId: null,
  linkSourceId: null,
  pan: { x: 0, y: 0 },
  zoom: 1,
  results: new Map(),
  activeEventId: null,
  history: [],
  historyIndex: -1,

  addNode: (node) =>
    set((s) => ({
      ...pushHistory(s),
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
      ...pushHistory(s),
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
      ...pushHistory(s),
      project: { ...s.project, links: [...s.project.links, link] },
      linkSourceId: null,
    })),

  removeLink: (id) =>
    set((s) => ({
      ...pushHistory(s),
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

  undo: () =>
    set((s) => {
      if (s.historyIndex < 0) return s;
      const project = structuredClone(s.history[s.historyIndex]);
      return { project, historyIndex: s.historyIndex - 1 };
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return s;
      const nextIndex = s.historyIndex + 1;
      // The project *after* the snapshot at nextIndex was applied
      // We need the state that was saved when that action happened
      if (nextIndex + 1 < s.history.length) {
        const project = structuredClone(s.history[nextIndex + 1]);
        return { project, historyIndex: nextIndex + 1 };
      }
      return s;
    }),

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}));

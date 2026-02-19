/**
 * Project Data Model
 *
 * The routing diagram is a DAG of nodes connected by links.
 * Node types: Subcatchment, Pond, Reach, Junction
 */

import { type SubcatchmentInput } from "../hydrology/subcatchment.js";
import { type StageStoragePoint } from "../hydraulics/stage-storage.js";
import { type OutletStructure } from "../hydraulics/outlet-structures.js";
import { type HydrographPoint } from "../hydrology/unit-hydrograph.js";

/** Position on the routing diagram */
export interface NodePosition {
  x: number;
  y: number;
}

/** Base properties for all node types */
interface BaseNode {
  id: string;
  name: string;
  position: NodePosition;
}

/** Subcatchment node — generates runoff */
export interface SubcatchmentNode extends BaseNode {
  type: "subcatchment";
  data: SubcatchmentInput;
}

/** Pond node — routes inflow through storage + outlets */
export interface PondNode extends BaseNode {
  type: "pond";
  data: {
    stageStorage: StageStoragePoint[];
    outlets: OutletStructure[];
    initialWSE: number;
  };
}

/** Reach/Channel node — routes inflow through a channel */
export interface ReachNode extends BaseNode {
  type: "reach";
  data: {
    length: number;
    manningsN: number;
    slope: number;
    shape:
      | { type: "rectangular"; width: number }
      | { type: "trapezoidal"; bottomWidth: number; sideSlope: number }
      | { type: "circular"; diameter: number };
  };
}

/** Junction node — sums inflows, no routing */
export interface JunctionNode extends BaseNode {
  type: "junction";
}

export type ProjectNode =
  | SubcatchmentNode
  | PondNode
  | ReachNode
  | JunctionNode;

/** A link connecting two nodes (flow direction: from → to) */
export interface ProjectLink {
  id: string;
  from: string; // source node ID
  to: string; // target node ID
}

/** A rainfall event definition */
export interface RainfallEventDef {
  id: string;
  label: string;
  stormType: "I" | "IA" | "II" | "III";
  totalDepth: number; // inches
}

/** Complete project model */
export interface Project {
  id: string;
  name: string;
  description: string;
  nodes: ProjectNode[];
  links: ProjectLink[];
  events: RainfallEventDef[];
}

/** Node computation result */
export interface NodeResult {
  nodeId: string;
  /** Outflow hydrograph (time in hours, flow in cfs) */
  outflowHydrograph: HydrographPoint[];
  /** Peak outflow (cfs) */
  peakOutflow: number;
  /** Time to peak outflow (hours) */
  timeToPeakOutflow: number;
  /** Total outflow volume (acre-ft) */
  totalVolume: number;
  /** Peak inflow if applicable (cfs) */
  peakInflow?: number;
  /** Peak stage if applicable (ft) */
  peakStage?: number;
  /** Peak storage if applicable (cu ft) */
  peakStorage?: number;
}

/** Simulation results for all nodes in one event */
export interface SimulationResult {
  eventId: string;
  nodeResults: Map<string, NodeResult>;
}

/**
 * Get all upstream node IDs for a given node.
 */
export function getUpstreamNodes(
  nodeId: string,
  links: ProjectLink[],
): string[] {
  return links.filter((l) => l.to === nodeId).map((l) => l.from);
}

/**
 * Get the downstream node ID for a given node.
 */
export function getDownstreamNode(
  nodeId: string,
  links: ProjectLink[],
): string | undefined {
  const link = links.find((l) => l.from === nodeId);
  return link?.to;
}

/**
 * Topologically sort nodes in the DAG (upstream-first order).
 * Throws if a cycle is detected.
 */
export function topologicalSort(
  nodes: ProjectNode[],
  links: ProjectLink[],
): string[] {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }

  for (const link of links) {
    inDegree.set(link.to, (inDegree.get(link.to) ?? 0) + 1);
    adjList.get(link.from)?.push(link.to);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const downstream of adjList.get(id) ?? []) {
      const newDeg = (inDegree.get(downstream) ?? 1) - 1;
      inDegree.set(downstream, newDeg);
      if (newDeg === 0) queue.push(downstream);
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error("Cycle detected in routing diagram");
  }

  return sorted;
}

/**
 * Validate a project model.
 * Returns an array of error messages (empty if valid).
 */
export function validateProject(project: Project): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(project.nodes.map((n) => n.id));

  // Check for duplicate node IDs
  if (nodeIds.size !== project.nodes.length) {
    errors.push("Duplicate node IDs found");
  }

  // Check that all link references are valid
  for (const link of project.links) {
    if (!nodeIds.has(link.from)) {
      errors.push(`Link ${link.id}: source node '${link.from}' not found`);
    }
    if (!nodeIds.has(link.to)) {
      errors.push(`Link ${link.id}: target node '${link.to}' not found`);
    }
  }

  // Check for cycles
  try {
    topologicalSort(project.nodes, project.links);
  } catch {
    errors.push("Routing diagram contains a cycle");
  }

  // Check that subcatchments have required data
  for (const node of project.nodes) {
    if (node.type === "subcatchment") {
      if (!node.data.subAreas || node.data.subAreas.length === 0) {
        errors.push(`Subcatchment '${node.name}': no sub-areas defined`);
      }
      if (
        (!node.data.flowSegments || node.data.flowSegments.length === 0) &&
        node.data.tcOverride === undefined
      ) {
        errors.push(
          `Subcatchment '${node.name}': no flow segments or Tc override`,
        );
      }
    }
  }

  // Check events
  if (project.events.length === 0) {
    errors.push("No rainfall events defined");
  }

  return errors;
}

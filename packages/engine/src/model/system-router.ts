/**
 * System Router — runs the full simulation on a project DAG.
 */

import {
  type Project,
  type ProjectNode,
  type NodeResult,
  type SimulationResult,
  type RainfallEventDef,
  topologicalSort,
  getUpstreamNodes,
} from "./project.js";
import {
  computeSubcatchment,
  type RainfallEvent,
} from "../hydrology/subcatchment.js";
import { type HydrographPoint } from "../hydrology/unit-hydrograph.js";
import { routePond, type PondRoutingInput } from "../hydraulics/pond-routing.js";
import { routeReach, type ReachRoutingInput } from "./reach-routing.js";

/**
 * Sum multiple hydrographs at a junction.
 * Aligns by time and sums flows.
 */
function sumHydrographs(hydrographs: HydrographPoint[][]): HydrographPoint[] {
  if (hydrographs.length === 0) return [];
  if (hydrographs.length === 1) return [...hydrographs[0]];

  // Find the common time range
  const allTimes = new Set<number>();
  for (const hg of hydrographs) {
    for (const p of hg) allTimes.add(p.time);
  }
  const times = Array.from(allTimes).sort((a, b) => a - b);

  // Interpolate each hydrograph at each time and sum
  return times.map((t) => {
    let flow = 0;
    for (const hg of hydrographs) {
      flow += interpolateFlow(hg, t);
    }
    return { time: t, flow };
  });
}

/**
 * Interpolate flow at a given time from a hydrograph.
 */
function interpolateFlow(hg: HydrographPoint[], time: number): number {
  if (hg.length === 0) return 0;
  if (time <= hg[0].time) return hg[0].flow;
  if (time >= hg[hg.length - 1].time) return hg[hg.length - 1].flow;

  for (let i = 1; i < hg.length; i++) {
    if (time <= hg[i].time) {
      const frac = (time - hg[i - 1].time) / (hg[i].time - hg[i - 1].time);
      return hg[i - 1].flow + frac * (hg[i].flow - hg[i - 1].flow);
    }
  }
  return 0;
}

/**
 * Combine upstream hydrographs into a single inflow for a node.
 */
function getInflowHydrograph(
  nodeId: string,
  project: Project,
  results: Map<string, NodeResult>,
): HydrographPoint[] {
  const upstreamIds = getUpstreamNodes(nodeId, project.links);
  const hydrographs: HydrographPoint[][] = [];

  for (const uid of upstreamIds) {
    const result = results.get(uid);
    if (result && result.outflowHydrograph.length > 0) {
      hydrographs.push(result.outflowHydrograph);
    }
  }

  return sumHydrographs(hydrographs);
}

/**
 * Compute a single node's result.
 */
function computeNode(
  node: ProjectNode,
  event: RainfallEventDef,
  inflowHydrograph: HydrographPoint[],
): NodeResult {
  switch (node.type) {
    case "subcatchment": {
      const rainfallEvent: RainfallEvent = {
        label: event.label,
        stormType: event.stormType,
        totalDepth: event.totalDepth,
      };
      const result = computeSubcatchment(node.data, rainfallEvent);

      // If there's also upstream inflow, sum it with the generated runoff
      let outflowHydrograph = result.hydrograph.hydrograph;
      if (inflowHydrograph.length > 0) {
        outflowHydrograph = sumHydrographs([
          outflowHydrograph,
          inflowHydrograph,
        ]);
      }

      const peakOutflow = Math.max(...outflowHydrograph.map((p) => p.flow));
      const peakPoint = outflowHydrograph.find((p) => p.flow === peakOutflow);

      return {
        nodeId: node.id,
        outflowHydrograph,
        peakOutflow,
        timeToPeakOutflow: peakPoint?.time ?? 0,
        totalVolume: result.hydrograph.totalVolume,
      };
    }

    case "pond": {
      if (inflowHydrograph.length < 2) {
        return {
          nodeId: node.id,
          outflowHydrograph: [],
          peakOutflow: 0,
          timeToPeakOutflow: 0,
          totalVolume: 0,
        };
      }

      const pondInput: PondRoutingInput = {
        inflow: inflowHydrograph.map((p) => [p.time, p.flow] as [number, number]),
        stageStorage: node.data.stageStorage,
        outlets: node.data.outlets,
        initialWSE: node.data.initialWSE,
      };
      const result = routePond(pondInput);

      // Compute total volume from outflow
      let totalVolume = 0;
      for (let i = 1; i < result.timeSeries.length; i++) {
        const dt =
          result.timeSeries[i].time - result.timeSeries[i - 1].time;
        const avgFlow =
          (result.timeSeries[i].outflow + result.timeSeries[i - 1].outflow) / 2;
        totalVolume += avgFlow * dt * (3600 / 43560);
      }

      return {
        nodeId: node.id,
        outflowHydrograph: result.timeSeries.map((p) => ({
          time: p.time,
          flow: p.outflow,
        })),
        peakOutflow: result.peakOutflow,
        timeToPeakOutflow: result.timeToPeakOutflow,
        totalVolume,
        peakInflow: result.peakInflow,
        peakStage: result.peakStage,
        peakStorage: result.peakStorage,
      };
    }

    case "reach": {
      if (inflowHydrograph.length < 2) {
        return {
          nodeId: node.id,
          outflowHydrograph: [],
          peakOutflow: 0,
          timeToPeakOutflow: 0,
          totalVolume: 0,
        };
      }

      const reachInput: ReachRoutingInput = {
        length: node.data.length,
        manningsN: node.data.manningsN,
        slope: node.data.slope,
        shape: node.data.shape,
        inflow: inflowHydrograph,
      };
      const result = routeReach(reachInput);

      let totalVolume = 0;
      for (let i = 1; i < result.outflow.length; i++) {
        const dt = result.outflow[i].time - result.outflow[i - 1].time;
        const avgFlow =
          (result.outflow[i].flow + result.outflow[i - 1].flow) / 2;
        totalVolume += avgFlow * dt * (3600 / 43560);
      }

      return {
        nodeId: node.id,
        outflowHydrograph: result.outflow,
        peakOutflow: result.peakOutflow,
        timeToPeakOutflow: result.timeToPeakOutflow,
        totalVolume,
        peakInflow: Math.max(...inflowHydrograph.map((p) => p.flow)),
      };
    }

    case "junction": {
      const peakOutflow =
        inflowHydrograph.length > 0
          ? Math.max(...inflowHydrograph.map((p) => p.flow))
          : 0;
      const peakPoint = inflowHydrograph.find((p) => p.flow === peakOutflow);

      let totalVolume = 0;
      for (let i = 1; i < inflowHydrograph.length; i++) {
        const dt = inflowHydrograph[i].time - inflowHydrograph[i - 1].time;
        const avgFlow =
          (inflowHydrograph[i].flow + inflowHydrograph[i - 1].flow) / 2;
        totalVolume += avgFlow * dt * (3600 / 43560);
      }

      return {
        nodeId: node.id,
        outflowHydrograph: inflowHydrograph,
        peakOutflow,
        timeToPeakOutflow: peakPoint?.time ?? 0,
        totalVolume,
      };
    }
  }
}

/**
 * Run a full simulation on a project for a given rainfall event.
 */
export function runSimulation(
  project: Project,
  eventId: string,
): SimulationResult {
  const event = project.events.find((e) => e.id === eventId);
  if (!event) throw new Error(`Event '${eventId}' not found`);

  const order = topologicalSort(project.nodes, project.links);
  const nodeMap = new Map(project.nodes.map((n) => [n.id, n]));
  const results = new Map<string, NodeResult>();

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId)!;
    const inflowHydrograph = getInflowHydrograph(nodeId, project, results);
    const result = computeNode(node, event, inflowHydrograph);
    results.set(nodeId, result);
  }

  return { eventId, nodeResults: results };
}

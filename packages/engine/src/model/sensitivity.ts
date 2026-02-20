/**
 * Sensitivity Analysis & Goal-Seek
 *
 * - Goal-seek: find the orifice diameter or pond volume that achieves a target outflow
 * - Parameter sweep: run simulation across a range of parameter values
 */

import { type Project, type NodeResult } from "../model/project.js";
import { runSimulation } from "../model/system-router.js";

export interface GoalSeekResult {
  /** Whether a solution was found */
  converged: boolean;
  /** The parameter value that achieves the target */
  value: number;
  /** The achieved outflow at that parameter value */
  achievedFlow: number;
  /** Number of iterations */
  iterations: number;
  /** Target outflow */
  targetFlow: number;
}

/**
 * Find the orifice diameter that achieves a target peak outflow for a pond.
 * Uses bisection on the first orifice outlet of the specified pond node.
 *
 * @param project Base project
 * @param pondNodeId ID of the pond node to adjust
 * @param eventId Rainfall event to simulate
 * @param targetOutflow Target peak outflow in cfs
 * @param minDiameter Minimum orifice diameter to try (ft)
 * @param maxDiameter Maximum orifice diameter to try (ft)
 * @param tolerance Convergence tolerance in cfs (default 0.5)
 * @param maxIterations Max iterations (default 30)
 */
export function goalSeekOrificeDiameter(
  project: Project,
  pondNodeId: string,
  eventId: string,
  targetOutflow: number,
  minDiameter: number = 0.25,
  maxDiameter: number = 6.0,
  tolerance: number = 0.5,
  maxIterations: number = 30,
): GoalSeekResult {
  let lo = minDiameter;
  let hi = maxDiameter;
  let lastAchievedFlow = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    const mid = (lo + hi) / 2;

    // Clone project and set the orifice diameter
    const testProject = structuredClone(project);
    const pond = testProject.nodes.find((n: any) => n.id === pondNodeId);
    if (!pond || pond.type !== "pond") {
      return { converged: false, value: mid, achievedFlow: lastAchievedFlow, iterations: iter, targetFlow: targetOutflow };
    }

    const orifice = (pond as any).data.outlets.find((o: any) => o.type === "orifice");
    if (!orifice) {
      return { converged: false, value: mid, achievedFlow: lastAchievedFlow, iterations: iter, targetFlow: targetOutflow };
    }

    orifice.diameter = mid;

    let peakOutflow: number;
    try {
      const result = runSimulation(testProject, eventId);
      const pondResult = result.nodeResults.get(pondNodeId);
      if (!pondResult) {
        return { converged: false, value: mid, achievedFlow: lastAchievedFlow, iterations: iter, targetFlow: targetOutflow };
      }
      peakOutflow = pondResult.peakOutflow;
    } catch {
      return { converged: false, value: mid, achievedFlow: lastAchievedFlow, iterations: iter, targetFlow: targetOutflow };
    }

    lastAchievedFlow = peakOutflow;

    if (Math.abs(peakOutflow - targetOutflow) < tolerance) {
      return { converged: true, value: mid, achievedFlow: peakOutflow, iterations: iter + 1, targetFlow: targetOutflow };
    }

    // Larger orifice → more outflow; smaller orifice → less outflow
    if (peakOutflow > targetOutflow) {
      hi = mid; // need smaller orifice
    } else {
      lo = mid; // need larger orifice
    }
  }

  const finalDiam = (lo + hi) / 2;
  return { converged: false, value: finalDiam, achievedFlow: lastAchievedFlow, iterations: maxIterations, targetFlow: targetOutflow };
}

export interface SweepPoint {
  paramValue: number;
  peakOutflow: number;
  peakStage?: number;
  totalVolume: number;
}

/**
 * Run a parameter sweep on orifice diameter and collect results.
 */
export function sweepOrificeDiameter(
  project: Project,
  pondNodeId: string,
  eventId: string,
  minDiameter: number,
  maxDiameter: number,
  steps: number = 10,
): SweepPoint[] {
  const results: SweepPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const diam = minDiameter + ((maxDiameter - minDiameter) * i) / steps;

    const testProject = structuredClone(project);
    const pond = testProject.nodes.find((n: any) => n.id === pondNodeId);
    if (!pond || pond.type !== "pond") continue;

    const orifice = (pond as any).data.outlets.find((o: any) => o.type === "orifice");
    if (!orifice) continue;

    orifice.diameter = diam;

    try {
      const simResult = runSimulation(testProject, eventId);
      const pondResult = simResult.nodeResults.get(pondNodeId);
      if (!pondResult) continue;

      results.push({
        paramValue: diam,
        peakOutflow: pondResult.peakOutflow,
        peakStage: pondResult.peakStage,
        totalVolume: pondResult.totalVolume,
      });
    } catch {
      continue;
    }
  }

  return results;
}

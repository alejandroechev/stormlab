#!/usr/bin/env node
/**
 * StormLab Engine CLI — runs simulations from project JSON files.
 *
 * Usage: npx ts-node cli/run.ts <project.json> [--event <eventId>] [--json]
 */

import { readFileSync } from "fs";
import { type Project } from "../src/model/project.js";
import { validateProject } from "../src/model/project.js";
import { runSimulation } from "../src/model/system-router.js";

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(`
StormLab Engine CLI

Usage:
  stormlab-cli <project.json> [options]

Options:
  --event <id>   Run a specific rainfall event (default: first event)
  --json         Output results as JSON
  --validate     Only validate the project, don't run simulation
  --help         Show this help
    `);
    process.exit(0);
  }

  const projectFile = args[0];
  const eventIdx = args.indexOf("--event");
  const eventId = eventIdx >= 0 ? args[eventIdx + 1] : undefined;
  const jsonOutput = args.includes("--json");
  const validateOnly = args.includes("--validate");

  // Load project
  let projectJson: string;
  try {
    projectJson = readFileSync(projectFile, "utf-8");
  } catch (err) {
    console.error(`Error: Could not read file '${projectFile}'`);
    process.exit(1);
  }

  let project: Project;
  try {
    project = JSON.parse(projectJson);
  } catch {
    console.error("Error: Invalid JSON in project file");
    process.exit(1);
  }

  // Validate
  const errors = validateProject(project);
  if (errors.length > 0) {
    console.error("Validation errors:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  if (validateOnly) {
    console.log("Project is valid.");
    process.exit(0);
  }

  // Run simulation
  const targetEventId = eventId ?? project.events[0]?.id;
  if (!targetEventId) {
    console.error("Error: No rainfall events defined in project");
    process.exit(1);
  }

  console.log(
    `Running simulation: ${project.name} — Event: ${targetEventId}`,
  );
  console.log("---");

  const result = runSimulation(project, targetEventId);

  if (jsonOutput) {
    // Convert Map to plain object for JSON serialization
    const output = {
      eventId: result.eventId,
      nodes: Object.fromEntries(
        Array.from(result.nodeResults.entries()).map(([id, r]) => [
          id,
          {
            ...r,
            outflowHydrograph: undefined, // omit full hydrograph for brevity
          },
        ]),
      ),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Human-readable summary table
    console.log(
      "Node".padEnd(20) +
        "Type".padEnd(14) +
        "Peak Qin".padStart(12) +
        "Peak Qout".padStart(12) +
        "Tp (hr)".padStart(10) +
        "Vol (ac-ft)".padStart(12),
    );
    console.log("-".repeat(80));

    for (const node of project.nodes) {
      const r = result.nodeResults.get(node.id);
      if (!r) continue;
      const qin = r.peakInflow !== undefined ? r.peakInflow.toFixed(1) : "-";
      console.log(
        node.name.padEnd(20) +
          node.type.padEnd(14) +
          qin.padStart(12) +
          r.peakOutflow.toFixed(1).padStart(12) +
          r.timeToPeakOutflow.toFixed(2).padStart(10) +
          r.totalVolume.toFixed(2).padStart(12),
      );
    }
  }
}

main();

/**
 * Inline validation warnings shown on diagram nodes.
 */
import type { Project, ProjectNode } from "@hydrocad/engine";

export interface ValidationWarning {
  nodeId: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Validate a project and return per-node warnings for diagram display.
 */
export function getNodeWarnings(project: Project): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const nodeIds = new Set(project.nodes.map((n) => n.id));

  // Check for disconnected nodes (no incoming or outgoing links)
  for (const node of project.nodes) {
    const hasIncoming = project.links.some((l) => l.to === node.id);
    const hasOutgoing = project.links.some((l) => l.from === node.id);

    if (!hasIncoming && !hasOutgoing) {
      warnings.push({
        nodeId: node.id,
        message: "Disconnected node",
        severity: "warning",
      });
    }

    // Type-specific validation
    if (node.type === "subcatchment") {
      if (!node.data.subAreas || node.data.subAreas.length === 0) {
        warnings.push({
          nodeId: node.id,
          message: "No sub-areas defined",
          severity: "error",
        });
      }
      const totalArea = node.data.subAreas?.reduce(
        (s: number, a: { area: number }) => s + a.area,
        0,
      );
      if (totalArea === 0) {
        warnings.push({
          nodeId: node.id,
          message: "Total area is zero",
          severity: "error",
        });
      }
      if (
        node.data.tcOverride === undefined &&
        (!node.data.flowSegments || node.data.flowSegments.length === 0)
      ) {
        warnings.push({
          nodeId: node.id,
          message: "No Tc defined (set override or flow segments)",
          severity: "warning",
        });
      }
    }

    if (node.type === "pond") {
      if (!node.data.stageStorage || node.data.stageStorage.length < 2) {
        warnings.push({
          nodeId: node.id,
          message: "Insufficient stage-storage data",
          severity: "error",
        });
      }
      if (!node.data.outlets || node.data.outlets.length === 0) {
        warnings.push({
          nodeId: node.id,
          message: "No outlet structures defined",
          severity: "warning",
        });
      }
      if (!hasIncoming) {
        warnings.push({
          nodeId: node.id,
          message: "Pond has no inflow connection",
          severity: "warning",
        });
      }
    }
  }

  // Check for invalid link references
  for (const link of project.links) {
    if (!nodeIds.has(link.from)) {
      warnings.push({
        nodeId: link.from,
        message: `Link source '${link.from}' not found`,
        severity: "error",
      });
    }
    if (!nodeIds.has(link.to)) {
      warnings.push({
        nodeId: link.to,
        message: `Link target '${link.to}' not found`,
        severity: "error",
      });
    }
  }

  // Check for events
  if (project.events.length === 0) {
    // Global warning — attach to first node
    if (project.nodes.length > 0) {
      warnings.push({
        nodeId: project.nodes[0].id,
        message: "No rainfall events defined",
        severity: "error",
      });
    }
  }

  return warnings;
}

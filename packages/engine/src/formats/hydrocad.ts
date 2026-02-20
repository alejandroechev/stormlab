/**
 * HydroCAD .hcp file format import/export.
 *
 * Format structure (INI-like, plain ASCII):
 *   [HydroCAD]          — project header with settings
 *   [EVENT]             — rainfall events (one per block)
 *   [NODE]              — nodes: subcatchments (S), ponds (P), reaches (R), links (L)
 *     [AREA]            — sub-area within a subcatchment (CN, area, description)
 *     [TC]              — time of concentration flow segment
 *     [STAGE]           — stage-storage or stage-area point
 *     [DEVICE]          — outlet device within a pond
 *
 * Reverse-engineered from the official sample file:
 *   https://www.hydrocad.net/download/projects/Mountain%20View%20Housing%20Complex%20Rev.%20G.hcp.txt
 */

import type { Project, ProjectNode, ProjectLink, SubcatchmentNode, PondNode, ReachNode } from "../model/project.js";
import type { SubArea, SoilGroup } from "../hydrology/curve-number.js";
import type { FlowSegment } from "../hydrology/time-of-concentration.js";
import type { StageStoragePoint } from "../hydraulics/stage-storage.js";
import type { OutletStructure } from "../hydraulics/outlet-structures.js";

// ─── Parser ───────────────────────────────────────────────────────

interface HCPBlock {
  type: string; // HydroCAD, EVENT, NODE, AREA, TC, STAGE, DEVICE
  props: Map<string, string>;
  children: HCPBlock[];
}

function parseHCP(text: string): HCPBlock[] {
  const blocks: HCPBlock[] = [];
  let parentNode: HCPBlock | null = null;
  let currentChild: HCPBlock | null = null;

  const topSections = new Set(["HYDROCAD", "EVENT", "NODE"]);
  const subSections = new Set(["AREA", "TC", "STAGE", "DEVICE"]);

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;

    const sectionMatch = trimmed.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].toUpperCase();

      if (topSections.has(sectionName)) {
        currentChild = null;
        if (parentNode) blocks.push(parentNode);
        parentNode = { type: sectionName, props: new Map(), children: [] };
      } else if (subSections.has(sectionName) && parentNode) {
        currentChild = { type: sectionName, props: new Map(), children: [] };
        parentNode.children.push(currentChild);
      }
      continue;
    }

    // Key=Value property
    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch) {
      const target = currentChild || parentNode;
      if (target) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        if (target.props.has(key)) {
          target.props.set(key, target.props.get(key) + " " + value);
        } else {
          target.props.set(key, value);
        }
      }
    }
  }

  if (parentNode) blocks.push(parentNode);
  return blocks;
}

function getFloat(props: Map<string, string>, key: string, def: number = 0): number {
  return parseFloat(props.get(key) ?? "") || def;
}

function getString(props: Map<string, string>, key: string, def: string = ""): string {
  return props.get(key) ?? def;
}

// ─── Import ───────────────────────────────────────────────────────

export function importHydroCAD(hcpText: string): Project {
  const blocks = parseHCP(hcpText);
  const nodes: ProjectNode[] = [];
  const links: ProjectLink[] = [];
  const events: Project["events"] = [];

  // Find project header
  const header = blocks.find((b) => b.type === "HYDROCAD");
  const projectName = getString(header?.props ?? new Map(), "Name", "HydroCAD Import");

  // Parse events
  for (const block of blocks.filter((b) => b.type === "EVENT")) {
    const label = getString(block.props, "RainEvent", "Unknown");
    const stormType = getString(block.props, "StormType", "Type II 24-hr");
    // StormDepth is in feet in HydroCAD — convert to inches
    const depthFt = getFloat(block.props, "StormDepth", 0);
    const depthIn = depthFt * 12;

    let scsType: "I" | "IA" | "II" | "III" = "II";
    if (stormType.includes("IA")) scsType = "IA";
    else if (stormType.includes("III")) scsType = "III";
    else if (stormType.includes("I") && !stormType.includes("II")) scsType = "I";

    events.push({
      id: label.replace(/\s+/g, "-").toLowerCase(),
      label,
      stormType: scsType,
      totalDepth: depthIn,
    });
  }

  if (events.length === 0) {
    events.push({ id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 });
  }

  // Parse nodes
  for (const block of blocks.filter((b) => b.type === "NODE")) {
    const number = getString(block.props, "Number", "?");
    const type = getString(block.props, "Type", "").toLowerCase();
    const name = getString(block.props, "Name", number);
    const x = getFloat(block.props, "XYPos", 0);
    const yStr = getString(block.props, "XYPos", "0 0");
    const xyParts = yStr.split(/\s+/);
    const xPos = (parseFloat(xyParts[0]) || 0) * 80 + 400;
    const yPos = (parseFloat(xyParts[1]) || 0) * 80 + 100;

    const outflows = block.props.get("Outflow");
    const outflowList = outflows
      ? outflows.split(/\s+/).filter((s) => s && s !== "=")
      : [];

    if (type === "subcat") {
      // Parse sub-areas
      const subAreas: SubArea[] = [];
      for (const child of block.children.filter((c) => c.type === "AREA")) {
        const areaSqFt = getFloat(child.props, "Area", 43560);
        const cn = parseInt(getString(child.props, "CN", "75"));
        const desc = getString(child.props, "Desc", "");
        // Extract soil group from CNindex (e.g., "5B" → "B") or desc
        let soilGroup: SoilGroup = "B";
        const cnIndex = getString(child.props, "CNindex", "");
        const sgMatch = cnIndex.match(/([ABCD])$/);
        if (sgMatch) soilGroup = sgMatch[1] as SoilGroup;

        subAreas.push({
          description: desc,
          soilGroup,
          cn,
          area: areaSqFt / 43560, // sq ft to acres
        });
      }

      // Parse Tc segments
      const flowSegments: FlowSegment[] = [];
      let tcOverride: number | undefined;

      for (const child of block.children.filter((c) => c.type === "TC")) {
        const method = getString(child.props, "Method", "").toLowerCase();

        if (method === "sheet") {
          flowSegments.push({
            type: "sheet",
            manningsN: getFloat(child.props, "n", 0.24),
            length: getFloat(child.props, "Length", 100),
            rainfall2yr: getFloat(child.props, "P2", 3.0) * 12, // feet to inches
            slope: getFloat(child.props, "Slope", 0.01),
          });
        } else if (method === "shallow") {
          flowSegments.push({
            type: "shallow",
            length: getFloat(child.props, "Length", 500),
            slope: getFloat(child.props, "Slope", 0.01),
            surface: getString(child.props, "Surface", "").toLowerCase().includes("paved")
              ? "paved"
              : "unpaved",
          });
        } else if (
          method === "channel" ||
          method === "trap" ||
          method === "parabol" ||
          method === "pipe"
        ) {
          flowSegments.push({
            type: "channel",
            length: getFloat(child.props, "Length", 500),
            wettedPerimeter: getFloat(child.props, "Perim", 10),
            area: getFloat(child.props, "Area", 5),
            manningsN: getFloat(child.props, "n", 0.035),
            slope: getFloat(child.props, "Slope", 0.005),
          });
        } else if (method === "direct") {
          tcOverride = getFloat(child.props, "Tc", 1800) / 3600; // seconds to hours
        } else if (method === "lag") {
          // Lag method: approximate Tc from lag
          const length = getFloat(child.props, "Length", 500);
          const slope = getFloat(child.props, "Slope", 0.01);
          tcOverride = (length / (3600 * Math.sqrt(slope))) * 0.6;
          if (tcOverride > 10) tcOverride = 0.5; // sanity check
        }
      }

      const id = number;
      nodes.push({
        type: "subcatchment",
        id,
        name,
        position: { x: xPos, y: yPos },
        data: {
          id,
          name,
          subAreas: subAreas.length > 0
            ? subAreas
            : [{ description: name, soilGroup: "B", cn: 75, area: 10 }],
          flowSegments,
          tcOverride,
        },
      });

      for (const outflow of outflowList) {
        if (outflow) links.push({ id: `L-${id}-${outflow}`, from: id, to: outflow });
      }
    } else if (type === "pond") {
      // Parse stage-storage
      const stageStorage: StageStoragePoint[] = [];
      for (const child of block.children.filter((c) => c.type === "STAGE")) {
        const elev = getFloat(child.props, "Elev", 0);
        const areaSqFt = getFloat(child.props, "Area", 0);
        // HydroCAD stores stage-area, we need to accumulate to stage-storage
        stageStorage.push({ stage: elev, storage: areaSqFt }); // will convert below
      }

      // Convert stage-area to stage-storage using trapezoidal integration
      if (stageStorage.length > 1) {
        let cumStorage = 0;
        const converted: StageStoragePoint[] = [{ stage: stageStorage[0].stage, storage: 0 }];
        for (let i = 1; i < stageStorage.length; i++) {
          const dh = stageStorage[i].stage - stageStorage[i - 1].stage;
          const avgArea = (stageStorage[i].storage + stageStorage[i - 1].storage) / 2;
          cumStorage += avgArea * dh;
          converted.push({ stage: stageStorage[i].stage, storage: cumStorage });
        }
        stageStorage.length = 0;
        stageStorage.push(...converted);
      }

      // Parse outlet devices
      const outlets: OutletStructure[] = [];
      for (const child of block.children.filter((c) => c.type === "DEVICE")) {
        const devType = getString(child.props, "Type", "").toLowerCase();
        const invert = getFloat(child.props, "Invert", 100);

        if (devType === "orifice") {
          outlets.push({
            type: "orifice",
            coefficient: getFloat(child.props, "C", 0.6),
            diameter: getFloat(child.props, "Diam", 1.0),
            centerElevation: invert,
          });
        } else if (devType === "culvert") {
          // Treat culvert as orifice for simplified import
          outlets.push({
            type: "orifice",
            coefficient: getFloat(child.props, "CC", 0.9) * 0.6,
            diameter: getFloat(child.props, "Diam", 2.0),
            centerElevation: invert,
          });
        } else if (devType.includes("weir") || devType === "bcrweir" || devType === "scvweir") {
          if (devType === "scvweir" || devType.includes("vnotch") || devType.includes("scv")) {
            outlets.push({
              type: "vnotch-weir",
              coefficient: getFloat(child.props, "C", 2.49),
              angle: getFloat(child.props, "Angle", 90),
              crestElevation: invert,
            });
          } else {
            outlets.push({
              type: "weir",
              subtype: "broad-crested",
              coefficient: 2.85,
              length: getFloat(child.props, "Length", 10),
              crestElevation: invert,
            });
          }
        }
      }

      const initialWSE = stageStorage.length > 0 ? stageStorage[0].stage : 100;
      const id = number;

      nodes.push({
        type: "pond",
        id,
        name,
        position: { x: xPos, y: yPos },
        data: {
          stageStorage: stageStorage.length > 1
            ? stageStorage
            : [{ stage: 100, storage: 0 }, { stage: 105, storage: 25000 }, { stage: 110, storage: 60000 }],
          outlets: outlets.length > 0
            ? outlets
            : [{ type: "orifice", coefficient: 0.6, diameter: 1, centerElevation: initialWSE + 0.5 }],
          initialWSE,
        },
      });

      for (const outflow of outflowList) {
        if (outflow) links.push({ id: `L-${id}-${outflow}`, from: id, to: outflow });
      }
    } else if (type === "reach") {
      const id = number;
      const length = getFloat(block.props, "Length", 500);
      const n = getFloat(block.props, "n", 0.035);
      const diam = getFloat(block.props, "Diam", 0);
      const botWidth = getFloat(block.props, "BotWidth", 0);
      const topWidth = getFloat(block.props, "TopWidth", 0);
      const depth = getFloat(block.props, "Depth", 2);
      const inletInvert = getFloat(block.props, "InletInvert", 100);
      const outletInvert = getFloat(block.props, "OutletInvert", 95);
      const slope = length > 0 ? Math.abs(inletInvert - outletInvert) / length : 0.005;

      let shape: ReachNode["data"]["shape"];
      if (diam > 0) {
        shape = { type: "circular", diameter: diam };
      } else if (botWidth > 0) {
        shape = { type: "trapezoidal", bottomWidth: botWidth, sideSlope: 2 };
      } else if (topWidth > 0) {
        shape = { type: "rectangular", width: topWidth };
      } else {
        shape = { type: "trapezoidal", bottomWidth: 4, sideSlope: 2 };
      }

      nodes.push({
        type: "reach",
        id,
        name,
        position: { x: xPos, y: yPos },
        data: { length, manningsN: n, slope, shape },
      });

      for (const outflow of outflowList) {
        if (outflow) links.push({ id: `L-${id}-${outflow}`, from: id, to: outflow });
      }
    } else if (type === "link") {
      // Links become junctions (hydrograph input points)
      const id = number;
      nodes.push({
        type: "junction",
        id,
        name,
        position: { x: xPos, y: yPos },
      });

      for (const outflow of outflowList) {
        if (outflow) links.push({ id: `L-${id}-${outflow}`, from: id, to: outflow });
      }
    }
  }

  // Filter valid links
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validLinks = links.filter((l) => nodeIds.has(l.from) && nodeIds.has(l.to));

  return {
    id: `hcp-import-${Date.now()}`,
    name: projectName,
    description: "Imported from HydroCAD .hcp file",
    nodes,
    links: validLinks,
    events,
  };
}

// ─── Export ───────────────────────────────────────────────────────

export function exportHydroCAD(project: Project): string {
  const lines: string[] = [];

  lines.push("[HydroCAD]");
  lines.push("FileUnits=English");
  lines.push("CalcUnits=English");
  lines.push(`Name=${project.name}`);
  lines.push("RunoffMethod=SCS TR-20");
  lines.push("PondMethod=Stor-Ind");
  lines.push("UH=SCS");
  lines.push("");

  for (const event of project.events) {
    lines.push("[EVENT]");
    lines.push(`RainEvent=${event.label}`);
    const stormTypeStr = event.stormType === "IA" ? "Type IA 24-hr" :
      event.stormType === "III" ? "Type III 24-hr" :
      event.stormType === "I" ? "Type I 24-hr" : "Type II 24-hr";
    lines.push(`StormType=${stormTypeStr}`);
    lines.push("StormDurat=86400");
    lines.push(`StormDepth=${(event.totalDepth / 12).toFixed(6)}`); // inches to feet
    lines.push("");
  }

  let nodeNum = 1;
  for (const node of project.nodes) {
    lines.push("[NODE]");

    if (node.type === "subcatchment") {
      lines.push(`Number=${node.id}`);
      lines.push("Type=Subcat");
      lines.push(`Name=${node.name}`);
      lines.push(`XYPos=${((node.position.x - 400) / 80).toFixed(2)} ${((node.position.y - 100) / 80).toFixed(2)}`);

      const downstream = project.links.find((l) => l.from === node.id);
      if (downstream) lines.push(`Outflow=${downstream.to}`);

      for (const sa of node.data.subAreas) {
        lines.push("[AREA]");
        lines.push(`Area=${Math.round(sa.area * 43560)}`); // acres to sq ft
        lines.push(`CN=${sa.cn}`);
        lines.push(`Desc=${sa.description}`);
      }

      if (node.data.tcOverride !== undefined) {
        lines.push("[TC]");
        lines.push("Method=Direct");
        lines.push(`Tc=${Math.round(node.data.tcOverride * 3600)}`); // hours to seconds
      }

      for (const seg of node.data.flowSegments) {
        lines.push("[TC]");
        if (seg.type === "sheet") {
          lines.push("Method=Sheet");
          lines.push(`Length=${seg.length}`);
          lines.push(`Slope=${seg.slope}`);
          lines.push(`n=${seg.manningsN}`);
          lines.push(`P2=${(seg.rainfall2yr / 12).toFixed(4)}`); // inches to feet
        } else if (seg.type === "shallow") {
          lines.push("Method=Shallow");
          lines.push(`Length=${seg.length}`);
          lines.push(`Slope=${seg.slope}`);
          lines.push(`Surface=${seg.surface === "paved" ? "Paved" : "Unpaved"}`);
        } else if (seg.type === "channel") {
          lines.push("Method=Channel");
          lines.push(`Length=${seg.length}`);
          lines.push(`Slope=${seg.slope}`);
          lines.push(`n=${seg.manningsN}`);
          lines.push(`Area=${seg.area}`);
          lines.push(`Perim=${seg.wettedPerimeter}`);
        }
      }
    } else if (node.type === "pond") {
      lines.push(`Number=${node.id}`);
      lines.push("Type=Pond");
      lines.push(`Name=${node.name}`);
      lines.push(`XYPos=${((node.position.x - 400) / 80).toFixed(2)} ${((node.position.y - 100) / 80).toFixed(2)}`);

      const downstream = project.links.find((l) => l.from === node.id);
      if (downstream) lines.push(`Outflow=${downstream.to}`);

      for (const pt of node.data.stageStorage) {
        lines.push("[STAGE]");
        lines.push(`Elev=${pt.stage}`);
        lines.push(`Area=${Math.round(pt.storage)}`); // approximate
      }

      for (const outlet of node.data.outlets) {
        lines.push("[DEVICE]");
        if (outlet.type === "orifice") {
          lines.push("Type=Orifice");
          lines.push("Routing=Primary");
          lines.push(`Invert=${outlet.centerElevation}`);
          lines.push(`Diam=${outlet.diameter}`);
          lines.push(`C=${outlet.coefficient}`);
        } else if (outlet.type === "weir") {
          lines.push("Type=BCRWeir");
          lines.push("Routing=Primary");
          lines.push(`Invert=${outlet.crestElevation}`);
          lines.push(`Length=${outlet.length}`);
        } else if (outlet.type === "vnotch-weir") {
          lines.push("Type=SCVWeir");
          lines.push("Routing=Primary");
          lines.push(`Invert=${outlet.crestElevation}`);
          lines.push(`Angle=${outlet.angle}`);
          lines.push(`C=${outlet.coefficient}`);
        }
      }
    } else if (node.type === "reach") {
      lines.push(`Number=${node.id}`);
      lines.push("Type=Reach");
      lines.push(`Name=${node.name}`);
      lines.push(`XYPos=${((node.position.x - 400) / 80).toFixed(2)} ${((node.position.y - 100) / 80).toFixed(2)}`);

      const downstream = project.links.find((l) => l.from === node.id);
      if (downstream) lines.push(`Outflow=${downstream.to}`);

      if (node.data.shape.type === "circular") {
        lines.push(`Diam=${node.data.shape.diameter}`);
      } else if (node.data.shape.type === "trapezoidal") {
        lines.push(`BotWidth=${node.data.shape.bottomWidth}`);
      } else if (node.data.shape.type === "rectangular") {
        lines.push(`TopWidth=${node.data.shape.width}`);
      }
      lines.push(`Length=${node.data.length}`);
      lines.push(`n=${node.data.manningsN}`);
      const invert = 100;
      lines.push(`InletInvert=${invert}`);
      lines.push(`OutletInvert=${(invert - node.data.length * node.data.slope).toFixed(2)}`);
    } else if (node.type === "junction") {
      lines.push(`Number=${node.id}`);
      lines.push("Type=Link");
      lines.push(`Name=${node.name}`);
      const downstream = project.links.find((l) => l.from === node.id);
      if (downstream) lines.push(`Outflow=${downstream.to}`);
    }

    lines.push("");
    nodeNum++;
  }

  return lines.join("\n");
}

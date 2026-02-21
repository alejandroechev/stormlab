/**
 * Sample stormwater projects for quick-start demos.
 */
import type { Project } from "@stormlab/engine";

export interface SampleProject {
  id: string;
  name: string;
  description: string;
  data: Project;
}

const simpleDetentionPond: SampleProject = {
  id: "simple-detention",
  name: "Simple Detention Pond",
  description: "1 subcatchment (10 ac, CN 75) → detention pond → outfall. Basic intro scenario.",
  data: {
    id: "sample-simple-detention",
    name: "Simple Detention Pond",
    description: "Introductory example: single subcatchment draining to a detention pond with orifice outlet.",
    nodes: [
      {
        id: "sc1",
        name: "Meadow Area",
        type: "subcatchment",
        position: { x: 300, y: 80 },
        data: {
          id: "sc1",
          name: "Meadow Area",
          subAreas: [
            { description: "Open meadow", soilGroup: "B", cn: 75, area: 10 },
          ],
          flowSegments: [
            { type: "sheet", manningsN: 0.15, length: 200, rainfall2yr: 3.6, slope: 0.03 },
            { type: "shallow", length: 800, slope: 0.02, surface: "unpaved" },
          ],
        },
      },
      {
        id: "pond1",
        name: "Detention Pond",
        type: "pond",
        position: { x: 300, y: 280 },
        data: {
          stageStorage: [
            { stage: 100, storage: 0 },
            { stage: 101, storage: 8000 },
            { stage: 102, storage: 22000 },
            { stage: 103, storage: 45000 },
            { stage: 104, storage: 78000 },
            { stage: 105, storage: 120000 },
          ],
          outlets: [
            { type: "orifice", coefficient: 0.6, diameter: 1.0, centerElevation: 100.5 },
            { type: "weir", subtype: "broad-crested", coefficient: 2.85, length: 8, crestElevation: 104 },
          ],
          initialWSE: 100,
        },
      },
      {
        id: "j-out",
        name: "Outfall",
        type: "junction",
        position: { x: 300, y: 480 },
      },
    ],
    links: [
      { id: "l1", from: "sc1", to: "pond1" },
      { id: "l2", from: "pond1", to: "j-out" },
    ],
    events: [
      { id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 },
      { id: "100yr", label: "100-Year Storm", stormType: "II", totalDepth: 8.5 },
    ],
  },
};

const commercialDevelopment: SampleProject = {
  id: "commercial-dev",
  name: "Commercial Development",
  description: "Parking lot + landscaping → junction → detention pond with orifice & weir → outfall.",
  data: {
    id: "sample-commercial-dev",
    name: "Commercial Development",
    description: "Two subcatchments (impervious parking and pervious landscaping) routed through a detention pond.",
    nodes: [
      {
        id: "sc-parking",
        name: "Parking Lot",
        type: "subcatchment",
        position: { x: 160, y: 80 },
        data: {
          id: "sc-parking",
          name: "Parking Lot",
          subAreas: [
            { description: "Asphalt parking", soilGroup: "D", cn: 98, area: 3.5 },
          ],
          flowSegments: [
            { type: "sheet", manningsN: 0.011, length: 80, rainfall2yr: 3.6, slope: 0.01 },
            { type: "shallow", length: 400, slope: 0.015, surface: "paved" },
          ],
        },
      },
      {
        id: "sc-landscape",
        name: "Landscaping",
        type: "subcatchment",
        position: { x: 480, y: 80 },
        data: {
          id: "sc-landscape",
          name: "Landscaping",
          subAreas: [
            { description: "Grass and gardens", soilGroup: "B", cn: 65, area: 2.0 },
          ],
          flowSegments: [
            { type: "sheet", manningsN: 0.24, length: 150, rainfall2yr: 3.6, slope: 0.04 },
            { type: "shallow", length: 300, slope: 0.025, surface: "unpaved" },
          ],
        },
      },
      {
        id: "junc1",
        name: "Site Junction",
        type: "junction",
        position: { x: 320, y: 260 },
      },
      {
        id: "pond-det",
        name: "Detention Basin",
        type: "pond",
        position: { x: 320, y: 420 },
        data: {
          stageStorage: [
            { stage: 200, storage: 0 },
            { stage: 201, storage: 5000 },
            { stage: 202, storage: 16000 },
            { stage: 203, storage: 34000 },
            { stage: 204, storage: 60000 },
            { stage: 205, storage: 95000 },
          ],
          outlets: [
            { type: "orifice", coefficient: 0.6, diameter: 0.75, centerElevation: 200.5 },
            { type: "weir", subtype: "sharp-crested", coefficient: 3.33, length: 6, crestElevation: 204 },
          ],
          initialWSE: 200,
        },
      },
      {
        id: "j-out",
        name: "Outfall",
        type: "junction",
        position: { x: 320, y: 580 },
      },
    ],
    links: [
      { id: "l1", from: "sc-parking", to: "junc1" },
      { id: "l2", from: "sc-landscape", to: "junc1" },
      { id: "l3", from: "junc1", to: "pond-det" },
      { id: "l4", from: "pond-det", to: "j-out" },
    ],
    events: [
      { id: "10yr", label: "10-Year Storm", stormType: "II", totalDepth: 4.8 },
      { id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 },
      { id: "100yr", label: "100-Year Storm", stormType: "II", totalDepth: 8.5 },
    ],
  },
};

const subdivisionLayout: SampleProject = {
  id: "subdivision",
  name: "Subdivision Layout",
  description: "3 subcatchments (roofs, streets, lawns) → reach → regional pond → outfall.",
  data: {
    id: "sample-subdivision",
    name: "Residential Subdivision",
    description: "Multiple land-use subcatchments route through a channel reach to a regional detention pond.",
    nodes: [
      {
        id: "sc-roofs",
        name: "Rooftops",
        type: "subcatchment",
        position: { x: 100, y: 60 },
        data: {
          id: "sc-roofs",
          name: "Rooftops",
          subAreas: [
            { description: "Residential roofs", soilGroup: "D", cn: 98, area: 4.0 },
          ],
          flowSegments: [
            { type: "sheet", manningsN: 0.011, length: 50, rainfall2yr: 3.4, slope: 0.02 },
            { type: "shallow", length: 200, slope: 0.02, surface: "paved" },
          ],
        },
      },
      {
        id: "sc-streets",
        name: "Streets & Driveways",
        type: "subcatchment",
        position: { x: 340, y: 60 },
        data: {
          id: "sc-streets",
          name: "Streets & Driveways",
          subAreas: [
            { description: "Asphalt roads", soilGroup: "D", cn: 98, area: 3.0 },
            { description: "Gravel shoulders", soilGroup: "C", cn: 82, area: 0.5 },
          ],
          flowSegments: [
            { type: "sheet", manningsN: 0.016, length: 75, rainfall2yr: 3.4, slope: 0.015 },
            { type: "shallow", length: 600, slope: 0.012, surface: "paved" },
          ],
        },
      },
      {
        id: "sc-lawns",
        name: "Lawns & Open Space",
        type: "subcatchment",
        position: { x: 580, y: 60 },
        data: {
          id: "sc-lawns",
          name: "Lawns & Open Space",
          subAreas: [
            { description: "Residential lawns (good condition)", soilGroup: "B", cn: 61, area: 8.0 },
            { description: "Common open space", soilGroup: "B", cn: 58, area: 3.0 },
          ],
          flowSegments: [
            { type: "sheet", manningsN: 0.24, length: 200, rainfall2yr: 3.4, slope: 0.035 },
            { type: "shallow", length: 500, slope: 0.02, surface: "unpaved" },
          ],
        },
      },
      {
        id: "junc-collect",
        name: "Collection Point",
        type: "junction",
        position: { x: 340, y: 220 },
      },
      {
        id: "reach1",
        name: "Drainage Swale",
        type: "reach",
        position: { x: 340, y: 370 },
        data: {
          length: 1200,
          manningsN: 0.035,
          slope: 0.008,
          shape: { type: "trapezoidal", bottomWidth: 4, sideSlope: 3 },
        },
      },
      {
        id: "pond-regional",
        name: "Regional Pond",
        type: "pond",
        position: { x: 340, y: 520 },
        data: {
          stageStorage: [
            { stage: 150, storage: 0 },
            { stage: 151, storage: 12000 },
            { stage: 152, storage: 35000 },
            { stage: 153, storage: 72000 },
            { stage: 154, storage: 125000 },
            { stage: 155, storage: 195000 },
            { stage: 156, storage: 280000 },
          ],
          outlets: [
            { type: "orifice", coefficient: 0.6, diameter: 1.5, centerElevation: 150.75 },
            { type: "vnotch-weir", coefficient: 2.5, angle: 90, crestElevation: 153 },
            { type: "weir", subtype: "broad-crested", coefficient: 2.85, length: 12, crestElevation: 155 },
          ],
          initialWSE: 150,
        },
      },
      {
        id: "j-out",
        name: "Outfall",
        type: "junction",
        position: { x: 340, y: 680 },
      },
    ],
    links: [
      { id: "l1", from: "sc-roofs", to: "junc-collect" },
      { id: "l2", from: "sc-streets", to: "junc-collect" },
      { id: "l3", from: "sc-lawns", to: "junc-collect" },
      { id: "l4", from: "junc-collect", to: "reach1" },
      { id: "l5", from: "reach1", to: "pond-regional" },
      { id: "l6", from: "pond-regional", to: "j-out" },
    ],
    events: [
      { id: "2yr", label: "2-Year Storm", stormType: "II", totalDepth: 3.4 },
      { id: "10yr", label: "10-Year Storm", stormType: "II", totalDepth: 4.8 },
      { id: "100yr", label: "100-Year Storm", stormType: "II", totalDepth: 8.5 },
    ],
  },
};

const prePostComparison: SampleProject = {
  id: "pre-post",
  name: "Pre/Post Development",
  description: "Pre-development woods (CN 55) vs post-development mixed use (CN 78) on same 15-acre site.",
  data: {
    id: "sample-pre-post",
    name: "Pre-Development (Baseline)",
    description: "Forested pre-development condition. Use Save as Baseline, then load the post-development sample.",
    nodes: [
      {
        id: "sc-pre",
        name: "Forested Site",
        type: "subcatchment",
        position: { x: 300, y: 80 },
        data: {
          id: "sc-pre",
          name: "Forested Site",
          subAreas: [
            { description: "Woods (good condition)", soilGroup: "B", cn: 55, area: 12.0 },
            { description: "Meadow", soilGroup: "B", cn: 58, area: 3.0 },
          ],
          flowSegments: [
            { type: "sheet", manningsN: 0.40, length: 300, rainfall2yr: 3.6, slope: 0.05 },
            { type: "shallow", length: 1000, slope: 0.03, surface: "unpaved" },
            { type: "channel", length: 600, wettedPerimeter: 6, area: 4, manningsN: 0.05, slope: 0.015 },
          ],
        },
      },
      {
        id: "j-out",
        name: "Outfall",
        type: "junction",
        position: { x: 300, y: 300 },
      },
    ],
    links: [
      { id: "l1", from: "sc-pre", to: "j-out" },
    ],
    events: [
      { id: "2yr", label: "2-Year Storm", stormType: "II", totalDepth: 3.4 },
      { id: "10yr", label: "10-Year Storm", stormType: "II", totalDepth: 4.8 },
      { id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 },
      { id: "100yr", label: "100-Year Storm", stormType: "II", totalDepth: 8.5 },
    ],
  },
};

const multiPondSystem: SampleProject = {
  id: "multi-pond",
  name: "Multi-Pond System",
  description: "Two subcatchments feeding upstream & downstream ponds in series via reach.",
  data: {
    id: "sample-multi-pond",
    name: "Multi-Pond Series System",
    description: "Upstream and downstream detention ponds connected in series by a channel reach.",
    nodes: [
      {
        id: "sc-upper",
        name: "Upper Watershed",
        type: "subcatchment",
        position: { x: 160, y: 60 },
        data: {
          id: "sc-upper",
          name: "Upper Watershed",
          subAreas: [
            { description: "Mixed residential", soilGroup: "C", cn: 77, area: 8.0 },
            { description: "Wooded buffer", soilGroup: "B", cn: 60, area: 2.0 },
          ],
          flowSegments: [
            { type: "sheet", manningsN: 0.15, length: 200, rainfall2yr: 3.6, slope: 0.04 },
            { type: "shallow", length: 700, slope: 0.025, surface: "unpaved" },
          ],
        },
      },
      {
        id: "sc-lower",
        name: "Lower Development",
        type: "subcatchment",
        position: { x: 500, y: 280 },
        data: {
          id: "sc-lower",
          name: "Lower Development",
          subAreas: [
            { description: "Commercial/industrial", soilGroup: "C", cn: 90, area: 5.0 },
          ],
          flowSegments: [
            { type: "sheet", manningsN: 0.013, length: 60, rainfall2yr: 3.6, slope: 0.01 },
            { type: "shallow", length: 500, slope: 0.015, surface: "paved" },
          ],
        },
      },
      {
        id: "pond-upper",
        name: "Upstream Pond",
        type: "pond",
        position: { x: 160, y: 260 },
        data: {
          stageStorage: [
            { stage: 300, storage: 0 },
            { stage: 301, storage: 6000 },
            { stage: 302, storage: 18000 },
            { stage: 303, storage: 38000 },
            { stage: 304, storage: 65000 },
            { stage: 305, storage: 100000 },
          ],
          outlets: [
            { type: "orifice", coefficient: 0.6, diameter: 1.0, centerElevation: 300.5 },
            { type: "weir", subtype: "broad-crested", coefficient: 2.85, length: 6, crestElevation: 304 },
          ],
          initialWSE: 300,
        },
      },
      {
        id: "reach-mid",
        name: "Connecting Channel",
        type: "reach",
        position: { x: 320, y: 420 },
        data: {
          length: 800,
          manningsN: 0.03,
          slope: 0.005,
          shape: { type: "trapezoidal", bottomWidth: 5, sideSlope: 2 },
        },
      },
      {
        id: "junc-mid",
        name: "Confluence",
        type: "junction",
        position: { x: 320, y: 280 },
      },
      {
        id: "pond-lower",
        name: "Downstream Pond",
        type: "pond",
        position: { x: 320, y: 560 },
        data: {
          stageStorage: [
            { stage: 250, storage: 0 },
            { stage: 251, storage: 10000 },
            { stage: 252, storage: 30000 },
            { stage: 253, storage: 62000 },
            { stage: 254, storage: 110000 },
            { stage: 255, storage: 170000 },
            { stage: 256, storage: 245000 },
          ],
          outlets: [
            { type: "orifice", coefficient: 0.6, diameter: 1.25, centerElevation: 250.75 },
            { type: "vnotch-weir", coefficient: 2.5, angle: 60, crestElevation: 253 },
            { type: "weir", subtype: "broad-crested", coefficient: 2.85, length: 10, crestElevation: 255 },
          ],
          initialWSE: 250,
        },
      },
      {
        id: "j-out",
        name: "Outfall",
        type: "junction",
        position: { x: 320, y: 720 },
      },
    ],
    links: [
      { id: "l1", from: "sc-upper", to: "pond-upper" },
      { id: "l2", from: "pond-upper", to: "junc-mid" },
      { id: "l3", from: "sc-lower", to: "junc-mid" },
      { id: "l4", from: "junc-mid", to: "reach-mid" },
      { id: "l5", from: "reach-mid", to: "pond-lower" },
      { id: "l6", from: "pond-lower", to: "j-out" },
    ],
    events: [
      { id: "10yr", label: "10-Year Storm", stormType: "II", totalDepth: 4.8 },
      { id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 },
      { id: "100yr", label: "100-Year Storm", stormType: "II", totalDepth: 8.5 },
    ],
  },
};

export const sampleProjects: SampleProject[] = [
  simpleDetentionPond,
  commercialDevelopment,
  subdivisionLayout,
  prePostComparison,
  multiPondSystem,
];

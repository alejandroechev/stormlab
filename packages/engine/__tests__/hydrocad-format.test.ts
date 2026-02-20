import { describe, it, expect } from "vitest";
import { importHydroCAD, exportHydroCAD } from "../src/formats/hydrocad.js";

// Excerpt from the official HydroCAD sample file
const SAMPLE_HCP = `[HydroCAD]
FileUnits=English
CalcUnits=English
Name=Mountain View Housing Complex Rev. G
RunoffMethod=SCS TR-20
PondMethod=Stor-Ind
UH=SCS

[EVENT]
RainEvent=2-Year
StormType=Type II 24-hr
StormDurat=86400
StormDepth=0.225

[EVENT]
RainEvent=25-Year
StormType=Type II 24-hr
StormDurat=86400
StormDepth=0.358333333333333

[EVENT]
RainEvent=100-Year
StormType=Type II 24-hr
StormDurat=86400
StormDepth=0.491666666666667

[NODE]
Number=1S
Type=Subcat
Name=TR-55 Tc Calculation Example
XYPos=0.06 3.07
Outflow=1R
[AREA]
Area=217800
CN=61
CNindex=5B
Desc=>75% Grass cover, Good, HSG B
[AREA]
Area=653400
CN=74
CNindex=5C
Desc=>75% Grass cover, Good, HSG C
[TC]
Method=Sheet
Length=100
Slope=0.01
n=0.24
P2=0.3
[TC]
Method=Shallow
Length=1400
Slope=0.01
Surface=Unpaved
[TC]
Method=Channel
Length=7300
Slope=0.005
n=0.05
Area=27
Perim=28.2

[NODE]
Number=2S
Type=Subcat
Name=East side of ridge
XYPos=-2.01 5.39
Outflow=1R
[AREA]
Area=1894860
CN=55
CNindex=82B
Desc=Woods, Good, HSG B
[TC]
Method=Sheet
Length=122
Slope=0.07
n=0.8

[NODE]
Number=10S
Type=Subcat
Name=South Woods
XYPos=2.70 2.43
Outflow=1P
[AREA]
Area=1089000
CN=60
CNindex=81B
Desc=Woods, Fair, HSG B
[TC]
Method=Lag
Length=1050
Slope=0.02

[NODE]
Number=1R
Type=Reach
Name=New R.C.P.
XYPos=1.59 4.97
Outflow=1P
Diam=2.5
Length=1475
n=0.013
InletInvert=80
OutletInvert=55

[NODE]
Number=1P
Type=Pond
Name=New Pond 1
XYPos=4.83 4.97
Outflow=3R
[STAGE]
Elev=50
Area=8712
[STAGE]
Elev=52.5
Area=17424
[STAGE]
Elev=53
Area=52272
[STAGE]
Elev=55
Area=65340
[DEVICE]
Type=Culvert
Routing=Primary
Invert=50
Diam=2
n=0.013
Length=12
OutletInvert=49.6
Ke=0.2
CC=0.9
[DEVICE]
Type=Orifice
Routing=Device 1
Invert=50.5
Diam=1.33333333333333
C=0.6
[DEVICE]
Type=BCRWeir
Routing=Secondary
Invert=53.6
Length=5

[NODE]
Number=3R
Type=Reach
Name=Existing Stream Bed
XYPos=6.98 3.24
Outflow=3P
TopWidth=10
Depth=2
Length=5500
n=0.04
InletInvert=48
OutletInvert=22

[NODE]
Number=3P
Type=Pond
Name=South Wetland Area
XYPos=8.76 0.51
[STAGE]
Elev=20
Area=0
[STAGE]
Elev=20.3
Area=57934.8
[STAGE]
Elev=21
Area=103672.8
[STAGE]
Elev=22
Area=157687.2
[DEVICE]
Type=Culvert
Invert=20.5
Diam=2
n=0.013
Length=22
CC=0.9
[DEVICE]
Type=SCVWeir
Invert=20.9
Angle=45
C=2.56
[DEVICE]
Type=Orifice
Invert=20
Diam=1
C=0.6
`;

describe("HydroCAD .hcp Import/Export", () => {
  describe("importHydroCAD", () => {
    it("should parse the project name", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      expect(project.name).toBe("Mountain View Housing Complex Rev. G");
    });

    it("should parse rainfall events with correct depths", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      expect(project.events.length).toBe(3);
      // 2-Year: 0.225 ft = 2.7 inches
      expect(project.events[0].totalDepth).toBeCloseTo(2.7, 1);
      // 25-Year: 0.3583 ft ≈ 4.3 inches
      expect(project.events[1].totalDepth).toBeCloseTo(4.3, 1);
      // 100-Year: 0.4917 ft ≈ 5.9 inches
      expect(project.events[2].totalDepth).toBeCloseTo(5.9, 1);
    });

    it("should parse storm type correctly", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      expect(project.events[0].stormType).toBe("II");
    });

    it("should parse subcatchments with sub-areas", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      const sc = project.nodes.find((n) => n.id === "1S");
      expect(sc).toBeDefined();
      expect(sc!.type).toBe("subcatchment");
      expect(sc!.name).toBe("TR-55 Tc Calculation Example");

      if (sc!.type === "subcatchment") {
        expect(sc!.data.subAreas.length).toBe(2);
        // First area: 217800 sq ft = 5.0 acres, CN=61
        expect(sc!.data.subAreas[0].cn).toBe(61);
        expect(sc!.data.subAreas[0].area).toBeCloseTo(5.0, 1);
        expect(sc!.data.subAreas[0].soilGroup).toBe("B");
        // Second area: 653400 sq ft = 15.0 acres, CN=74
        expect(sc!.data.subAreas[1].cn).toBe(74);
        expect(sc!.data.subAreas[1].area).toBeCloseTo(15.0, 1);
        expect(sc!.data.subAreas[1].soilGroup).toBe("C");
      }
    });

    it("should parse Tc flow segments", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      const sc = project.nodes.find((n) => n.id === "1S");
      if (sc?.type === "subcatchment") {
        // Should have 3 segments: sheet, shallow, channel
        expect(sc.data.flowSegments.length).toBe(3);
        expect(sc.data.flowSegments[0].type).toBe("sheet");
        expect(sc.data.flowSegments[1].type).toBe("shallow");
        expect(sc.data.flowSegments[2].type).toBe("channel");
      }
    });

    it("should parse reaches with pipe geometry", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      const reach = project.nodes.find((n) => n.id === "1R");
      expect(reach).toBeDefined();
      expect(reach!.type).toBe("reach");
      if (reach!.type === "reach") {
        expect(reach!.data.length).toBe(1475);
        expect(reach!.data.manningsN).toBe(0.013);
        expect(reach!.data.shape.type).toBe("circular");
        if (reach!.data.shape.type === "circular") {
          expect(reach!.data.shape.diameter).toBe(2.5);
        }
        // Slope = (80-55)/1475 ≈ 0.0169
        expect(reach!.data.slope).toBeCloseTo(0.0169, 3);
      }
    });

    it("should parse ponds with stage-storage", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      const pond = project.nodes.find((n) => n.id === "1P");
      expect(pond).toBeDefined();
      expect(pond!.type).toBe("pond");
      if (pond!.type === "pond") {
        // Stage-storage should be converted from stage-area to cumulative volume
        expect(pond!.data.stageStorage.length).toBe(4);
        expect(pond!.data.stageStorage[0].storage).toBe(0);
        expect(pond!.data.stageStorage[1].storage).toBeGreaterThan(0);
      }
    });

    it("should parse pond outlet devices", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      const pond = project.nodes.find((n) => n.id === "1P");
      if (pond?.type === "pond") {
        // Should have 3 devices: culvert (→orifice), orifice, weir
        expect(pond.data.outlets.length).toBe(3);
      }
    });

    it("should parse V-notch weir from SCVWeir type", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      const wetland = project.nodes.find((n) => n.id === "3P");
      if (wetland?.type === "pond") {
        const vnotch = wetland.data.outlets.find((o) => o.type === "vnotch-weir");
        expect(vnotch).toBeDefined();
        if (vnotch?.type === "vnotch-weir") {
          expect(vnotch.angle).toBe(45);
          expect(vnotch.coefficient).toBe(2.56);
        }
      }
    });

    it("should create flow links between nodes", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      // 1S→1R, 2S→1R, 10S→1P, 1R→1P, 1P→3R, 3R→3P
      expect(project.links.length).toBeGreaterThanOrEqual(5);
      // Verify specific link: 1S → 1R
      expect(project.links.find((l) => l.from === "1S" && l.to === "1R")).toBeDefined();
      // 1R → 1P
      expect(project.links.find((l) => l.from === "1R" && l.to === "1P")).toBeDefined();
    });

    it("should produce a valid project that can be re-exported", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      const exported = exportHydroCAD(project);
      expect(exported).toContain("[HydroCAD]");
      expect(exported).toContain("[EVENT]");
      expect(exported).toContain("[NODE]");
      expect(exported).toContain("Type=Subcat");
      expect(exported).toContain("Type=Pond");
      expect(exported).toContain("Type=Reach");
    });

    it("should roundtrip the project through export/import", () => {
      const project = importHydroCAD(SAMPLE_HCP);
      const exported = exportHydroCAD(project);
      const reimported = importHydroCAD(exported);

      expect(reimported.nodes.length).toBe(project.nodes.length);
      expect(reimported.events.length).toBe(project.events.length);

      // Check that subcatchment data survived
      const origSC = project.nodes.find((n) => n.id === "1S");
      const reimSC = reimported.nodes.find((n) => n.id === "1S");
      expect(reimSC).toBeDefined();
      if (origSC?.type === "subcatchment" && reimSC?.type === "subcatchment") {
        expect(reimSC.data.subAreas.length).toBe(origSC.data.subAreas.length);
        expect(reimSC.data.subAreas[0].cn).toBe(origSC.data.subAreas[0].cn);
      }
    });
  });
});

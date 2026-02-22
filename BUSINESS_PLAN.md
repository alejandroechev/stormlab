# StormLab — Business Plan

## Product Summary

**StormLab** is a free, browser-based stormwater modeling tool that replaces expensive desktop software (HydroCAD $995–$2,500, Bentley PondPack ~$3,000) with a modern web application. Built on the public-domain TR-55 methodology, it provides visual DAG-based routing, SCS hydrology, Modified Puls pond routing, and multi-event analysis — all running entirely in the browser with zero installation.

**Deployed at:** [stormlab.app](https://stormlab.app)

---

## Current State

### Test Coverage
- **165 tests** (79 unit + 86 E2E) — most tested product in the suite
- Full TR-55 engine implementation validated against published references

### Engine Capabilities
- SCS runoff equation (Curve Number method)
- Rainfall distributions (Type I, IA, II, III)
- Time of concentration (sheet flow, shallow concentrated, channel)
- SCS unit hydrograph with discrete convolution
- Stage-storage (prismatic, conical, cylindrical ponds)
- Outlet structures (weirs, orifices, V-notch weirs)
- Modified Puls pond routing
- DAG-based system routing with topological sort
- Multi-event support (2-yr, 10-yr, 25-yr, 100-yr storms)

### Web UI
- SVG routing diagram with pan/zoom and grid
- Drag-and-drop stencil palette
- Port-based link drawing
- Property panel with inline editing
- Hydrograph charts with peak annotations
- Save/load JSON projects, undo/redo
- Project validation (cycle detection, missing data)

### File Format Support
- StormLab JSON (native)
- EPA SWMM .inp import
- HEC-HMS .basin import
- HydroCAD .hpc import

---

## Market Research

### Survey Results (n≈20 civil/environmental engineers)

| Metric | Score |
|---|---|
| Professional Use Intent | 65% |
| Scales to Real Projects | 45% |
| Useful for Workflow | 75% |
| Would Pay Incremental Premium | 55% |
| Would Pay Major Premium | 80% |

**Key Insight:** Highest major premium willingness (80%) across all products — directly attributable to $2,500 incumbent pricing creating strong value perception for a modern alternative.

### Competitive Landscape

| Product | Price | Strengths | Weaknesses |
|---|---|---|---|
| **HydroCAD** | $995–$2,500/yr | Industry standard, regulatory acceptance, full feature set | Windows-only, dated UI, expensive, no collaboration |
| **EPA SWMM** | Free | Powerful continuous sim, water quality, government-backed | Steep learning curve, complex UI, no cloud |
| **HEC-HMS** | Free | Advanced hydrology, Corps of Engineers support | Complex setup, limited hydraulics, desktop-only |
| **Bentley PondPack** | ~$3,000/yr | Enterprise features, Bentley ecosystem integration | Very expensive, heavy client, vendor lock-in |
| **StormLab** | Free (freemium) | Instant web access, visual DAG routing, import competitors, modern UX | Single design storm, no continuous sim, no regulatory reports |

### Competitive Advantages
1. **Zero friction** — no download, no license key, instant browser access
2. **Visual DAG routing** — intuitive drag-and-drop system layout
3. **Import competitors** — HydroCAD .hpc, SWMM .inp, HEC-HMS .basin
4. **Multi-event analysis** — simultaneous 2/10/25/100-year storm comparison
5. **Modern stack** — fast iteration, mobile-friendly, shareable projects

### Current Weaknesses
1. Single design storm (no continuous simulation)
2. No water quality / pollutant modeling
3. No regulatory-formatted reports
4. No FEMA floodplain analysis
5. Limited real-world project scaling (45% survey response)

---

## Monetization Strategy

### Phase 1: Free Tier (Current)
**Price:** $0 — establish user base and validate product-market fit

**Includes all current features:**
- TR-55 hydrology engine (runoff, Tc, unit hydrograph)
- Pond routing (Modified Puls)
- DAG-based visual routing diagram
- Multi-event analysis (2/10/25/100-yr)
- File import (HydroCAD, SWMM, HEC-HMS)
- Save/load projects
- Basic hydrograph charts and results

**Goal:** 500+ monthly active users, collect feedback, build reputation

---

### Phase 2: Professional Tier — $199–$349/year
**Target:** Practicing civil engineers, small consulting firms, municipal reviewers

| Feature | Effort | Description |
|---|---|---|
| NOAA Atlas 14 Rainfall Integration | L | Auto-lookup site-specific rainfall depths by coordinates; replaces manual IDF table entry |
| Regulatory Detention Reports | L | Generate formatted detention pond reports meeting common municipal submission requirements |
| Pre/Post Comparison Reports | M | Side-by-side pre-development vs post-development analysis with summary tables and charts |
| LID/BMP Modeling | L | Low Impact Development elements: bioretention, permeable pavement, rain gardens, green roofs |

**Value Proposition:** At $199–$349/yr vs HydroCAD's $995–$2,500/yr, StormLab Pro delivers 60–85% cost savings while adding modern conveniences (cloud access, auto rainfall lookup, instant reports).

**Revenue Target:** 200 subscribers × $275 avg = $55,000 ARR

---

### Phase 3: Enterprise Tier — $499–$899/year
**Target:** Mid-size engineering firms, government agencies, land development companies

| Feature | Effort | Description |
|---|---|---|
| Continuous Simulation | XL | Long-term rainfall-runoff modeling for water balance, baseflow, and regulatory continuous sim requirements |
| Water Quality / Pollutant Modeling | XL | TSS, phosphorus, nitrogen loading and BMP removal efficiency per EPA methods |
| FEMA Floodplain Analysis | XL | Floodplain delineation support, BFE computation, CLOMR/LOMR package generation |
| Multi-Site Project Management | L | Manage multiple project sites with shared rainfall data, team collaboration, version history |
| API for Engineering Firms | L | REST API for batch simulation runs, integration with GIS and CAD workflows |

**Value Proposition:** Full-featured stormwater platform at $499–$899/yr vs $3,000+ for Bentley PondPack or enterprise HydroCAD — with cloud collaboration, API access, and modern UX that desktop tools cannot match.

**Revenue Target:** 100 subscribers × $700 avg = $70,000 ARR

---

## Validation Strategy

### Primary References
1. **TR-55 Worked Examples** — USDA Technical Release 55 publication contains complete worked examples for runoff, Tc, and unit hydrograph computations. Engine output must match within 1% tolerance.
2. **HydroCAD Output Matching** — Run identical project configurations in HydroCAD and StormLab; peak flows, volumes, and stage must agree within 2%.
3. **EPA SWMM Comparison** — Cross-validate pond routing and system-level results against SWMM output for benchmark watersheds.

### Additional Validation
- NOAA Atlas 14 rainfall depths vs published point precipitation frequency estimates
- FHWA HDS-5 culvert capacity calculations (for reach elements)
- Known analytical solutions for simple pond routing scenarios

---

## Pricing Rationale

The 80% major premium willingness — highest across all products — reflects the extreme pricing gap between free/cheap alternatives and the $995–$3,000 incumbent tools. Engineers currently face a binary choice:

1. **Free but painful** (SWMM, HEC-HMS) — steep learning curves, no modern UX
2. **Expensive but capable** (HydroCAD, PondPack) — full-featured but costly

StormLab occupies the **missing middle**: professional-grade features at 70–85% discount to incumbents, with modern web UX that neither free nor paid competitors offer. The $199–$899 range is low enough to be approved without executive sign-off at most firms, while high enough to sustain development.

---

## Growth Milestones

| Milestone | Metric | Timeline |
|---|---|---|
| Product-Market Fit | 500 MAU, 45+ NPS | Month 6 |
| Phase 2 Launch | 50 paying subscribers | Month 12 |
| Phase 2 Growth | 200 subscribers, $55K ARR | Month 18 |
| Phase 3 Launch | Continuous sim beta | Month 24 |
| Phase 3 Growth | 100 enterprise subs, $125K total ARR | Month 30 |

---

## Risk Factors

| Risk | Likelihood | Mitigation |
|---|---|---|
| Low conversion from free to paid | Medium | Ensure Phase 2 features are genuinely time-saving (NOAA lookup, auto reports) |
| Regulatory acceptance barriers | Medium | Partner with municipal reviewers for report template validation |
| HydroCAD drops pricing | Low | Compete on UX, cloud access, and import compatibility — not just price |
| EPA releases modern SWMM | Low | SWMM modernization is slow; maintain import compatibility as hedge |
| Scaling limitations hurt credibility | Medium | Prioritize real-world project testing; address 45% scaling score |

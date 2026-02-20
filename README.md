# HydroCAD Web

A web-based stormwater modeling tool inspired by [HydroCAD](https://www.hydrocad.net/). Built with TypeScript, React, and SVG — runs entirely in the browser with no backend required.

## Features

### Hydrology Engine (`@hydrocad/engine`)
- **SCS Runoff Equation** (TR-55 Chapter 2) — Curve Number method for rainfall-runoff
- **Rainfall Distributions** — SCS Type I, IA, II, III cumulative mass curves
- **Curve Number Lookup** — composite CN weighting for mixed land use
- **Time of Concentration** — sheet flow, shallow concentrated flow, channel flow (TR-55 Chapter 3)
- **SCS Unit Hydrograph** — dimensionless UH (peak factor 484) with discrete convolution
- **Subcatchment Model** — full integration of CN + rainfall + runoff + Tc → hydrograph

### Hydraulics Engine
- **Stage-Storage** — prismatic, conical, cylindrical pond shapes
- **Outlet Structures** — weirs (broad-crested, sharp-crested, V-notch), orifices
- **Modified Puls Routing** — storage-indication method for pond routing

### Project Model
- **DAG-based routing diagram** — Subcatchment, Pond, Reach, Junction nodes connected by flow links
- **System Router** — topological sort + full simulation propagation
- **Multi-event support** — 2-year, 10-year, 25-year, 100-year storms
- **CLI Runner** — run simulations from JSON project files

### Web UI (`@hydrocad/web`)
- **SVG Routing Diagram** — pan/zoom canvas with grid background
- **Drag-and-Drop Stencil** — add nodes from the component palette
- **Port-based Link Drawing** — click output→input ports to create flow connections
- **Property Panel** — inline editing of all node parameters
- **Hydrograph Charts** — Recharts-based outflow hydrographs with peak annotations
- **Simulation Results** — peak flow, time to peak, volume, stage per node
- **Save/Load** — JSON project file persistence
- **Undo/Redo** — Ctrl+Z / Ctrl+Y with history stack
- **Project Validation** — cycle detection, missing data warnings

## Quick Start

```bash
# Install dependencies
pnpm install

# Run the web app
pnpm dev
# → http://localhost:1420

# Run engine tests
cd packages/engine && pnpm test

# Run simulation via CLI
cd packages/engine && npx tsx cli/run.ts ../../docs/example-project.json --event 25yr
```

## Project Structure

```
hydrocad-web/
├── packages/
│   ├── engine/                 # Pure TS hydrology/hydraulics engine
│   │   ├── src/
│   │   │   ├── hydrology/      # TR-55 runoff, CN, rainfall, Tc, unit hydrograph
│   │   │   ├── hydraulics/     # Stage-storage, outlets, pond routing
│   │   │   └── model/          # Project model, reach routing, system router
│   │   ├── cli/                # CLI runner
│   │   └── __tests__/          # 79 unit tests
│   └── web/                    # React SPA
│       └── src/
│           ├── components/
│           │   ├── diagram/    # SVG routing diagram canvas
│           │   ├── panels/     # Property editor panel
│           │   ├── reports/    # Hydrograph charts, summary report
│           │   └── toolbar/    # Stencil palette, toolbar
│           └── store/          # Zustand state management
└── docs/                       # Example projects, reference data
```

## Validation

The hydrology engine is validated against TR-55 manual worked examples. Every algorithm function is tested against known answers from the published USDA/NRCS methods.

```
79 passing tests
- SCS Runoff Equation (9 tests)
- Curve Number (5 tests)
- Rainfall Distributions (10 tests)
- Time of Concentration (8 tests)
- Unit Hydrograph (9 tests)
- Subcatchment Model (5 tests)
- Stage-Storage (10 tests)
- Outlet Structures (9 tests)
- Pond Routing (5 tests)
- System Router (9 tests)
```

## Tech Stack

- **Engine:** TypeScript (zero dependencies)
- **Web:** React 19, Vite 6, Zustand, Recharts
- **Testing:** Vitest
- **Monorepo:** pnpm workspaces

## License

MIT

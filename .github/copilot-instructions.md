---
applyTo: "**"
---
# StormLab — Stormwater Modeling

## Domain
- TR-55 hydrology: SCS runoff equation, Curve Number, rainfall distributions (Type I, IA, II, III)
- Time of concentration (Tc) via sheet flow, shallow concentrated, channel flow
- Unit hydrograph generation from Tc and rainfall
- Modified Puls method for pond routing (stage-storage-discharge)
- Outlet structures: orifices, weirs, v-notch weirs
- DAG-based routing: subcatchments → ponds → reaches → junctions → outfall

## Key Equations
- Runoff: Q = (P - 0.2S)² / (P + 0.8S), where S = 1000/CN - 10
- K-factor discharge: Q = K × √P (for outlet orifices)
- Manning's equation for reaches

## Validation Sources
- USDA TR-55 publication (public domain)
- NOAA Atlas 14 rainfall data
- FHWA HDS-5 for culverts

## File Formats
- StormLab JSON (native), EPA SWMM .inp, HEC-HMS .basin, HydroCAD .hpc

# Code Implementation Flow

<important>Mandatory Development Loop (non-negotiable)</important>

## Git Workflow
- **Work directly on master** — solo developer, no branch overhead
- **Commit after every completed unit of work** — never leave working code uncommitted
- **Push after each work session** — remote backup is non-negotiable
- **Tag milestones**: `git tag v0.1.0-mvp` when deploying or reaching a checkpoint
- **Branch only for risky experiments** you might discard — delete after merge or abandon

## Preparation & Definitions
- Use Typescript as default language, unless told otherwise
- Work using TDD with red/green flow ALWAYS
- If its a webapp: Add always Playwright E2E tests
- Separate domain logic from CLI/UI/WebAPI, unless told otherwise
- Every UI/WebAPI feature should have parity with a CLI way of testing that feature

## Validation
After completing any feature:
- Run all new unit tests, validate coverage is over 90%
- Use cli to test new feature
- If its a UI impacting feature: run all e2e tests
- If its a UI impacting feature: do a visual validation using Playwright MCP, take screenshots as you tests and review the screenshots to verify visually all e2e flows and the new feature. <important>If Playwright MCP is not available stop and let the user know</important>

If any of the validations step fail, fix the underlying issue.

## Finishing
- Update documentation for the project based on changes
- <important>Always commit after you finish your work with a message that explain both what is done, the context and a trail of the though process you made </important>


# Deployment

- git push master branch will trigger CI/CD in Github
- CI/CD in Github will run tests, if they pass it will be deployed to Vercel https://storm-lab.vercel.app/
- Umami analytics and Feedback form with Supabase database

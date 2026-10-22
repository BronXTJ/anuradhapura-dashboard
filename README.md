# Anuradhapura District — Urban Analytics Dashboard

Studio 4 web dashboard for the **Anuradhapura** district study area: interactive map (district, DS, and GN divisions), 2024 census KPI cards, division search, and live weather readings.

**Canonical branch:** `main` — clone this branch for development and for agent handoff.

## Quick start

```bash
npm install
npm run dev
```

Other scripts:

- `npm run build` — production build (TypeScript + Vite)
- `npm run preview` — serve the production build locally
- `npm run lint` — Oxlint

## UI/UX alignment (Studio 4)

Visual layout, components, and interaction patterns should follow the **Mount Lavinia dashboard** (the reference UI for Studio 4).

- Mount Lavinia repository: **TBD — add Mount Lavinia repo URL when available**
- Anuradhapura-specific data, divisions, and map layers stay in this repo; see [docs/HANDOFF_FOR_STUDIO4.md](docs/HANDOFF_FOR_STUDIO4.md).

## Data

Committed map and stats files live under `public/data/`. See [docs/DATA.md](docs/DATA.md) for a file-by-file description.

To regenerate outputs from source GIS/census inputs:

```bash
# Default input folder: ../datasets (sibling of this repo)
# Override: set DATASETS_DIR to your datasets path
python scripts/prepare_overview_data.py
```

Per-division building extracts are written to `public/data/buildings/` and are **gitignored** (large; generated locally).

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/HANDOFF_FOR_STUDIO4.md](docs/HANDOFF_FOR_STUDIO4.md) | What to preserve vs restyle when aligning with Mount Lavinia |
| [docs/DATA.md](docs/DATA.md) | Data assets and regeneration |
| [docs/UI_PARITY_CHECKLIST.md](docs/UI_PARITY_CHECKLIST.md) | UI parity checklist for agents |

## Stack

Vite, React 19, TypeScript, MapLibre GL — see [package.json](package.json).

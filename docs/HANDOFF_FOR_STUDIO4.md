# Studio 4 handoff — Anuradhapura dashboard

## Purpose

Align **Anuradhapura** with the **Mount Lavinia** dashboard UI/UX (layout, typography, KPI presentation, sidebar, map chrome) while keeping **Anuradhapura content and behavior**.

- **UI/UX source of truth:** Mount Lavinia dashboard repository (URL in [README.md](../README.md) when available).
- **Data and logic source of truth:** this repository (`main`).

## Preserve (behavior)

Do not remove or break these behaviors when restyling:

| Feature | Location |
|---------|----------|
| Three-column shell (sidebar, map, overview) | [src/App.tsx](../src/App.tsx) |
| Collapsible sidebar and menu structure | [src/components/Sidebar.tsx](../src/components/Sidebar.tsx) |
| DS / GN mode switch | [src/components/OverviewPanel.tsx](../src/components/OverviewPanel.tsx) |
| Division search and map zoom to selection | [src/components/DivisionSearch.tsx](../src/components/DivisionSearch.tsx) |
| Selection updates census KPI cards (district vs division) | [src/components/StatGrid.tsx](../src/components/StatGrid.tsx), [src/stats.ts](../src/stats.ts) |
| Map click: pick DS/GN under cursor (GN wins); weather probe at click | [src/components/MapPane.tsx](../src/components/MapPane.tsx) |
| Live weather summary and outlook | [src/components/ConditionsPanel.tsx](../src/components/ConditionsPanel.tsx), [src/weather.ts](../src/weather.ts) |
| Division catalog and boundaries | [src/divisions.ts](../src/divisions.ts) |

Stat field semantics (name, pcode, area, population, densities, housing) are defined in `StatGrid` and `stats.json` — change only with an update to [docs/DATA.md](DATA.md).

## Restyle (from Mount Lavinia)

Copy or adapt from the Mount Lavinia repo:

- Design tokens and global styles (this repo today: [src/styles/tokens.css](../src/styles/tokens.css), [src/styles/overview.css](../src/styles/overview.css), [src/styles/global.css](../src/styles/global.css))
- KPI card layout, icons, and emphasis (warm accent on selected metrics)
- Sidebar city card, menu tones, focus list
- Map toolbar, layer toggles, basemap switch, legend presentation
- Typography, spacing, focus states

Goal: both dashboards feel like one Studio 4 product; **copy and geography differ**.

## Map layers (Anuradhapura-specific)

Implemented in [src/components/MapPane.tsx](../src/components/MapPane.tsx). Layer set may differ from Mount Lavinia; match **controls and legend patterns** from ML where possible.

| Layer | Data | Notes |
|-------|------|--------|
| Basemap | OSM streets / Esri satellite | Toggle in map UI |
| District | `/data/district.geojson` | Outline |
| DS / GN | `/data/ds.geojson`, `/data/gn.geojson` | Fill + selection state |
| Roads | `/data/roads.geojson` | Optional toggle |
| POIs | `/data/pois.geojson` | Optional toggle |
| Buildings | `/data/buildings/{pcode}.geojson` | Per selected division; files generated locally, not in git |

## Out of scope (unless assigned separately)

- Studio 4 **portal / chooser** page (Mount Lavinia vs Anuradhapura entry)
- Raw GIS archives (`settlement_change_*`, QGIS projects) — not stored in this repo

## Stack

- Vite 8, React 19, TypeScript
- MapLibre GL — [package.json](../package.json)

## Agent instruction (short)

Use Mount Lavinia for UI/UX; implement changes in this repo per this document. Do not change division/stat semantics without updating [DATA.md](DATA.md).

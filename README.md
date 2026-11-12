# Map / Time — historical map georeferencing pipeline

This repository starts a human-reviewed workflow for aligning historical maps with current GIS references and recording the evidence needed for historical zoning research.

The first version is a browser prototype, not an automated legal-determination system. It provides:

- side-by-side placement of paired historic-pixel and modern-map control points;
- fit points separate from independent check points;
- a provisional affine transform with residuals, RMSE, and control-point coverage warnings;
- a transparent historical-map overlay for visual review;
- a versioned draft manifest that preserves map, control-point, transform, and source context;
- a clearly fictional sample map so the interface can be exercised without making claims about a real place.

## Start the prototype

Prerequisites: Node.js 22 or newer and pnpm 11.

```powershell
corepack enable
pnpm install
pnpm dev
```

Then open the local URL printed by Vite. Run the full local quality suite with:

```powershell
pnpm run check
```

## How the demo works

1. In **Side-by-side edit**, click a durable landmark on the historical scan.
2. Click the same feature on the current reference map.
3. Use **fit** points to calculate the provisional transform; add **check** points to evaluate it without changing it.
4. Inspect residuals, RMSE, and point distribution.
5. Open **Overlay review**, adjust opacity, and validate visual alignment.
6. Export a draft manifest that preserves the control-point and review context.

The bundled map and zoning finding are fictional. The visible OpenStreetMap layer is only a present-day reference. It does not prove historical streets, boundaries, parcels, or zoning.

## Research guardrails

A historical zoning finding should only be published after a reviewer has confirmed:

- the historical location and the jurisdiction in effect on the requested date;
- the controlling ordinance text and adopted zoning map;
- the source repository, locator (sheet/page/section), access date, and rights;
- the georeferencing inputs, CRS, transform method, residuals, and independent check points;
- any uncertainty created by map scale, boundary change, or imperfect alignment.

The interface is a research aid and must not be represented as legal advice, a survey, or an authoritative zoning determination.

## Architecture

```text
historical scan + source metadata
            │
            ▼
browser GCP editor ──► reviewed manifest ──► job queue / GDAL worker (future)
            │                                      │
            ▼                                      ▼
modern reference layers                       COG / tiles + QA record
OSM, municipal GIS, Census                          │
                                                     ▼
                                              PostGIS + temporal evidence
```

The browser supplies the review workflow. A later production pipeline should run repeatable transformations using GDAL, store raw scans and derived COGs in object storage, and keep temporal boundaries/zoning evidence in a spatial database.

Read [the architecture guide](docs/architecture.md), [data policy](docs/data-policy.md), and [research scope](docs/research-scope.md) before adding real material.

## Repository layout

```text
src/
  components/          browser editor, current-map pane, QA panels
  data/                clearly fictional demo fixture
  domain/              durable project/evidence types
  lib/                 affine fitting and error calculations
public/samples/        small, license-cleared demo assets only
docs/                  technical and evidence-management guidance
.github/workflows/     deterministic quality checks
```

## Roadmap

1. Import/export validated project manifests and user-provided historical scans.
2. Add deep zoom (OpenSeadragon) and authentic municipal WMS/WMTS/ArcGIS feature-service connectors.
3. Send reviewed manifests to a GDAL worker for reproducible GeoTIFF/COG output.
4. Add PostGIS tables for temporal jurisdictions, ordinance maps, zoning polygons, and citations.
5. Add reviewer roles, audit history, source-aware OCR/AI assistance, and a human approval gate.

Large raster scans, COGs, tiles, bulk GIS data, and ordinance PDFs do **not** belong in ordinary Git history. See [data policy](docs/data-policy.md).

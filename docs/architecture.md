# Architecture

## GitHub control plane and Pages review interface

GitHub is the intake and review control plane. GitHub Pages hosts the static
review interface for repository review copies:

1. A map record enters under maps/inbox.
2. A GitHub Action creates a map-specific Issue.
3. GitHub Pages deploys the picker and repository review copies from the
   default branch.
4. A reviewer opens the Pages link from the Issue, or a browser-local session
   for authorized restricted material, and manually records review notes and
   decisions in the Issue.
5. A separately prepared, reviewed manifest becomes the input to future
   geoprocessing.

`maps/inbox` is the repository-facing review-copy contract and is copied into
the Pages artifact. A map in that directory is therefore reachable from the
Pages interface once the deployment completes. Keep restricted maps and
original archival scans outside the repository; a reviewer can use the
browser-local route for an authorized private copy instead.

An optional Dropbox ingress stages a review PR before step 1. It has read-only
Dropbox access and cannot create Issues or merge its own result. This keeps
Dropbox ingestion separate from the default-branch and reviewer-approval
boundaries.

The browser picker remains intentionally static. It demonstrates the critical human interaction without embedding GitHub credentials in client code:

1. View an unwarped historical scan in pixel space.
2. View a present-day geographic reference map beside it.
3. Create paired ground-control points (GCPs).
4. Fit an affine transform from **fit** GCPs only.
5. Measure residuals for fit and independent **check** GCPs.
6. Review a provisional overlay.

The picker currently has no control for copying a landmark record or exporting
a draft manifest. Reusable code is retained for possible future use; a complete
reviewed record must be prepared separately before processing.

The demo uses a fictional scan and fictional evidence. It is an interface and data-model starting point, not a map-processing service.

## Component boundaries

```text
GitHub control plane
 ├── maps/inbox          versioned intake metadata and small review copies
 ├── Dropbox intake       manual App-Folder download, validation, and review PR
 ├── Issue Form          manual intake for externally hosted maps
 ├── map-intake Action   one Issue per map.json file
 └── GitHub Issue        provenance, review checklist, and landmark record

GitHub Pages static review interface
 ├── HistoricMapPane       unwarped raster and pixel-space GCPs
 ├── ModernMapPane         MapLibre map, reference layers, geographic GCPs
 ├── Review launcher       repository map or browser-only local-image entry
 ├── georeference.ts       deterministic affine fit and residual calculations
 └── QA panels             coverage, RMSE, warnings, review state

Future service boundary
 ├── API                   validation, authorization, manifest persistence
 ├── worker                GDAL gdal_translate/gdalwarp, COG generation
 ├── object storage        immutable source scans and derived artifacts
 ├── PostGIS               temporal geometry, citations, queryable evidence
 └── Render alternative    deferred; not part of the active review path
```

For local development, the picker runs on port 5173. A reviewer can select an
authorized image from a private Issue or another approved source without
uploading or committing it; that browser-only option is an intake aid, not a
substitute for source metadata or reviewer approval. GitHub Pages must never
receive or host that restricted image. Repository-map control points are saved
in the current browser's local storage; local-file points exist only in the
current page session and are lost when the page reloads or the tab closes.

## Why side-by-side comes first

An unreferenced scan has pixels, not geographic coordinates. Placing it on top of a current basemap before enough good GCPs exist can create false confidence. The editing surface should therefore stay side-by-side until a provisional transform exists. Overlay, swipe, and flicker views are review tools, not primary input tools.

## Transform policy

Start with similarity, affine, or projective transforms depending on the sheet and available GCPs. This baseline implements affine fitting because it is explainable and needs at least three non-collinear fit points.

Use polynomial and thin-plate-spline transforms only with explicit warnings, strong point coverage, and a documented reason. Flexible transforms can hide local error by overfitting GCPs.

Every produced artifact should retain:

- raw-source checksum and source citation;
- input GCP pixel/map coordinates, roles, confidence, and reviewer notes;
- target CRS, transformation method/parameters, and processing version;
- residuals, fit RMSE, check-point RMSE, and sheet-coverage assessment;
- reviewer decision and timestamps;
- link to the COG, tiles, and worker log.

## Production processing path

```text
reviewed manifest
      │
      ├── validate schema and source permissions
      ├── run GDAL with recorded CRS / GCP / transform choices
      ├── calculate artifact checksum and QA metrics
      ├── write Cloud Optimized GeoTIFF and display tiles to object storage
      └── save immutable job + review record to database
```

GitHub Actions should validate code and small deterministic fixtures. It should not be the primary processing system for multi-gigabyte scans or long-running warp jobs.

## Modern reference layers

Layer adapters should support:

- OpenStreetMap-compatible raster/vector basemaps for orientation;
- WMS/WMTS;
- ArcGIS REST map and feature services;
- GeoJSON and vector tiles;
- internally served COGs;
- PostGIS-backed historic boundaries and zoning polygons.

Treat OpenStreetMap and current imagery as reference aids. Municipal road centerlines, parcels, and official boundaries should be preferred for authoritative decisions. Historic zoning claims require historical primary sources rather than present-day layers.

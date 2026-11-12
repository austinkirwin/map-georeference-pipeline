# Architecture

## GitHub-centered baseline

GitHub is the intake and review control plane:

1. A map record enters under maps/inbox.
2. A GitHub Action creates a map-specific Issue.
3. The Issue links to the static Pages picker and preserves review discussion.
4. A reviewer pastes a structured landmark record into the Issue.
5. A reviewed manifest becomes the input to future geoprocessing.

The browser picker remains intentionally static. It demonstrates the critical human interaction without embedding GitHub credentials in client code:

1. View an unwarped historical scan in pixel space.
2. View a present-day geographic reference map beside it.
3. Create paired ground-control points (GCPs).
4. Fit an affine transform from **fit** GCPs only.
5. Measure residuals for fit and independent **check** GCPs.
6. Review a provisional overlay.
7. Export a draft project manifest or copy an Issue-ready landmark record.

The demo uses a fictional scan and fictional evidence. It is an interface and data-model starting point, not a map-processing service.

## Component boundaries

```text
GitHub control plane
 ├── maps/inbox          versioned map intake metadata and small review copies
 ├── Issue Form          manual intake for externally hosted maps
 ├── map-intake Action   one Issue per map.json file
 └── GitHub Issue        provenance, review checklist, and landmark record

React Pages picker
 ├── HistoricMapPane       unwarped raster and pixel-space GCPs
 ├── ModernMapPane         MapLibre map, reference layers, geographic GCPs
 ├── georeference.ts       deterministic affine fit and residual calculations
 ├── QA panels             coverage, RMSE, warnings, review state
 └── exported record       portable manifest or Issue-ready landmark table

Future service boundary
 ├── API                   validation, authorization, manifest persistence
 ├── worker                GDAL gdal_translate/gdalwarp, COG generation
 ├── object storage        immutable source scans and derived artifacts
 └── PostGIS               temporal geometry, citations, queryable evidence
```

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

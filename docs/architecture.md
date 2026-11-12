# Architecture

## Baseline in this repository

The baseline is intentionally client-only. It demonstrates the critical human interaction before committing to a backend:

1. View an unwarped historical scan in pixel space.
2. View a present-day geographic reference map beside it.
3. Create paired ground-control points (GCPs).
4. Fit an affine transform from **fit** GCPs only.
5. Measure residuals for fit and independent **check** GCPs.
6. Review a provisional overlay.
7. Export a draft project manifest.

The demo uses a fictional scan and fictional evidence. It is an interface and data-model starting point, not a map-processing service.

## Component boundaries

```text
React UI
 ├── HistoricMapPane       unwarped raster and pixel-space GCPs
 ├── ModernMapPane         MapLibre map, reference layers, geographic GCPs
 ├── georeference.ts       deterministic affine fit and residual calculations
 ├── QA panels             coverage, RMSE, warnings, review state
 └── exported manifest     portable draft record

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

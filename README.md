# Historical Map Georeferencing Pipeline

This project helps researchers align historical maps with modern geographic data, then preserve the evidence needed to research questions such as:

> What zoning ordinance may have applied to this address on a particular historical date?

It is designed as a research workflow. It does not make legal determinations automatically.

## What the pipeline does

1. Add a historical map scan and record where it came from.
2. Identify durable landmarks on the old map, such as road intersections, bridges, rail crossings, or civic buildings.
3. Match those landmarks to locations on a modern GIS map.
4. Create a geographic transform from the matched control points.
5. Check the quality of the transform using residuals, RMSE, and independent check points.
6. Overlay the historical map on current map layers for visual review.
7. Save the map source, control points, transform settings, error measurements, and reviewer notes in a reusable project record.
8. Connect the reviewed map to historical jurisdiction boundaries, zoning maps, and ordinance sources in a later phase.

## Current prototype

The first version in this repository is a browser-based demonstration of the georeferencing workflow. It includes:

- side-by-side historical and modern-map views;
- control-point placement on both maps;
- separate fit points and independent check points;
- a provisional affine transform with error measurements;
- an opacity-controlled historical overlay;
- a draft project-manifest export;
- a fictional sample map and fictional zoning record for safe testing.

The current OpenStreetMap layer is a modern reference layer only. It is not proof of a historical street, parcel, municipal boundary, or zoning district.

## Run the project locally

Requirements:

- Node.js 22 or newer
- pnpm 11

```powershell
corepack enable
pnpm install
pnpm dev
```

Open the local address printed by Vite. To run formatting, linting, TypeScript checks, tests, and a production build:

```powershell
pnpm run check
```

## How to use the demo

1. Open **Side-by-side edit**.
2. Click a recognizable feature on the historical map.
3. Click the matching location on the modern map.
4. Mark points as either:
   - **Fit points**, which calculate the transform.
   - **Check points**, which measure accuracy without affecting the transform.
5. Review the quality panel and make sure control points are spread across the sheet.
6. Open **Overlay review** and use the opacity control to inspect alignment.
7. Export the draft manifest when the review record is ready.

## Important limitations

Historical zoning research needs more than a map overlay. A supported finding should include:

- the historical location or parcel;
- the jurisdiction that applied on the requested date;
- the ordinance version in effect at that time;
- the adopted historical zoning map;
- source citations with archive location, page or sheet, access date, and rights information;
- documented spatial uncertainty and human review.

The application is a research aid, not legal advice, a survey, or an authoritative zoning determination.

## Future production pipeline

```text
Historical scan and source metadata
        ->
Human-reviewed control points
        ->
Reproducible GDAL processing
        ->
Cloud Optimized GeoTIFF and map tiles
        ->
PostGIS temporal boundaries, zoning evidence, and citations
        ->
Reviewed historical zoning research finding
```

Large scans, GeoTIFFs, map tiles, and bulk GIS downloads should live in object storage rather than ordinary Git history. Git should keep the code, manifests, citations, tests, and processing configuration.

## Project structure

```text
src/                  Web application and georeferencing calculations
public/samples/       Small fictional sample map and project fixture
docs/                 Architecture, data policy, and research guidance
.github/workflows/    Automated quality checks
```

For more detail, see the [architecture guide](docs/architecture.md), [data policy](docs/data-policy.md), and [historical zoning research scope](docs/research-scope.md).

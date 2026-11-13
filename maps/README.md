# Map workspace

This directory is the repository-facing intake area for maps that need georeferencing.

```text
maps/
  inbox/<map-id>/       New map, source metadata, and a small review copy
  manifests/            Reviewed control-point records and processing inputs
  processed/            Local/generated outputs; do not commit large artifacts
  templates/            Copyable intake metadata template
```

Each incoming map must use a stable lowercase map identifier, for example champaign-zoning-1930-sheet-01.

Add a map.json file under maps/inbox/<map-id>/. When that file lands on the default branch, the map-intake GitHub Action creates a review Issue for it.

Keep repository copies small and reviewable. Put archival scans, TIFFs, COGs, tiles, and restricted material in approved object storage or Git LFS instead. Record their URLs, checksums, and rights in map.json.

Set the optional `modernMapView` longitude, latitude, and zoom in map.json so the current-map pane opens near the historic sheet instead of using the demonstration location. This is only an initial viewing location, not georeferencing evidence.

The repository's MIT license applies to original project code and documentation,
not to historical map images, GIS data, or other third-party materials in this
directory. Each intake record's source and rights metadata controls its use and
redistribution.

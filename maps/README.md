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

GitHub Pages serves the small review copies in `maps/inbox/` so an Issue-linked
reviewer can mark landmarks in the browser. Do not use this directory for
restricted maps or original archival scans; use the browser-local review route
for material that must remain private.

Keep repository copies small and reviewable. Put archival scans, TIFFs, COGs, tiles, and restricted material in approved object storage or Git LFS instead. Record their URLs and checksums in map.json, and document known rights or access terms in the intake review record. A `source.rights` property is optional.

Set the optional `modernMapView` longitude, latitude, and zoom in map.json so the current-map pane opens near the historic sheet instead of using the demonstration location. This is only an initial viewing location, not georeferencing evidence.

The repository's MIT license applies to original project code and documentation,
not to historical map images, GIS data, or other third-party materials in this
directory. Human source review and any applicable rights or access terms
control an intake's use and redistribution.

Dropbox can stage the same two-file review bundle into a pull request. It is a
manual, read-only Dropbox import and does not change the rule above: raw scans
and restricted material stay outside ordinary Git. See
[`docs/dropbox-intake.md`](../docs/dropbox-intake.md).

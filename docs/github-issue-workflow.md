# GitHub Issue workflow

## Roles

- **Map contributor** adds a small review copy and intake record, or opens the Map intake Issue form.
- **GitHub Action** creates the canonical map Issue when a new map.json record reaches the default branch.
- **Reviewer** uses the linked Pages picker, checks source/provenance, and pastes the landmark record into the Issue.
- **Processor** later turns a reviewed manifest into GDAL artifacts, COGs, and spatial records.

## Intake contract

The automatic route requires:

```text
maps/inbox/<map-id>/
  map.json
  review-copy.<supported-image-extension>
```

map.json is intentionally small, structured metadata. It should point to the durable original scan if that scan does not belong in Git.

The map-intake Action only reacts to map.json paths on the default branch. It does not open or parse raster files, so an uploaded map cannot cause the workflow to execute untrusted map content.

## Issue contract

The generated Issue includes:

- a hidden, deterministic intake marker used to avoid duplicate Issues;
- a link to the map intake record;
- a link to the Pages picker with the map identifier and Issue number;
- source and quality-review checklists;
- labels for intake and landmark-selection state.

The Issue is the human-readable evidence trail. It should not be treated as the system of record for large source files or derived rasters.

## Picker contract

The Pages picker accepts:

```text
?map=<map-id>&issue=<issue-number>
```

It loads maps/inbox/<map-id>/map.json and the named review image from the published repository branch. It can save temporary work in the browser and copy a Markdown landmark table for an Issue comment.

The picker must never contain a Personal Access Token, OAuth secret, or GitHub App private key. Automated write-back requires a backend or GitHub App with narrowly scoped authorization and explicit user consent.

## Approval boundary

Before a map enters a geoprocessing job, a reviewer should verify:

1. source, rights, and map date;
2. historical jurisdiction and applicable time period;
3. landmark selection and independent check points;
4. transform method, residuals, and spatial uncertainty;
5. the reviewed manifest and issue record.

Do not make the Action commit generated map artifacts back into the same intake path. That creates recursion and makes review history harder to audit. Use a deliberate pull request, release artifact, or external job system for processing results.

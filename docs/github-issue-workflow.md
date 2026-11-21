# GitHub Issue workflow

## Roles

- **Map contributor** adds a small review copy and intake record, or opens the Map intake Issue form.
- **GitHub Action** creates the canonical map Issue when a new map.json record reaches the default branch.
- **Reviewer** uses the linked GitHub Pages picker for a repository review
  copy, or a local browser session for authorized restricted material, checks
  source/provenance, and pastes the landmark record into the Issue.
- **Processor** later turns a reviewed manifest into GDAL artifacts, COGs, and spatial records.

## Intake contract

The automatic route requires:

```text
maps/inbox/<map-id>/
  map.json
  review-copy.<supported-image-extension>
```

map.json is intentionally small, structured metadata. It should point to the
durable original scan if that scan does not belong in Git. A review copy is
appropriate only when everyone who can access the Pages deployment may access
it (the public if the repository and Pages site are public). GitHub Pages
serves this directory as part of the review interface, so do not place private
Dropbox links, credentials, restricted scans, or claims that an overlay is an
authoritative zoning determination in a repository review copy. Keep
restricted maps outside the repository and open them only through the
browser's local-file route.

### Dropbox review-PR route

The manual Dropbox workflow accepts the same two-file contract from an App
Folder, validates it, and opens a review PR. It does not push to the default
branch and has no Issue permission. The existing map-intake Action sees the
new `map.json` only after a human merge, so the normal deduplication marker and
Issue contract remain unchanged. The original scan stays in Dropbox. See
[`docs/dropbox-intake.md`](dropbox-intake.md).

After a human merges a Dropbox intake PR, the normal Pages deployment can make
the small repository review copy available to the Issue-linked picker. Dropbox
validation does not approve landmarks or make a zoning conclusion.

The map-intake Action only reacts to map.json paths on the default branch. It does not open or parse raster files, so an uploaded map cannot cause the workflow to execute untrusted map content.

## Issue contract

The generated Issue includes:

- a hidden, deterministic intake marker used to avoid duplicate Issues;
- a link to the map intake record;
- a link to the GitHub Pages picker with the map identifier and Issue number;
- for a restricted map, instructions for opening an authorized local browser
  review session;
- source and quality-review checklists;
- labels for intake and landmark-selection state.

The Issue is the human-readable evidence trail. It should not be treated as the system of record for large source files or derived rasters.

## GitHub Pages and local picker contract

The GitHub Pages picker can open a repository intake record using:

```text
?map=<map-id>&issue=<issue-number>
```

It loads `maps/inbox/<map-id>/map.json` and the named review image from the
Pages deployment. It can also open an authorized PNG, JPEG, or WebP selected
locally after a reviewer downloads it from a private Issue or another approved
source. The local file is not uploaded, committed, or sent to GitHub Pages by
the picker. A PDF must be converted to a review image before this browser-only
route can use it.

The picker can save repository-map work in the browser and copy a Markdown
landmark table for an Issue comment. Local-file sessions intentionally do not
persist control points after the tab is closed.

The Pages deployment reflects the repository review copy. It must not offer
credentials, private Issue attachments, or Dropbox source files. Local review
remains a separate browser-only route.

The picker must never contain a Personal Access Token, OAuth secret, or GitHub App private key. Automated write-back requires a backend or GitHub App with narrowly scoped authorization and explicit user consent.

## Optional Codex landmark-record review

The repository also includes a manual-only Codex workflow for reviewing the
completeness and uncertainty of a landmark record. It is intentionally separate
from map intake, processing, and review-state transitions.

The workflow runs only when a trusted collaborator manually dispatches it from
the default branch and checks its explicit run control. It selects the latest
comment whose picker marker matches both the map and Issue, then produces a
structured draft. A separate, opt-in job may post that draft back to the Issue.
The model job has no GitHub write permission.

This is a review aid, not an automated approval mechanism. It must not trigger
from raw Issue text, close an Issue, apply labels, create a manifest, or assert
a historical zoning result. Setup and data-handling details are in
`docs/codex-issue-assist.md`.

## Approval boundary

Before a map enters a geoprocessing job, a reviewer should verify:

1. source, rights, and map date;
2. historical jurisdiction and applicable time period;
3. landmark selection and independent check points;
4. transform method, residuals, and spatial uncertainty;
5. the reviewed manifest and issue record.

Do not make the Action commit generated map artifacts back into the same intake path. That creates recursion and makes review history harder to audit. Use a deliberate pull request, release artifact, or external job system for processing results.

# Historical Map Georeferencing Pipeline

This project uses GitHub as the intake and human-review record for historical
map georeferencing. Its browser interface is a Render static site, not GitHub
Pages.

Each map has a GitHub Issue for source information, landmark-review discussion,
quality checks, and the reviewed record. The Render workspace can open an
explicitly published, rights-cleared review copy or a reviewer-selected local
file. It does not receive GitHub, Dropbox, or OpenAI credentials and does not
write comments automatically.

This is a research workflow. It does not make legal, surveying, or
authoritative zoning determinations.

## Review workflow

1. Add a small, authorized review copy and its `map.json` intake record under
   `maps/inbox/<map-id>/`, stage one from Dropbox through a review PR, or open
   a Map intake Issue with a durable source link.
2. A human merges an appropriate repository intake record to the default
   branch.
3. The map-intake GitHub Action creates one Issue for that map.
4. Open the Render review-workspace link in the Issue.
5. If a human has explicitly approved a public copy under
   `maps/public-review/<map-id>/`, it opens from the query link. Otherwise,
   download an authorized review image from the Issue or Dropbox and choose
   **Open local review copy**. That image remains in the browser session.
6. Click matching landmarks on the historical map and modern reference map.
7. Copy the issue-ready landmark record and paste it into the Issue.
8. Review source information, control-point distribution, residuals,
   independent check points, and overlay alignment.
9. Save the reviewed record under `maps/manifests/` and use it as input to
   later GDAL, COG, and spatial-database processing.

```text
Dropbox or repository intake
        ->
human-reviewed intake PR / default branch
        ->
GitHub Action creates a map Issue
        ->
Render review workspace (published copy or browser-local file)
        ->
reviewer pastes landmark record into Issue
        ->
reviewed manifest and reproducible processing
```

## Render deployment

[`render.yaml`](render.yaml) defines a static Render service. Its deployment is
manual by default and runs both `pnpm run public:check` and `pnpm run check`
before publishing `dist/`.

1. In Render, create a new Blueprint from this repository and select the
   default branch.
2. Let the checked-in `render.yaml` supply the build and publish settings. The
   static site needs no secrets.
3. After the first deployment, create the GitHub Actions repository variable
   `RENDER_REVIEW_URL` with the HTTPS Render URL, for example
   `https://your-picker.onrender.com`.
4. New intake Issues then include a direct link with the map ID and Issue
   number. Existing Issues can use the same URL with
   `?map=<map-id>&issue=<issue-number>`.

Render must receive only the compiled public site. It is not a Dropbox webhook
receiver or a credential store for browser code.

## Public versus private map material

```text
maps/inbox/          Intake metadata and small collaborator review copies
maps/public-review/  Explicitly approved assets copied into the Render build
maps/manifests/      Reviewed control-point and transform records
maps/processed/      Documentation for generated outputs; large artifacts stay outside Git
maps/templates/      Copyable map.json template
```

`maps/inbox/` is never copied to `dist/`. Moving a two-file bundle to
`maps/public-review/` is a separate, human-reviewed publication decision. Run
`pnpm run public:check` before deploying; it verifies the published tier's
rights statement, durable HTTPS source record, manifest, and declared review
image.

Do not put archival scans, TIFFs, PDFs, COGs, tiles, MBTiles, GeoPackages,
restricted maps, or credentials in either Git history or the Render site. A
private Issue attachment or Dropbox original can be loaded through the local
file picker without being uploaded, committed, or sent to Render.

## Dropbox intake (manual, review-first)

A Dropbox delivery can stage a small, authorized review copy into a pull
request instead of adding a map by hand. The workflow uses a Dropbox App Folder
with read-only scopes, validates exactly one `map.json` and one PNG, JPEG, or
WebP review image, records Dropbox provenance, then opens a PR. A human must
review and merge that PR before the normal map-intake Action creates an Issue.

The original scan stays in Dropbox. Do not use this path for TIFFs, PDFs, COGs,
tiles, restricted scans, or other material prohibited from ordinary Git
history. See [Dropbox map intake](docs/dropbox-intake.md) for setup and run
instructions.

## Reference basemap

The picker defaults to the no-key OpenFreeMap Liberty style rather than the
public OpenStreetMap Standard tile server. It is an orientation aid, not an
authoritative source. For durable research, configure an approved map provider
or municipal WMS/WMTS layer and retain the required attribution.

`VITE_REFERENCE_STYLE_URL` can set a public HTTPS MapLibre style URL.
Alternatively, set both `VITE_REFERENCE_TILE_URL` and
`VITE_REFERENCE_TILE_ATTRIBUTION` for an approved public raster source. These
variables are delivered to the browser, so they must never contain API keys,
tokens, or other credentials. See [`.env.example`](.env.example).

## GitHub setup required once

1. In repository Settings, Actions, General, allow workflows to receive the
   permissions they request. The map-intake workflow needs `issues: write` so
   it can create Issues and labels.
2. Enable branch protection or a ruleset for the default branch, including the
   Quality check and human PR review.
3. Deploy the Render Blueprint and set the `RENDER_REVIEW_URL` repository
   variable as described above.
4. Optional: the manual Codex landmark-record reviewer needs an
   `OPENAI_API_KEY` Actions secret before it can run. It is disabled by default
   and never runs on an Issue, push, or pull-request event. See
   [`docs/codex-issue-assist.md`](docs/codex-issue-assist.md).
5. Optional: configure the protected `dropbox-intake` environment and its three
   Dropbox OAuth secrets to use the manual Dropbox-to-review-PR workflow. See
   [`docs/dropbox-intake.md`](docs/dropbox-intake.md).

## Current capabilities

- Map intake folders and metadata template
- Automatic Issue creation for map records added to the default branch
- Manual Map intake Issue form for externally hosted maps
- Manual Dropbox-to-review-PR intake for small authorized review copies
- Render static review workspace for explicitly published maps
- Browser-only opening of authorized private Issue attachments or local review images
- Optional, manual-only Codex landmark-record completeness review
- Side-by-side historic and modern-map control-point selection
- Separate fit and independent check points
- Affine-fit residuals, RMSE, coverage warnings, and overlay review for the sample map
- Issue-ready landmark-record export

## Important limitations

Historical zoning research needs more than a map overlay. A supported finding
should include the historical location or parcel, jurisdiction at the requested
date, ordinance version, adopted map, source citations, documented spatial
uncertainty, and human review.

The application is a research aid, not legal advice, a survey, or an
authoritative zoning determination.

## Before making the repository public

Making the repository public exposes its complete Git history, Issues, Actions
logs, and every review image in `maps/inbox/`—even though Render copies only
`maps/public-review/`. The current Kentwood fixture has no confirmed
redistribution declaration and must be cleared, replaced, or removed before a
public launch.
Follow [`docs/public-release-checklist.md`](docs/public-release-checklist.md)
before changing visibility. A revert cannot make material that has already been
copied or cached private again.

## Developer commands

Node.js 22 or newer and pnpm 11 are required for local development.

```powershell
corepack enable
pnpm install
pnpm dev
pnpm run check
pnpm run public:check
```

For architecture, retention, research, public-release, and optional
Codex-assistance guidance, see [`docs/architecture.md`](docs/architecture.md),
[`docs/data-policy.md`](docs/data-policy.md),
[`docs/github-issue-workflow.md`](docs/github-issue-workflow.md),
[`docs/research-scope.md`](docs/research-scope.md),
[`docs/public-release-checklist.md`](docs/public-release-checklist.md),
[`docs/public-repository-access.md`](docs/public-repository-access.md), and
[`docs/codex-issue-assist.md`](docs/codex-issue-assist.md).

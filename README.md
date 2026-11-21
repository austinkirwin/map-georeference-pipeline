# Historical Map Georeferencing Pipeline

This project uses GitHub as the intake and human-review record for historical
map georeferencing. Its browser interface is a GitHub Pages static site.

Each map has a GitHub Issue for source information, landmark-review discussion,
quality checks, and the reviewed record. When a `map.json` intake record reaches
the default branch under `maps/inbox/<map-id>/`, the map-intake Action creates
one Issue with a direct GitHub Pages picker link for that map and Issue number.
The picker does not receive GitHub, Dropbox, or OpenAI credentials and does not
write comments automatically.

This is a research workflow. It does not make legal, surveying, or
authoritative zoning determinations.

## Review workflow

1. For the automatic route, add a small, authorized review copy and its
   `map.json` intake record under `maps/inbox/<map-id>/`, or stage one from
   Dropbox through a review PR. For an externally hosted or restricted map,
   open a Map intake Issue instead.
2. A human reviews and merges the repository intake record to the default
   branch. A manually created Issue already exists; its reviewer opens the
   standard Pages site and chooses **Open local review copy** for an authorized
   browser-only image.
3. The map-intake GitHub Action creates one Issue for that map. The Pages
   deployment Action builds the picker and its inbox assets from that branch.
4. Open the GitHub Pages picker link in the Issue. If the site is still
   deploying, wait a few minutes and reload it.
5. Click matching landmarks on the historical map and modern reference map.
6. Copy the issue-ready landmark record and paste it into the Issue.
7. Review source information, control-point distribution, residuals,
   independent check points, and overlay alignment.
8. Save the reviewed record under `maps/manifests/` and use it as input to
   later GDAL, COG, and spatial-database processing.

```text
Dropbox or repository intake
        ->
human-reviewed intake PR / default branch
        ->
GitHub Action creates a map Issue
        ->
GitHub Pages landmark picker
        ->
reviewer pastes landmark record into Issue
        ->
reviewed manifest and reproducible processing
```

## GitHub Pages deployment

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
builds and deploys the static picker from the default branch. It runs
`pnpm run public:check` and `pnpm run check` before publishing `dist/`, and
uses GitHub's configured Pages base path so project-site asset links work.

Enable it once in **Settings → Pages → Build and deployment**, choosing
**GitHub Actions** as the source. The default project-site URL is:

```text
https://<owner>.github.io/<repository>/
```

The map-intake Action derives that URL and adds
`?map=<map-id>&issue=<issue-number>` to each new Issue. For a custom domain or
nonstandard Pages URL, set the `PAGES_REVIEW_URL` repository variable to its
credential-free HTTPS base URL. It is a variable, not a secret; do not put
tokens, credentials, or private URLs in it.

Existing Issues are intentionally not rewritten. After Pages is live, their
reviewer can open the same URL pattern manually, or a maintainer can update the
Issue body with the Pages link.

## Public versus private map material

```text
maps/inbox/      Intake metadata and small review copies deployed with GitHub Pages
maps/manifests/  Reviewed control-point and transform records
maps/processed/  Documentation for generated outputs; large artifacts stay outside Git
maps/templates/  Copyable map.json template
```

The Pages build copies `maps/inbox/` into the static site so a direct Issue
link can open the repository review copy. Therefore every review image placed
there is available to the audience permitted to view the GitHub Pages site. In
a public repository with a public Pages site, it is public. Do not put archival
scans, TIFFs, PDFs, COGs, tiles, MBTiles, GeoPackages, restricted maps, or
credentials in that folder or ordinary Git history.

Use a private Issue attachment or an approved storage location when the map
cannot be exposed to the Pages audience. A reviewer can load an authorized
local image through the picker without uploading, committing, or sending that
image to GitHub Pages.

Run `pnpm run public:check` before deployment; it validates the small inbox
bundle contract. A reviewer must still verify authorization, provenance, and
suitability before merging a map.

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

GitHub Pages is static and is not a Dropbox webhook receiver. The checked-in
[`render.yaml`](render.yaml) is retained only as a deferred, manual-deployment
template for a future broker or alternative interface; Render is not part of
the active review path.

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
2. In repository Settings, Pages, select **GitHub Actions** as the deployment
   source and configure the site's visibility/access to match the review-copy
   policy.
3. Enable branch protection or a ruleset for the default branch, including the
   Quality check and human PR review.
4. Optional: set the `PAGES_REVIEW_URL` repository variable only when the
   actual Pages base URL differs from the standard project-site URL.
5. Optional: the manual Codex landmark-record reviewer needs an
   `OPENAI_API_KEY` Actions secret before it can run. It is disabled by default
   and never runs on an Issue, push, or pull-request event. See
   [`docs/codex-issue-assist.md`](docs/codex-issue-assist.md).
6. Optional: configure the protected `dropbox-intake` environment and its three
   Dropbox OAuth secrets to use the manual Dropbox-to-review-PR workflow. See
   [`docs/dropbox-intake.md`](docs/dropbox-intake.md).

## Current capabilities

- Map intake folders and metadata template
- Automatic Issue creation for map records added to the default branch
- GitHub Pages static landmark picker for repository review copies
- Manual Map intake Issue form for externally hosted maps
- Manual Dropbox-to-review-PR intake for small authorized review copies
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
logs, and every review image in `maps/inbox/` deployed by GitHub Pages.
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

`pnpm dev` serves the picker locally (normally at
`http://localhost:5173/`) with the repository inbox assets. It is for local
development only; the deployed GitHub Pages picker uses its own Pages URL.

For architecture, retention, research, public-release, and optional
Codex-assistance guidance, see [`docs/architecture.md`](docs/architecture.md),
[`docs/data-policy.md`](docs/data-policy.md),
[`docs/github-issue-workflow.md`](docs/github-issue-workflow.md),
[`docs/research-scope.md`](docs/research-scope.md),
[`docs/public-release-checklist.md`](docs/public-release-checklist.md),
[`docs/public-repository-access.md`](docs/public-repository-access.md), and
[`docs/codex-issue-assist.md`](docs/codex-issue-assist.md).

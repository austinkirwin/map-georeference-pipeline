# Historical Map Georeferencing Pipeline

This project uses a private GitHub repository as the intake, review, and audit trail for historical-map georeferencing.

Each map becomes a GitHub Issue. The Issue holds the map's source information, landmark-review discussion, quality checks, and links to the resulting reviewed record. The click-on-map picker runs in an authenticated GitHub Codespace, not GitHub Pages.

The project is a research workflow. It does not make legal determinations automatically.

## GitHub workflow

1. Add a small, authorized review copy and its map.json intake record under maps/inbox/<map-id>/, or open a private Map intake Issue with a durable source link.
2. Merge the repository intake record to the default branch when one is appropriate.
3. The map-intake GitHub Action creates one Issue for that map.
4. From the Issue, open or resume a private Codespace. The dev container starts the landmark picker on port 5173.
5. In the picker, open the repository review copy or select an authorized image downloaded from the private Issue.
6. Click matching landmarks on the historical map and modern reference map.
7. Copy the issue-ready landmark record from the picker and paste it into the Issue.
8. Review source information, control-point distribution, residuals, independent check points, and overlay alignment.
9. Save the reviewed record under maps/manifests/ and use it as input to later GDAL, COG, and spatial-database processing.

```text
Map folder added to GitHub
        ->
GitHub Action creates a map Issue
        ->
Private Codespaces landmark picker
        ->
Reviewer pastes landmark record into Issue
        ->
Reviewed manifest and reproducible processing
```

## Why the picker is linked from an Issue and opened in Codespaces

GitHub Issues are well suited to discussion, assignments, checklists, citations, and permanent review history. They cannot safely run a custom click-on-image application.

Each Issue therefore links to the repository's Codespaces entry point. A reviewer opens the picker inside their own authenticated Codespace, selects the map identifier and Issue number, and copies a structured Markdown record for the Issue.

The picker does not contain a GitHub token and does not post comments automatically. A local review-image option lets a reviewer select an authorized PNG, JPEG, or WebP downloaded from a private Issue; that image remains in the browser session and is not uploaded or committed by the picker. Writing to GitHub from the browser would require a separately approved GitHub App or OAuth-backed service. That is intentionally outside this baseline.

## Add a map

Create a folder like this:

```text
maps/inbox/champaign-zoning-1930-sheet-01/
  map.json
  review-copy.jpg
```

Use the template at maps/templates/map.json. The intake record includes:

- a stable map identifier;
- title, place, and date;
- pixel dimensions for the review image;
- source repository, URL, locator, access date, and rights;
- optional durable storage URL and source checksum.

Commit the map.json file and a small review image only when every authorized repository collaborator may access it. The map-intake workflow creates the Issue and labels it for landmark selection.

For a map that should not be committed to the repository, use the private GitHub Issue form called Map intake. Include a durable source location available to authorized collaborators. A reviewer can attach or download a small authorized image and select it in the Codespaces picker; the picker never uploads that local file.

## Repository map folders

```text
maps/inbox/       Incoming map records and small review images
maps/manifests/   Reviewed control-point and transform records
maps/processed/   Documentation for generated outputs; large artifacts stay outside Git
maps/templates/   Copyable map.json template
```

Do not commit archival scans, TIFFs, COGs, tiles, MBTiles, GeoPackages, or restricted maps to ordinary Git history. Store them in approved object storage or carefully configured Git LFS, then record the URL and checksum in the map record.

## GitHub setup required once

After this branch is merged to the repository's default branch:

1. In repository Settings, Actions, General, allow workflows to receive the permissions they request. The map-intake workflow needs Issues: write so it can create Issues and labels.
2. In repository Settings, Pages, set the source to **None** if a previous Pages site exists. Removing the deployment workflow prevents future deployments but does not automatically take down an existing site.
3. Open the repository through [GitHub Codespaces](https://github.com/features/codespaces). The included dev container installs dependencies and starts the picker on port 5173. Review the port's visibility in the Codespaces Ports panel and keep it private for map review.
4. Optional: the manual Codex landmark-record reviewer needs an `OPENAI_API_KEY` Actions secret before it can run. It is disabled by default and never runs on an Issue, push, or pull-request event. See `docs/codex-issue-assist.md` before enabling it.

## Current capabilities

- Map intake folders and metadata template
- Automatic Issue creation for map records added to the default branch
- Manual Map intake Issue form for externally hosted maps
- Private Codespaces dev container for the landmark picker
- Browser-only opening of authorized private Issue attachments or local review images
- Optional, manual-only Codex landmark-record completeness review
- Side-by-side historic and modern-map control-point selection
- Separate fit and independent check points
- Affine-fit residuals, RMSE, coverage warnings, and overlay review for the sample map
- Issue-ready landmark-record export

## Important limitations

Historical zoning research needs more than a map overlay. A supported finding should include:

- the historical location or parcel;
- the jurisdiction that applied on the requested date;
- the ordinance version in effect at that time;
- the adopted historical zoning map;
- source citations with archive location, page or sheet, access date, and rights information;
- documented spatial uncertainty and human review.

The application is a research aid, not legal advice, a survey, or an authoritative zoning determination.

## License and third-party materials

The project's original source code and documentation are available under the
[MIT License](LICENSE). The license does not grant any rights to historical map
images, GIS data, source archives, or other third-party material. Use the
source and rights fields in each map record to determine whether that material
may be used or redistributed.

## Before making the repository public

Public visibility exposes the complete Git history, Issues, Actions logs, and
every review image in `maps/inbox/`. Run `pnpm run public:check` and follow
`docs/public-release-checklist.md` before changing visibility. This private
Codespaces baseline does not deploy Pages, but it cannot make an
already-committed map private again.

## Developer commands

Node.js 22 or newer and pnpm 11 are required for local development.

```powershell
corepack enable
pnpm install
pnpm dev
pnpm run check
```

For the intended private review path, open a Codespace from the repository or the map Issue. The dev container starts the picker automatically; if it does not, run `pnpm dev -- --host 0.0.0.0` and open port 5173 in the Codespaces Ports panel.

For architecture, retention, research, public-release, and optional
Codex-assistance guidance, see docs/architecture.md, docs/data-policy.md,
docs/github-issue-workflow.md, docs/research-scope.md,
docs/public-release-checklist.md, docs/public-repository-access.md, and
docs/codex-issue-assist.md.

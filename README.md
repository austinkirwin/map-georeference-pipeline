# Historical Map Georeferencing Pipeline

This project uses GitHub as the intake, review, and audit trail for historical-map georeferencing.

Each map becomes a GitHub Issue. The Issue holds the map's source information, landmark-review discussion, quality checks, and links to the resulting reviewed record. A companion GitHub Pages picker provides the click-on-map interaction that GitHub Issues cannot provide by themselves.

The project is a research workflow. It does not make legal determinations automatically.

## GitHub workflow

1. Add a small review copy of a historical map and its map.json intake record under maps/inbox/<map-id>/.
2. Merge the intake to the default branch.
3. The map-intake GitHub Action creates one Issue for that map.
4. Open the Pages landmark picker linked from the Issue.
5. Click matching landmarks on the historical map and modern reference map.
6. Copy the issue-ready landmark record from the picker and paste it into the Issue.
7. Review source information, control-point distribution, residuals, independent check points, and overlay alignment.
8. Save the reviewed record under maps/manifests/ and use it as input to later GDAL, COG, and spatial-database processing.

```text
Map folder added to GitHub
        ->
GitHub Action creates a map Issue
        ->
GitHub Pages landmark picker
        ->
Reviewer pastes landmark record into Issue
        ->
Reviewed manifest and reproducible processing
```

## Why the picker is linked from an Issue

GitHub Issues are well suited to discussion, assignments, checklists, citations, and permanent review history. They cannot safely run a custom click-on-image application.

The Pages picker is therefore linked from each Issue. It reads the map's public review copy, helps a user choose landmarks, and copies a structured Markdown record for the user to paste into the Issue.

The Pages app does not contain a GitHub token and does not post comments automatically. Writing to GitHub from a browser would require a separately approved GitHub App or OAuth-backed service. That is intentionally outside this initial version.

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

Commit the map.json file and review image to the default branch. The map-intake workflow creates the Issue and labels it for landmark selection.

For a map that cannot be committed to the repository, use the GitHub Issue form called Map intake. Include a durable external URL or a small rights-cleared review copy.

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
2. In repository Settings, Pages, choose GitHub Actions as the publishing source.
3. Run the Deploy landmark picker workflow once or push a change to the default branch.
4. Optional: the manual Codex landmark-record reviewer needs an `OPENAI_API_KEY` Actions secret before it can run. It is disabled by default and never runs on an Issue, push, or pull-request event. See `docs/codex-issue-assist.md` before enabling it.

GitHub Pages visibility must match the sensitivity of your maps. Do not enable a public Pages site for private, restricted, or rights-limited map copies. If private Pages is not available on your GitHub plan, use an authenticated application or external hosting for the picker instead.

## Current capabilities

- Map intake folders and metadata template
- Automatic Issue creation for map records added to the default branch
- Manual Map intake Issue form for externally hosted maps
- GitHub Pages deployment workflow for the landmark picker
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

## Developer commands

Node.js 22 or newer and pnpm 11 are required for local development.

```powershell
corepack enable
pnpm install
pnpm dev
pnpm run check
```

For architecture, retention, research, and optional Codex-assistance guidance, see docs/architecture.md, docs/data-policy.md, docs/github-issue-workflow.md, docs/research-scope.md, and docs/codex-issue-assist.md.

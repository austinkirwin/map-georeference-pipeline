# Dropbox map intake

This integration moves a **small, rights-cleared review bundle** from Dropbox
into a human-review pull request. It never sends a Dropbox map directly to the
default branch, creates no Issue itself, and never downloads a raw archival
scan into ordinary Git history.

```text
Dropbox App Folder /intake/<map-id>
        |
manual GitHub Actions dispatch
        |
validate + stage a review PR
        |
human source/rights review and merge
        |
existing map-intake Action creates the canonical Issue
```

The original source scan remains in Dropbox or another approved archive. The
existing map-intake workflow runs only after a human merges the PR to the
default branch.

## Bundle contract

Configure the Dropbox App Folder with an `intake` directory. Each upload must
contain exactly two files:

```text
/Apps/<Dropbox app name>/intake/<map-id>/
  map.json
  review-copy.png   # or .jpg, .jpeg, or .webp
```

`<map-id>` must exactly match `map.json.id`. The review image must exactly
match `map.json.reviewImage`, be at most 8 MiB, and pass a PNG, JPEG, or WebP
signature check. The manifest must include a title, place, date, dimensions,
target CRS, and source title, access date, and rights statement.

The folder must not contain a TIFF, PDF, ZIP, COG, MBTiles, GeoPackage, raw
scan, nested directory, or any other extra file. Keep those source materials
outside the intake folder and cite their durable location/checksum in the
manifest instead.

On a successful import, the staged `map.json` gains this review-copy
provenance; it does not change the original-source metadata:

```json
{
  "storage": {
    "reviewCopy": {
      "provider": "dropbox",
      "fileId": "id:...",
      "revision": "...",
      "contentHash": "...",
      "sha256": "..."
    }
  }
}
```

Do not put a Dropbox shared link that grants anonymous access into a public
manifest. Use a durable archival reference appropriate for the map's rights
and access restrictions.

## One-time Dropbox setup

1. Create a **scoped Dropbox app** with **App Folder** access rather than Full
   Dropbox access. The App Folder confines the app to its own `/Apps/<app>`
   directory. [Dropbox OAuth and content access](https://docs.dropboxapi.com/dropbox-api/docs/oauth)
2. Grant only `files.metadata.read` and `files.content.read`. This baseline
   never moves, deletes, or acknowledges Dropbox files, so it does not request
   `files.content.write`.
3. Use Dropbox's authorization-code flow with
   `token_access_type=offline` to obtain a refresh token. The workflow mints a
   short-lived access token for each run. [Dropbox refresh-token guidance](https://docs.dropboxapi.com/dropbox-api/docs/oauth#using-refresh-tokens)
4. Create `/intake` inside the app folder. Do not place raw scans beside the
   review bundle.

## One-time GitHub setup

Create a protected repository environment named `dropbox-intake`, then add
these **environment secrets**:

```text
DROPBOX_APP_KEY
DROPBOX_APP_SECRET
DROPBOX_REFRESH_TOKEN
```

Add the repository variable below (or leave it unset to use `/intake`):

```text
DROPBOX_INGEST_ROOT=/intake
```

The values are used only by `.github/workflows/dropbox-map-intake.yml`; they
are never copied into Pages, the browser picker, map manifests, Issues, or
workflow summaries.

## Run an import

1. Open **Actions → Stage Dropbox map intake** and select the default branch.
2. Enter a path such as `/intake/kentwood-mi-zoning-1970`.
3. Leave **Create a review PR** unchecked for the first run. The action proves
   the bundle is valid without writing repository files.
4. Re-run with **Create a review PR** checked after reviewing the dry-run
   result.
5. Review the resulting PR: source rights, source citation, image size and
   content, checksum/provenance, map date, and whether every repository
   collaborator is authorized to receive the review copy.
6. Merge only after that review. The pre-existing `map-intake.yml` workflow
   then creates the `Map intake: <map-id>` Issue.

The Dropbox workflow has `contents: write` and `pull-requests: write` solely
to create the review branch and PR. It has no Issue permission, does not merge
anything, and has no Dropbox write scope.

## Why this is manual first

Dropbox webhooks need a public, signature-validating receiver. GitHub Actions
and GitHub Pages are not that receiver. A future automatic design should use a
small authenticated broker (for example, a worker or GitHub App) that verifies
the Dropbox request, records a cursor, and triggers a repository dispatch.

Keep that broker separate from the model-review and Issue-writing paths. Do
not add Dropbox write/delete scope until a human-reviewed, post-merge
acknowledgement policy exists. Dropbox's list and download APIs expose file
revision and content-hash values used by this baseline for provenance. [List
Folder](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/list-folder)
[Download](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/download)

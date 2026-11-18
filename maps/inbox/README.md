# Incoming maps

Create one folder per map:

```text
maps/inbox/<map-id>/
  map.json
  review-copy.jpg
```

map.json is the intake trigger. It must be committed with the review image or a durable external source URL.

Use this folder only for a small, rights-cleared review copy. The full-resolution source should be stored outside ordinary Git when it is large, restricted, or archival.

See the map.json template in maps/templates for the required shape.

The public Render review workspace never reads or deploys this inbox directory.
Never place material here that should not be exposed to every authorized
repository collaborator. A reviewer can instead select an authorized private
Issue attachment or Dropbox copy locally; that file is not committed, uploaded,
or sent to Render by the picker.

To make a review copy available in the public Render workspace, a human must
separately copy only its map.json and declared review image to
maps/public-review/<map-id>/ after confirming public redistribution rights.

The Dropbox intake workflow may create this folder on a review branch only.
It accepts exactly `map.json` and one small, rights-cleared review image, then
requires a human pull-request review before the files reach the default branch.
The source scan remains in Dropbox; see
[`docs/dropbox-intake.md`](../../docs/dropbox-intake.md).

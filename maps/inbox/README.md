# Incoming maps

Create one folder per map:

```text
maps/inbox/<map-id>/
  map.json
  review-copy.jpg
```

map.json is the intake trigger. It must be committed with the named review
image. Include source metadata and a durable external reference when one is
available.

Use this folder only for a small, rights-cleared review copy. The full-resolution source should be stored outside ordinary Git when it is large, restricted, or archival.

See the map.json template in maps/templates for the required shape.

The GitHub Pages picker reads and deploys this directory. Never place material
here that should not be exposed to everyone able to view the repository and its
Pages site. A reviewer can instead select an authorized private Issue attachment
or Dropbox copy locally; that file is not committed, uploaded, or sent to Pages
by the picker.

The Dropbox intake workflow may create this folder on a review branch only.
It accepts exactly `map.json` and one small, rights-cleared review image, then
requires a human pull-request review before the files reach the default branch.
The source scan remains in Dropbox; see
[`docs/dropbox-intake.md`](../../docs/dropbox-intake.md).

# Public Render review copies

This directory is the **only** repository map directory copied into the public
Render static-site build.

Add a map folder here only after a human has confirmed that both the manifest
and its small review image may be publicly redistributed. Each folder uses the
same two-file contract as an intake record:

```text
maps/public-review/<map-id>/
  map.json
  review-copy.png
```

Copying a record here is an explicit publication decision; it does not happen
automatically when an intake reaches `maps/inbox/`. Keep raw scans, Dropbox
originals, private Issue attachments, PDFs, TIFFs, COGs, tiles, and restricted
material out of this directory. Run `pnpm run public:check` before deploying.

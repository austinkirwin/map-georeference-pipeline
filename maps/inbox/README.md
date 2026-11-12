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

The Pages deployment copies this inbox directory into its static artifact so the picker can read the review copy. Never place material here that should not be exposed to every person permitted to view the Pages site.

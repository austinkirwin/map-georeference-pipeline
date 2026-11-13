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

The private Codespaces picker reads this inbox directory from the checked-out repository. Never place material here that should not be exposed to every authorized repository collaborator. A reviewer can instead select an authorized private Issue attachment locally; that file is not committed by the picker.

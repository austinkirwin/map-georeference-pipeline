# Public release checklist

Use this checklist before changing repository visibility or enabling any public
map-viewing deployment. A public repository exposes its Git history, Issues,
workflow logs, and every review image committed under `maps/inbox/`.

## Required owner decisions

- The project code and documentation use the MIT License. Confirm that it still
  matches your intended contributor terms, and do not treat it as a license for
  maps or other third-party content.
- Confirm that every map review image, source URL, citation, Issue attachment,
  and generated artifact may be publicly redistributed.
- Choose a private security-reporting channel and enable GitHub private
  vulnerability reporting before inviting public contributions.
- Decide whether public Issue intake is appropriate. If it is, plan for spam
  moderation and explain that uploads and comments are public.

## Technical checks

Run these commands from the repository root:

```powershell
pnpm run check
pnpm run public:check
git log --all --format='%h %ae'
```

`public:check` validates the current `maps/inbox/` manifests. It requires a
license file, a rights statement that is not provisional or unknown, a durable
HTTPS source URL, and the named review image. Each public intake folder may
contain only `map.json` and that raster review image. It does not inspect Git
history, GitHub Actions logs, remote Issues, forks, or downloaded copies.

If a non-noreply commit email should not become public, change the Git identity
for future commits and decide whether a coordinated history rewrite is worth
the disruption before publication.

## GitHub settings

1. Review old Actions logs and artifacts for sensitive information.
2. Review collaborators, branch protections or rulesets, and Actions workflow
   permissions.
3. Confirm that the `map:intake` and `georeference:needs-landmarks` labels
   exist before relying on the public map-intake form. The map-manifest
   workflow creates them when it first processes an intake; otherwise create
   them in the repository's Labels settings.
4. Keep Pages disabled unless a separately reviewed public deployment is added
   after the checks pass.
5. Add an initial interaction limit if public Issue spam becomes a problem.
6. Confirm no legacy Pages URL remains enabled, or that an intentionally added
   public deployment displays only rights-cleared maps and source metadata.

## OSM basemap capacity

The private picker currently uses the public OpenStreetMap raster tile service
for ordinary interactive viewing. Do not add prefetching, bulk tile download,
or offline-tile features. If a future public deployment becomes substantial,
move to a provider with terms and capacity appropriate for the traffic, and
keep attribution visible.

## Known current blocker

The Kentwood 1970 review image is marked as rights unknown and testing-only.
It must be rights-cleared, replaced, or removed from all reachable Git history
before this repository is made public.

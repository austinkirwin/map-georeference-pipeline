# Public release checklist

Use this checklist before changing repository visibility or enabling any public
map-viewing deployment. A public repository exposes its Git history, Issues,
workflow logs, and every committed review image. Render also exposes every
asset included in its static deployment.

## Required owner decisions

- The project code and documentation use the MIT License. Confirm that it still
  matches your intended contributor terms, and do not treat it as a license for
  maps or other third-party content.
- Confirm that every file promoted to `maps/public-review/`, its source URL,
  citation, and generated artifact may be publicly redistributed. Do not treat
  a Dropbox intake PR, `maps/inbox`, or a private Issue attachment as public
  approval.
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

`public:check` must validate the `maps/public-review/` manifests. It requires
a license file, a rights statement that is not provisional or unknown, a
durable HTTPS source URL, and the named review image. Each public-review folder
may contain only `map.json` and that raster review image. It does not inspect
Git history, GitHub Actions logs, remote Issues, forks, or downloaded copies.

If a non-noreply commit email should not become public, change the Git identity
for future commits and decide whether a coordinated history rewrite is worth
the disruption before publication.

## GitHub and Render settings

1. Review old Actions logs and artifacts for sensitive information.
2. Review collaborators, branch protections or rulesets, and Actions workflow
   permissions.
3. Confirm that the `map:intake` and `georeference:needs-landmarks` labels
   exist before relying on the public map-intake form. The map-manifest
   workflow creates them when it first processes an intake; otherwise create
   them in the repository's Labels settings.
4. Keep GitHub Pages disabled. Configure Render as a static-site deployment
   only after the checks pass, deploy production only from the protected default
   branch, and restrict the build to `maps/public-review/` assets.
5. Add an initial interaction limit if public Issue spam becomes a problem.
6. Confirm the Render URL displays only rights-cleared public-review maps and
   source metadata, and that no legacy Pages URL remains enabled.
7. Do not place GitHub, Dropbox, OpenAI, or map-provider credentials in Render
   variables exposed to the browser or in `VITE_*` values.

## Reference basemap capacity

The Render picker defaults to the OpenFreeMap Liberty style for ordinary
interactive viewing. It is an as-is reference service, not an authoritative
municipal source or an SLA-backed production dependency. Do not add
prefetching, bulk tile download, or offline-tile features. For a substantial
deployment, configure a provider with terms and capacity appropriate for the
traffic, retain its attribution, and prefer authoritative municipal layers for
research decisions.

## Known current blocker

The Kentwood 1970 review image is marked as rights unknown and testing-only.
It must not be promoted to `maps/public-review/`; it must be rights-cleared,
replaced, or removed from all reachable Git history before this repository is
made public.

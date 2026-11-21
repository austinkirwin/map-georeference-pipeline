# Public release checklist

Use this checklist before changing repository visibility or enabling any public
map-viewing deployment. A public repository exposes its Git history, Issues,
workflow logs, and every committed review image. GitHub Pages also exposes
every map asset included in its deployment.

## Required owner decisions

- The project code and documentation use the MIT License. Confirm that it still
  matches your intended contributor terms, and do not treat it as a license for
  maps or other third-party content.
- Confirm that every review image committed under `maps/inbox/`, its citation,
  any source URL, and generated artifact may be publicly redistributed. GitHub
  Pages serves the same repository review copies.
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

`public:check` validates the `maps/inbox/` publication structure. It requires
a repository license, matching map IDs, a named supported review image, and
only `map.json` plus that image in each intake folder. It does not determine
rights, validate a source URL, inspect Git history, GitHub Actions logs, remote
Issues, forks, or downloaded copies. The owner must make the publication
decision separately.

If a non-noreply commit email should not become public, change the Git identity
for future commits and decide whether a coordinated history rewrite is worth
the disruption before publication.

## GitHub and Pages settings

1. Review old Actions logs and artifacts for sensitive information.
2. Review collaborators, branch protections or rulesets, and Actions workflow
   permissions.
3. Confirm that the `map:intake` and `georeference:needs-landmarks` labels
   exist before relying on the public map-intake form. The map-manifest
   workflow creates them when it first processes an intake; otherwise create
   them in the repository's Labels settings.
4. Configure GitHub Pages to deploy with GitHub Actions only after the checks
   pass. Deploy from the protected default branch and confirm the published
   artifact contains the intended `maps/inbox/` assets.
5. Add an initial interaction limit if public Issue spam becomes a problem.
6. Confirm the Pages URL displays the expected review copy and source metadata.
7. Do not place GitHub, Dropbox, OpenAI, or map-provider credentials in
   browser-visible `VITE_*` values.

## Reference basemap capacity

The Pages picker defaults to the OpenFreeMap Liberty style for ordinary
interactive viewing. It is an as-is reference service, not an authoritative
municipal source or an SLA-backed production dependency. Do not add
prefetching, bulk tile download, or offline-tile features. For a substantial
deployment, configure a provider with terms and capacity appropriate for the
traffic, retain its attribution, and prefer authoritative municipal layers for
research decisions.

## Current review boundary

The Kentwood fixture and every future `maps/inbox/` review copy require a human
publication decision before a public Pages deployment. An absent
`source.rights` property is not itself a schema failure; it is not proof that a
review image may be republished.

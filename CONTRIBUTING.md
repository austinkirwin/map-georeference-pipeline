# Contributing

## Work on a branch

Use a focused branch such as `codex/add-manifest-validation` or
`feature/arcgis-layer-adapter`. Keep generated scans, COGs, tiles, and
credentials out of commits.

## Before opening a pull request

```powershell
pnpm run check
```

For a change affecting georeferencing or research output, describe:

- what data or source assumption changed;
- whether a result is factual, inferred, fictional fixture data, or AI-assisted;
- how reviewers can reproduce the result;
- what uncertainty or limitation remains.

## Review standard

No UI or automated test result should be described as a historical zoning determination. Code can calculate and present evidence, but a reviewer must approve source-backed conclusions.

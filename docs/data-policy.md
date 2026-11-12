# Data policy

## What belongs in Git

Commit small, reviewable, reproducible material:

- application code, tests, and deterministic fixtures;
- small license-cleared sample images;
- project manifests and source metadata;
- citations, access dates, rights notes, checksums, CRS, and map-sheet identifiers;
- transform settings, QA results, and reviewer decisions;
- database migrations and infrastructure definitions.

## What does not belong in ordinary Git history

Do not commit:

- raw scans, large TIFFs, COGs, render tiles, or MBTiles;
- bulk municipal GIS downloads or scraped basemap tiles;
- full ordinance/PDF archives unless the repository has explicitly licensed and sized them for that purpose;
- API keys, service credentials, or personally sensitive research material.

Store immutable raw scans and reproducible generated artifacts in object storage. Keep their checksum and stable object identifier in the project manifest. Git LFS can be useful for a few small review assets, but it is not the primary archive or tile-serving system.

## Provenance minimum

Each map, boundary, zoning polygon, and legal assertion should record:

| Field                            | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| Source title and repository      | Makes the claim traceable                     |
| Stable URL or archive identifier | Lets a reviewer retrieve it                   |
| Locator                          | Sheet, page, ordinance section, or feature ID |
| Access date and rights           | Captures changing availability and use terms  |
| Date validity                    | Supports historic temporal reasoning          |
| CRS and geometry source          | Makes spatial processing reproducible         |
| Checksum / processing version    | Identifies exact digital artifacts            |
| Reviewer status                  | Separates drafts from approved evidence       |

## Retention model

Preserve original scans as immutable records. Treat warped rasters, COGs, and tiles as versioned derivatives that can be regenerated from a reviewed manifest plus a pinned processing environment.

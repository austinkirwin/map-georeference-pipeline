import type { StyleSpecification } from "maplibre-gl";

export const DEFAULT_REFERENCE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const DEFAULT_REFERENCE_BASEMAP_NAME = "OpenFreeMap Liberty";
export const DEFAULT_REFERENCE_BASEMAP_SOURCE = "https://openfreemap.org/";

export interface PublicBasemapEnvironment {
  VITE_REFERENCE_STYLE_NAME?: string;
  VITE_REFERENCE_STYLE_URL?: string;
  VITE_REFERENCE_TILE_ATTRIBUTION?: string;
  VITE_REFERENCE_TILE_URL?: string;
}

export interface ReferenceBasemap {
  configurationNotice?: string;
  displayName: string;
  sourceUrl: string;
  style: StyleSpecification | string;
}

/**
 * Resolves a browser-safe reference basemap. Values exposed through Vite are
 * public, so they must never contain API keys, access tokens, or credentials.
 */
export function resolveReferenceBasemap(environment: PublicBasemapEnvironment): ReferenceBasemap {
  const configuredStyleUrl = httpsUrl(environment.VITE_REFERENCE_STYLE_URL);
  if (configuredStyleUrl) {
    return {
      displayName:
        nonEmptyText(environment.VITE_REFERENCE_STYLE_NAME) ?? "Configured reference map",
      sourceUrl: configuredStyleUrl,
      style: configuredStyleUrl
    };
  }

  const configuredTileUrl = httpsUrl(environment.VITE_REFERENCE_TILE_URL);
  const configuredAttribution = nonEmptyText(environment.VITE_REFERENCE_TILE_ATTRIBUTION);
  if (configuredTileUrl && configuredAttribution && isTileTemplate(configuredTileUrl)) {
    return {
      displayName:
        nonEmptyText(environment.VITE_REFERENCE_STYLE_NAME) ?? "Configured raster reference map",
      sourceUrl: configuredTileUrl,
      style: rasterStyle(configuredTileUrl, configuredAttribution)
    };
  }

  return {
    configurationNotice: configurationNotice(environment, configuredTileUrl, configuredAttribution),
    displayName: DEFAULT_REFERENCE_BASEMAP_NAME,
    sourceUrl: DEFAULT_REFERENCE_BASEMAP_SOURCE,
    style: DEFAULT_REFERENCE_STYLE_URL
  };
}

function rasterStyle(tileUrl: string, attribution: string): StyleSpecification {
  const sourceId = "configured-reference-raster";
  return {
    version: 8,
    sources: {
      [sourceId]: {
        attribution,
        tileSize: 256,
        tiles: [tileUrl],
        type: "raster"
      }
    },
    layers: [
      {
        id: sourceId,
        source: sourceId,
        type: "raster"
      }
    ]
  };
}

function configurationNotice(
  environment: PublicBasemapEnvironment,
  configuredTileUrl: string | undefined,
  configuredAttribution: string | undefined
): string | undefined {
  if (environment.VITE_REFERENCE_STYLE_URL && !httpsUrl(environment.VITE_REFERENCE_STYLE_URL)) {
    return "The configured reference style URL was ignored because it is not a valid HTTPS URL.";
  }

  if (environment.VITE_REFERENCE_TILE_URL && !configuredTileUrl) {
    return "The configured raster tile URL was ignored because it is not a valid HTTPS URL.";
  }

  if (configuredTileUrl && !isTileTemplate(configuredTileUrl)) {
    return "The configured raster tile URL was ignored because it is missing {z}, {x}, or {y}.";
  }

  if (configuredTileUrl && !configuredAttribution) {
    return "The configured raster tile URL was ignored because its required attribution is missing.";
  }

  return undefined;
}

function httpsUrl(value: string | undefined): string | undefined {
  const candidate = nonEmptyText(value);
  if (!candidate) {
    return undefined;
  }

  try {
    return new URL(candidate).protocol === "https:" ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function isTileTemplate(value: string): boolean {
  return ["{z}", "{x}", "{y}"].every((token) => value.includes(token));
}

function nonEmptyText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

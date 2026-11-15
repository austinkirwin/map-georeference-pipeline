import { describe, expect, it } from "vitest";
import {
  DEFAULT_REFERENCE_BASEMAP_NAME,
  DEFAULT_REFERENCE_STYLE_URL,
  resolveReferenceBasemap
} from "./basemap";

describe("reference basemap configuration", () => {
  it("uses the no-key OpenFreeMap style by default", () => {
    const basemap = resolveReferenceBasemap({});

    expect(basemap.displayName).toBe(DEFAULT_REFERENCE_BASEMAP_NAME);
    expect(basemap.style).toBe(DEFAULT_REFERENCE_STYLE_URL);
    expect(basemap.configurationNotice).toBeUndefined();
  });

  it("uses a configured HTTPS style URL", () => {
    const basemap = resolveReferenceBasemap({
      VITE_REFERENCE_STYLE_NAME: "County reference map",
      VITE_REFERENCE_STYLE_URL: "https://maps.example.org/styles/review.json"
    });

    expect(basemap.displayName).toBe("County reference map");
    expect(basemap.sourceUrl).toBe("https://maps.example.org/styles/review.json");
    expect(basemap.style).toBe("https://maps.example.org/styles/review.json");
  });

  it("builds a raster style only with a tile template and attribution", () => {
    const basemap = resolveReferenceBasemap({
      VITE_REFERENCE_TILE_ATTRIBUTION: "© County GIS",
      VITE_REFERENCE_TILE_URL: "https://tiles.example.org/{z}/{x}/{y}.png"
    });

    expect(typeof basemap.style).toBe("object");
    if (typeof basemap.style === "string") {
      throw new Error("Expected a raster style object.");
    }
    expect(basemap.style.sources["configured-reference-raster"]).toMatchObject({
      attribution: "© County GIS",
      tiles: ["https://tiles.example.org/{z}/{x}/{y}.png"],
      type: "raster"
    });
  });

  it("falls back when a tile source is incomplete or unsafe", () => {
    const missingAttribution = resolveReferenceBasemap({
      VITE_REFERENCE_TILE_URL: "https://tiles.example.org/{z}/{x}/{y}.png"
    });
    const insecureStyle = resolveReferenceBasemap({
      VITE_REFERENCE_STYLE_URL: "http://maps.example.org/style.json"
    });

    expect(missingAttribution.style).toBe(DEFAULT_REFERENCE_STYLE_URL);
    expect(missingAttribution.configurationNotice).toContain("attribution");
    expect(insecureStyle.style).toBe(DEFAULT_REFERENCE_STYLE_URL);
    expect(insecureStyle.configurationNotice).toContain("HTTPS");
  });
});

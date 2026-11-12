import { describe, expect, it } from "vitest";
import {
  analyzeGeoreference,
  applyAffineTransform,
  fitProjectedAffine,
  fromWebMercator,
  toWebMercator
} from "./georeference";

describe("georeference helpers", () => {
  it("fits an affine transform from three exact projected samples", () => {
    const transform = fitProjectedAffine([
      { pixel: { x: 0, y: 0 }, projected: { x: 10, y: -5 } },
      { pixel: { x: 2, y: 0 }, projected: { x: 16, y: 3 } },
      { pixel: { x: 0, y: 4 }, projected: { x: 2, y: 15 } }
    ]);

    expect(transform).toBeDefined();
    expect(applyAffineTransform(transform!, { x: 1, y: 2 })).toEqual({
      x: 9,
      y: 9
    });
  });

  it("round-trips a WGS84 coordinate through Web Mercator", () => {
    const original = { longitude: -88.25, latitude: 40.11, crs: "EPSG:4326" };
    const restored = fromWebMercator(toWebMercator(original));

    expect(restored.longitude).toBeCloseTo(original.longitude, 8);
    expect(restored.latitude).toBeCloseTo(original.latitude, 8);
  });

  it("requires three enabled fit points", () => {
    const analysis = analyzeGeoreference(
      [
        {
          id: "one",
          label: "One",
          kind: "other",
          historicPixel: { x: 0, y: 0 },
          modernLocation: { longitude: -88, latitude: 40, crs: "EPSG:4326" },
          role: "fit",
          confidence: "high",
          enabled: true
        }
      ],
      100,
      100
    );

    expect(analysis.transform).toBeUndefined();
    expect(analysis.warnings[0]).toContain("three enabled fit points");
  });
});

import { describe, expect, it } from "vitest";
import { applyAffineTransform, fromWebMercator, toWebMercator } from "./georeference";
import { historicOverlayCorners } from "./historicOverlay";

describe("historicOverlayCorners", () => {
  it("preserves rotated and sheared image corner order, not a bounding box", () => {
    const origin = toWebMercator({ longitude: -85.6, latitude: 42.9, crs: "EPSG:4326" });
    const transform = {
      parameters: [2, 1, origin.x, 0.5, -2, origin.y] as [
        number,
        number,
        number,
        number,
        number,
        number
      ]
    };
    const pixels = [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 800 },
      { x: 0, y: 800 }
    ];
    const actual = historicOverlayCorners(transform, 1000, 800);
    expect(actual).toHaveLength(4);
    pixels.forEach((pixel, index) => {
      const expected = fromWebMercator(applyAffineTransform(transform, pixel));
      expect(actual![index][0]).toBeCloseTo(expected.longitude, 10);
      expect(actual![index][1]).toBeCloseTo(expected.latitude, 10);
    });
    expect(actual![0][1]).toBeLessThan(actual![1][1]);
  });

  it("rejects missing, degenerate and invalid fits", () => {
    expect(historicOverlayCorners(undefined, 100, 100)).toBeUndefined();
    expect(historicOverlayCorners({ parameters: [1, 2, 0, 1, 2, 0] }, 100, 100)).toBeUndefined();
    expect(historicOverlayCorners({ parameters: [1, 0, 0, 0, 1, 0] }, 0, 100)).toBeUndefined();
    expect(
      historicOverlayCorners({ parameters: [1, 0, 20037509, 0, 1, 0] }, 100, 100)
    ).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { toWebMercator } from "./georeference";
import { historicExtentBounds } from "./historicExtent";

describe("historicExtentBounds", () => {
  it("bounds all four transformed corners of a rotated sheet", () => {
    const origin = toWebMercator({ longitude: -85.6, latitude: 42.9, crs: "EPSG:4326" });
    const bounds = historicExtentBounds(
      { parameters: [2, 1, origin.x, 0.5, -2, origin.y] },
      1000,
      800
    );
    expect(bounds).toBeDefined();
    expect(bounds![0][0]).toBeCloseTo(-85.6, 6);
    expect(bounds![1][0]).toBeGreaterThan(-85.58);
    expect(bounds![0][1]).toBeLessThan(42.9);
    expect(bounds![1][1]).toBeGreaterThan(42.9);
  });

  it("rejects absent, singular, invalid and out-of-world fits", () => {
    expect(historicExtentBounds(undefined, 100, 100)).toBeUndefined();
    expect(historicExtentBounds({ parameters: [1, 2, 0, 1, 2, 0] }, 100, 100)).toBeUndefined();
    expect(historicExtentBounds({ parameters: [1, 0, 0, 0, 1, 0] }, 0, 100)).toBeUndefined();
    expect(
      historicExtentBounds({ parameters: [1, 0, 20037509, 0, 1, 0] }, 100, 100)
    ).toBeUndefined();
    expect(
      historicExtentBounds({ parameters: [Number.NaN, 0, 0, 0, 1, 0] }, 100, 100)
    ).toBeUndefined();
  });
});

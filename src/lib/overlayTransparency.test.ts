import { describe, expect, it } from "vitest";
import { fadeLightBackground } from "./overlayTransparency";

describe("fadeLightBackground", () => {
  it("removes white paper, retains dark and saturated marks, and preserves RGB", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 0, 0, 0, 255, 240, 240, 240, 255, 255, 0, 0, 255
    ]);
    fadeLightBackground(pixels);
    expect([...pixels]).toEqual([
      255, 255, 255, 0, 0, 0, 0, 255, 240, 240, 240, 15, 255, 0, 0, 255
    ]);
  });

  it("multiplies existing transparency instead of making pixels opaque", () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 0, 127, 127, 127, 100]);
    fadeLightBackground(pixels);
    expect([...pixels]).toEqual([0, 0, 0, 0, 127, 127, 127, 50]);
  });
});

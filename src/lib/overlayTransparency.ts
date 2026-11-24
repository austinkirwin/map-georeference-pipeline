export type HistoricOverlayStyle = "ink" | "original";

/**
 * Fade near-white pixels while preserving dark and saturated marks. Multiply
 * by existing alpha so transparent source pixels remain transparent. RGB is
 * left unchanged; this is a display-only operation on a copy of the image.
 */
export function fadeLightBackground(pixels: Uint8ClampedArray): void {
  for (let index = 0; index < pixels.length; index += 4) {
    const darkness = 255 - Math.min(pixels[index], pixels[index + 1], pixels[index + 2]);
    pixels[index + 3] = (pixels[index + 3] * darkness) / 255;
  }
}

import { applyAffineTransform, fromWebMercator, type AffineTransform } from "./georeference";

export type GeographicBounds = [[number, number], [number, number]];

/** Approximate bounds of the full image sheet for a provisional affine fit. */
export function historicExtentBounds(
  transform: AffineTransform | undefined,
  width: number,
  height: number
): GeographicBounds | undefined {
  if (
    !transform ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !transform.parameters.every(Number.isFinite)
  ) {
    return undefined;
  }
  const [a, b, , d, e] = transform.parameters;
  const axisScale = Math.hypot(a, d) * Math.hypot(b, e);
  if (axisScale === 0 || Math.abs(a * e - b * d) <= axisScale * 1e-10) {
    return undefined;
  }
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ].map((pixel) => applyAffineTransform(transform, pixel));
  const maxMercator = 20037508.342789244;
  if (
    corners.some(
      ({ x, y }) =>
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        Math.abs(x) > maxMercator ||
        Math.abs(y) > maxMercator
    )
  ) {
    return undefined;
  }
  const coordinates = corners.map(fromWebMercator);
  const longitudes = coordinates.map(({ longitude }) => longitude);
  const latitudes = coordinates.map(({ latitude }) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  if (east - west < 1e-9 || north - south < 1e-9 || east - west > 180) {
    return undefined;
  }
  return [
    [west, south],
    [east, north]
  ];
}

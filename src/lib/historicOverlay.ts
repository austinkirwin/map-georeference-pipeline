import { applyAffineTransform, fromWebMercator, type AffineTransform } from "./georeference";
import { historicExtentBounds } from "./historicExtent";

/** Historic image corners in image order: top left, top right, bottom right, bottom left. */
export type HistoricOverlayCorners = [
  [number, number],
  [number, number],
  [number, number],
  [number, number]
];

/** Maps the full source sheet through the provisional pixel-to-Web-Mercator fit. */
export function historicOverlayCorners(
  transform: AffineTransform | undefined,
  width: number,
  height: number
): HistoricOverlayCorners | undefined {
  if (!transform || !historicExtentBounds(transform, width, height)) {
    return undefined;
  }
  const pixels = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ];
  return pixels.map((pixel) => {
    const coordinate = fromWebMercator(applyAffineTransform(transform, pixel));
    return [coordinate.longitude, coordinate.latitude];
  }) as HistoricOverlayCorners;
}

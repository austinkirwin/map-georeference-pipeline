import type { MouseEvent } from "react";
import type { GroundControlPoint, HistoricMap, HistoricPixel } from "../domain/types";

interface HistoricMapPaneProps {
  map: HistoricMap;
  controlPoints: GroundControlPoint[];
  pendingPoint?: HistoricPixel;
  onPick: (point: HistoricPixel) => void;
}

export function HistoricMapPane({
  map,
  controlPoints,
  pendingPoint,
  onPick
}: HistoricMapPaneProps) {
  const pointNumberById = new Map(
    controlPoints.map((controlPoint, index) => [controlPoint.id, index + 1])
  );

  function handleImageClick(event: MouseEvent<HTMLImageElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * map.widthPx;
    const y = ((event.clientY - bounds.top) / bounds.height) * map.heightPx;
    onPick({ x: Math.round(x), y: Math.round(y) });
  }

  return (
    <section className="map-pane historic-pane" aria-label="Historical scan">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">Step 1 · historic pixels</p>
          <h2>{map.title}</h2>
        </div>
        <span className="source-badge">Unwarped source</span>
      </div>
      <p className="pane-instruction">
        Click a durable landmark on the scan, then click its counterpart on the modern map.
      </p>
      <div className="historic-map-stage">
        <img
          src={map.rawImageUrl}
          alt={map.title + " historical map"}
          draggable={false}
          onClick={handleImageClick}
        />
        {controlPoints
          .filter((controlPoint) => controlPoint.enabled)
          .map((controlPoint) => (
            <span
              className={"point-marker " + controlPoint.role}
              key={controlPoint.id}
              style={{
                left: (controlPoint.historicPixel.x / map.widthPx) * 100 + "%",
                top: (controlPoint.historicPixel.y / map.heightPx) * 100 + "%"
              }}
              title={controlPoint.label}
            >
              {pointNumberById.get(controlPoint.id)}
            </span>
          ))}
        {pendingPoint ? (
          <span
            className="point-marker pending"
            style={{
              left: (pendingPoint.x / map.widthPx) * 100 + "%",
              top: (pendingPoint.y / map.heightPx) * 100 + "%"
            }}
          >
            ?
          </span>
        ) : null}
      </div>
      <div className="pane-footer">
        <span>
          {map.widthPx.toLocaleString()} × {map.heightPx.toLocaleString()} px
        </span>
        <span>
          {map.mapDate} · {map.sheet}
        </span>
      </div>
    </section>
  );
}

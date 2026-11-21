import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import type { GroundControlPoint, HistoricMap, HistoricPixel } from "../domain/types";

const minimumHistoricZoom = 1;
const maximumHistoricZoom = 4;
const historicZoomStep = 0.25;

interface HistoricMapPaneProps {
  map: HistoricMap;
  controlPoints: GroundControlPoint[];
  pendingPoint?: HistoricPixel;
  onPick: (point: HistoricPixel) => void;
}

interface ViewportCenter {
  x: number;
  y: number;
}

export function HistoricMapPane({
  map,
  controlPoints,
  pendingPoint,
  onPick
}: HistoricMapPaneProps) {
  const [zoom, setZoom] = useState(minimumHistoricZoom);
  const stageRef = useRef<HTMLDivElement>(null);
  const pendingViewportCenterRef = useRef<ViewportCenter | undefined>(undefined);
  const resetViewRef = useRef(false);
  const pointNumberById = new Map(
    controlPoints.map((controlPoint, index) => [controlPoint.id, index + 1])
  );
  const zoomPercent = Math.round(zoom * 100);

  useEffect(() => {
    pendingViewportCenterRef.current = undefined;
    resetViewRef.current = false;
    setZoom(minimumHistoricZoom);
    const stage = stageRef.current;
    if (stage) {
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
    }
  }, [map.id]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    if (resetViewRef.current) {
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
      resetViewRef.current = false;
      return;
    }

    const center = pendingViewportCenterRef.current;
    if (!center) {
      return;
    }
    pendingViewportCenterRef.current = undefined;
    stage.scrollLeft = clamp(
      center.x * stage.scrollWidth - stage.clientWidth / 2,
      0,
      Math.max(0, stage.scrollWidth - stage.clientWidth)
    );
    stage.scrollTop = clamp(
      center.y * stage.scrollHeight - stage.clientHeight / 2,
      0,
      Math.max(0, stage.scrollHeight - stage.clientHeight)
    );
  }, [zoom]);

  function handleImageClick(event: MouseEvent<HTMLImageElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - bounds.left) / bounds.width) * map.widthPx, 0, map.widthPx);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * map.heightPx, 0, map.heightPx);
    onPick({ x: Math.round(x), y: Math.round(y) });
  }

  function setHistoricZoom(nextZoom: number) {
    const next = clamp(nextZoom, minimumHistoricZoom, maximumHistoricZoom);
    if (next === zoom) {
      return;
    }

    const stage = stageRef.current;
    if (stage) {
      pendingViewportCenterRef.current = {
        x: (stage.scrollLeft + stage.clientWidth / 2) / stage.scrollWidth,
        y: (stage.scrollTop + stage.clientHeight / 2) / stage.scrollHeight
      };
    }
    setZoom(next);
  }

  function handleZoomChange(event: ChangeEvent<HTMLInputElement>) {
    setHistoricZoom(Number(event.target.value));
  }

  function resetHistoricView() {
    const stage = stageRef.current;
    if (zoom === minimumHistoricZoom) {
      if (stage) {
        stage.scrollLeft = 0;
        stage.scrollTop = 0;
      }
      return;
    }

    pendingViewportCenterRef.current = undefined;
    resetViewRef.current = true;
    setZoom(minimumHistoricZoom);
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
        Zoom in to inspect details. Above 100%, scroll inside the map to pan, then click a durable
        landmark and choose its counterpart on the modern map.
      </p>
      <div className="historic-map-controls" role="group" aria-label="Historic map zoom controls">
        <span className="historic-zoom-label">Zoom</span>
        <button
          aria-label="Zoom out of historic map"
          className="historic-zoom-button"
          disabled={zoom <= minimumHistoricZoom}
          onClick={() => setHistoricZoom(zoom - historicZoomStep)}
          type="button"
        >
          −
        </button>
        <input
          aria-label="Historic map zoom"
          max={maximumHistoricZoom}
          min={minimumHistoricZoom}
          onChange={handleZoomChange}
          step={historicZoomStep}
          type="range"
          value={zoom}
        />
        <output aria-live="polite" className="historic-zoom-value">
          {zoomPercent}%
        </output>
        <button
          aria-label="Zoom in on historic map"
          className="historic-zoom-button"
          disabled={zoom >= maximumHistoricZoom}
          onClick={() => setHistoricZoom(zoom + historicZoomStep)}
          type="button"
        >
          +
        </button>
        <button className="historic-reset-button" onClick={resetHistoricView} type="button">
          Reset
        </button>
      </div>
      <div
        className={"historic-map-stage" + (zoom > minimumHistoricZoom ? " is-zoomed" : "")}
        ref={stageRef}
        style={{ aspectRatio: map.widthPx + " / " + map.heightPx }}
      >
        <div className="historic-map-canvas" style={{ width: zoom * 100 + "%" }}>
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
      </div>
      <div className="historic-map-key" aria-label="Control point roles">
        <span>
          <i aria-hidden="true" className="point-key fit" /> Fit point: builds transform
        </span>
        <span>
          <i aria-hidden="true" className="point-key check" /> Independent check: validates it
        </span>
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

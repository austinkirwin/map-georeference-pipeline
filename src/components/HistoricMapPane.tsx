import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent
} from "react";
import type {
  ControlPointRole,
  GroundControlPoint,
  HistoricMap,
  HistoricPixel
} from "../domain/types";

const minimumHistoricZoom = 1;
const maximumHistoricZoom = 4;
const historicZoomStep = 0.25;
const pointPlacementDragThreshold = 8;

export type HistoricMapInteractionMode = "place" | "navigate";

interface HistoricMapPaneProps {
  map: HistoricMap;
  controlPoints: GroundControlPoint[];
  interactionMode: HistoricMapInteractionMode;
  nextPointRole: ControlPointRole;
  onInteractionModeChange: (mode: HistoricMapInteractionMode) => void;
  onPointRoleChange: (role: ControlPointRole) => void;
  onClearPoints: () => void;
  pendingPoint?: HistoricPixel;
  onPick: (point: HistoricPixel) => void;
}

interface ViewportAnchor {
  x: number;
  y: number;
  viewportX: number;
  viewportY: number;
}

interface PanState {
  pointerId: number;
  clientX: number;
  clientY: number;
  scrollLeft: number;
  scrollTop: number;
}

interface PointPlacementPointerState {
  pointerId: number;
  clientX: number;
  clientY: number;
  moved: boolean;
}

export function HistoricMapPane({
  map,
  controlPoints,
  interactionMode,
  nextPointRole,
  onInteractionModeChange,
  onPointRoleChange,
  onClearPoints,
  pendingPoint,
  onPick
}: HistoricMapPaneProps) {
  const [zoom, setZoom] = useState(minimumHistoricZoom);
  const [isPanning, setIsPanning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(minimumHistoricZoom);
  const pendingViewportAnchorRef = useRef<ViewportAnchor | undefined>(undefined);
  const panStateRef = useRef<PanState | undefined>(undefined);
  const pointPlacementPointerRef = useRef<PointPlacementPointerState | undefined>(undefined);
  const suppressNextImageClickRef = useRef(false);
  const resetViewRef = useRef(false);
  const pointNumberById = new Map(
    controlPoints.map((controlPoint, index) => [controlPoint.id, index + 1])
  );
  const zoomPercent = Math.round(zoom * 100);

  useEffect(() => {
    pendingViewportAnchorRef.current = undefined;
    resetViewRef.current = false;
    panStateRef.current = undefined;
    pointPlacementPointerRef.current = undefined;
    suppressNextImageClickRef.current = false;
    zoomRef.current = minimumHistoricZoom;
    setZoom(minimumHistoricZoom);
    setIsPanning(false);
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

    const anchor = pendingViewportAnchorRef.current;
    if (!anchor) {
      return;
    }
    pendingViewportAnchorRef.current = undefined;
    stage.scrollLeft = clamp(
      anchor.x * stage.scrollWidth - anchor.viewportX,
      0,
      Math.max(0, stage.scrollWidth - stage.clientWidth)
    );
    stage.scrollTop = clamp(
      anchor.y * stage.scrollHeight - anchor.viewportY,
      0,
      Math.max(0, stage.scrollHeight - stage.clientHeight)
    );
  }, [zoom]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const wheelTarget = stage;

    function handleNativeWheel(event: WheelEvent) {
      if (event.deltaY === 0) {
        return;
      }

      event.preventDefault();
      const bounds = wheelTarget.getBoundingClientRect();
      const anchor = viewportAnchor(
        wheelTarget,
        clamp(event.clientX - bounds.left, 0, wheelTarget.clientWidth),
        clamp(event.clientY - bounds.top, 0, wheelTarget.clientHeight)
      );
      const next = clamp(
        zoomRef.current + (event.deltaY < 0 ? historicZoomStep : -historicZoomStep),
        minimumHistoricZoom,
        maximumHistoricZoom
      );
      if (next === zoomRef.current) {
        return;
      }

      pendingViewportAnchorRef.current = anchor;
      zoomRef.current = next;
      setZoom(next);
    }

    wheelTarget.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => wheelTarget.removeEventListener("wheel", handleNativeWheel);
  }, []);

  function handleImageClick(event: MouseEvent<HTMLImageElement>) {
    if (suppressNextImageClickRef.current) {
      suppressNextImageClickRef.current = false;
      return;
    }
    if (interactionMode !== "place") {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - bounds.left) / bounds.width) * map.widthPx, 0, map.widthPx);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * map.heightPx, 0, map.heightPx);
    onPick({ x: Math.round(x), y: Math.round(y) });
  }

  function setHistoricZoom(nextZoom: number, anchor?: ViewportAnchor) {
    const next = clamp(nextZoom, minimumHistoricZoom, maximumHistoricZoom);
    if (next === zoomRef.current) {
      return;
    }

    const stage = stageRef.current;
    if (stage && !anchor) {
      anchor = viewportAnchor(stage, stage.clientWidth / 2, stage.clientHeight / 2);
    }
    if (anchor) {
      pendingViewportAnchorRef.current = anchor;
    }
    zoomRef.current = next;
    setZoom(next);
  }

  function handleZoomChange(event: ChangeEvent<HTMLInputElement>) {
    setHistoricZoom(Number(event.target.value));
  }

  function handleStagePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    if (interactionMode === "place") {
      pointPlacementPointerRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        moved: false
      };
      return;
    }

    const stage = event.currentTarget;
    stage.setPointerCapture(event.pointerId);
    panStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop
    };
    setIsPanning(true);
    event.preventDefault();
  }

  function handleStagePointerMove(event: PointerEvent<HTMLDivElement>) {
    const pointPlacementPointer = pointPlacementPointerRef.current;
    if (pointPlacementPointer?.pointerId === event.pointerId) {
      const distance = Math.hypot(
        event.clientX - pointPlacementPointer.clientX,
        event.clientY - pointPlacementPointer.clientY
      );
      if (distance >= pointPlacementDragThreshold) {
        pointPlacementPointer.moved = true;
      }
      return;
    }

    const panState = panStateRef.current;
    if (!panState || panState.pointerId !== event.pointerId) {
      return;
    }
    const stage = event.currentTarget;
    stage.scrollLeft = panState.scrollLeft - (event.clientX - panState.clientX);
    stage.scrollTop = panState.scrollTop - (event.clientY - panState.clientY);
    event.preventDefault();
  }

  function finishStagePan(event: PointerEvent<HTMLDivElement>) {
    const pointPlacementPointer = pointPlacementPointerRef.current;
    if (pointPlacementPointer?.pointerId === event.pointerId) {
      pointPlacementPointerRef.current = undefined;
      if (pointPlacementPointer.moved) {
        suppressNextImageClickRef.current = true;
        window.setTimeout(() => {
          suppressNextImageClickRef.current = false;
        }, 0);
      }
      return;
    }

    const panState = panStateRef.current;
    if (!panState || panState.pointerId !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panStateRef.current = undefined;
    setIsPanning(false);
  }

  function handleStageKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (interactionMode !== "navigate") {
      return;
    }

    const stage = event.currentTarget;
    const step = event.shiftKey ? Math.max(stage.clientWidth, stage.clientHeight) / 2 : 56;
    switch (event.key) {
      case "ArrowLeft":
        stage.scrollLeft -= step;
        break;
      case "ArrowRight":
        stage.scrollLeft += step;
        break;
      case "ArrowUp":
        stage.scrollTop -= step;
        break;
      case "ArrowDown":
        stage.scrollTop += step;
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function resetHistoricView() {
    const stage = stageRef.current;
    if (zoomRef.current === minimumHistoricZoom) {
      if (stage) {
        stage.scrollLeft = 0;
        stage.scrollTop = 0;
      }
      return;
    }

    pendingViewportAnchorRef.current = undefined;
    resetViewRef.current = true;
    zoomRef.current = minimumHistoricZoom;
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
      <p className="pane-instruction" id="historic-map-interaction-help">
        {interactionMode === "place"
          ? "Place-points mode: scroll to zoom, then click a durable landmark and choose its counterpart on the modern map."
          : "Move-around mode: scroll to zoom around the cursor and click-drag or use the arrow keys to pan. Switch back to Place points before selecting a landmark."}
      </p>
      <div className="historic-map-toolbar">
        <div className="historic-map-mode-control">
          <span className="historic-toolbar-label">Mode</span>
          <div className="historic-interaction-toggle" role="group" aria-label="Historic map mode">
            <button
              aria-pressed={interactionMode === "place"}
              className={
                interactionMode === "place"
                  ? "historic-interaction-button active"
                  : "historic-interaction-button"
              }
              onClick={() => onInteractionModeChange("place")}
              type="button"
            >
              Place points
            </button>
            <button
              aria-pressed={interactionMode === "navigate"}
              className={
                interactionMode === "navigate"
                  ? "historic-interaction-button active"
                  : "historic-interaction-button"
              }
              onClick={() => onInteractionModeChange("navigate")}
              type="button"
            >
              Move around
            </button>
          </div>
        </div>
        {interactionMode === "place" ? (
          <div className="historic-point-role">
            <label className="historic-toolbar-label" htmlFor="next-point-role">
              Next point
            </label>
            <select
              id="next-point-role"
              onChange={(event) => onPointRoleChange(event.target.value as ControlPointRole)}
              value={nextPointRole}
            >
              <option value="fit">Fit point — builds transform</option>
              <option value="check">Independent check — validates transform</option>
            </select>
            <p className="historic-point-role-help">
              Fit points build the transform; use at least three well-distributed, non-collinear
              landmarks. Independent checks stay out of the fit and test its accuracy.
            </p>
          </div>
        ) : null}
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
        <button className="text-button clear-points-button" onClick={onClearPoints} type="button">
          Clear saved points
        </button>
      </div>
      <div
        aria-label={
          interactionMode === "place"
            ? "Historic map in point-placement mode"
            : "Historic map in move-around mode"
        }
        aria-describedby="historic-map-interaction-help"
        className={
          "historic-map-stage " +
          interactionMode +
          (zoom > minimumHistoricZoom ? " is-zoomed" : "") +
          (isPanning ? " is-panning" : "")
        }
        onPointerCancel={finishStagePan}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={finishStagePan}
        onKeyDown={handleStageKeyDown}
        ref={stageRef}
        role="region"
        style={{ aspectRatio: map.widthPx + " / " + map.heightPx }}
        tabIndex={0}
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
      <div className="historic-map-footer">
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
      </div>
    </section>
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function viewportAnchor(
  stage: HTMLDivElement,
  viewportX: number,
  viewportY: number
): ViewportAnchor {
  return {
    x: (stage.scrollLeft + viewportX) / Math.max(stage.scrollWidth, 1),
    y: (stage.scrollTop + viewportY) / Math.max(stage.scrollHeight, 1),
    viewportX,
    viewportY
  };
}

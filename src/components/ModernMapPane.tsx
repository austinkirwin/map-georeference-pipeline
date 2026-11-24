import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GroundControlPoint, MapCoordinate, ModernMapView } from "../domain/types";
import { resolveReferenceBasemap } from "../lib/basemap";
import type { AffineTransform } from "../lib/georeference";
import { historicExtentBounds } from "../lib/historicExtent";
import type { HistoricOverlayCorners } from "../lib/historicOverlay";
import { fadeLightBackground, type HistoricOverlayStyle } from "../lib/overlayTransparency";

interface ModernMapPaneProps {
  controlPoints: GroundControlPoint[];
  onPick: (point: MapCoordinate) => void;
  showOverlay: boolean;
  overlayOpacity: number;
  overlayStyle: HistoricOverlayStyle;
  historicImageUrl: string;
  overlayCorners?: HistoricOverlayCorners;
  viewportAspectRatio: number;
  historicTransform?: AffineTransform;
  historicWidth: number;
  historicHeight: number;
  initialView?: ModernMapView;
}

const sourceId = "control-points";
const overlaySourceId = "historical-overlay";
const overlayLayerId = "historical-overlay-layer";
const referenceBasemap = resolveReferenceBasemap(import.meta.env);

export function ModernMapPane({
  controlPoints,
  onPick,
  showOverlay,
  overlayOpacity,
  overlayStyle,
  historicImageUrl,
  overlayCorners,
  viewportAspectRatio,
  historicTransform,
  historicWidth,
  historicHeight,
  initialView
}: ModernMapPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onPickRef = useRef(onPick);
  const pointsRef = useRef(controlPoints);
  const showOverlayRef = useRef(showOverlay);
  const overlayOpacityRef = useRef(overlayOpacity);
  const overlayStyleRef = useRef(overlayStyle);
  const restyleOverlayRef = useRef<((style: HistoricOverlayStyle) => void) | undefined>(undefined);
  const [runtimeBasemapError, setRuntimeBasemapError] = useState<string>();
  const [overlayError, setOverlayError] = useState<string>();
  const [overlayResolutionNotice, setOverlayResolutionNotice] = useState<string>();
  const [overlayStyleError, setOverlayStyleError] = useState<string>();
  const basemapMessage = runtimeBasemapError ?? referenceBasemap.configurationNotice;
  const historicBounds = historicExtentBounds(historicTransform, historicWidth, historicHeight);
  const overlayCornersKey = overlayCorners ? JSON.stringify(overlayCorners) : "";

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    pointsRef.current = controlPoints;
    updateControlPointSource(mapRef.current, controlPoints);
  }, [controlPoints]);

  useEffect(() => {
    showOverlayRef.current = showOverlay;
    overlayOpacityRef.current = overlayOpacity;
    updateOverlay(mapRef.current, showOverlay, overlayOpacity);
  }, [showOverlay, overlayOpacity]);

  useEffect(() => {
    overlayStyleRef.current = overlayStyle;
    restyleOverlayRef.current?.(overlayStyle);
  }, [overlayStyle]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    const coordinates = overlayCornersKey
      ? (JSON.parse(overlayCornersKey) as HistoricOverlayCorners)
      : undefined;
    setOverlayResolutionNotice(undefined);
    setOverlayStyleError(undefined);
    setOverlayError(
      showOverlay && !coordinates
        ? "The overlay is unavailable because the current fit is invalid. Return to point selection and check the enabled fit points."
        : undefined
    );
    let disposed = false;
    let cancelOverlayLoad: (() => void) | undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [initialView?.longitude ?? 0, initialView?.latitude ?? 20],
      zoom: initialView?.zoom ?? 1.5,
      style: referenceBasemap.style
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const handleMapError = () => {
      setRuntimeBasemapError(
        "The reference basemap could not be loaded. Check its provider settings and use an approved reference source."
      );
      if (showOverlay) {
        setOverlayError(
          "The map reported an error while rendering. Check the overlay before relying on it."
        );
      }
    };
    map.on("error", handleMapError);

    map.on("load", () => {
      map.addSource(sourceId, {
        type: "geojson",
        data: controlPointGeoJson(pointsRef.current)
      });
      map.addLayer({
        id: sourceId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 8,
          "circle-color": ["match", ["get", "role"], "fit", "#0d6e68", "#b84a25"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      });
      updateControlPointSource(map, pointsRef.current);
      if (showOverlay && coordinates) {
        cancelOverlayLoad = addHistoricOverlay(
          map,
          historicImageUrl,
          coordinates,
          () => overlayStyleRef.current,
          () => ({ visible: showOverlayRef.current, opacity: overlayOpacityRef.current }),
          (restyle) => {
            if (!disposed) {
              restyleOverlayRef.current = (style) => {
                restyle(style);
                updateOverlay(map, showOverlayRef.current, overlayOpacityRef.current);
              };
            }
          },
          (message) => {
            if (!disposed) setOverlayStyleError(message);
          },
          (reducedResolution) => {
            if (disposed) return;
            if (reducedResolution) {
              setOverlayResolutionNotice(
                "The overlay preview was reduced in resolution to fit this device; the saved source and point coordinates are unchanged."
              );
            }
            updateOverlay(map, showOverlayRef.current, overlayOpacityRef.current);
            const longitudes = coordinates.map(([longitude]) => longitude);
            const latitudes = coordinates.map(([, latitude]) => latitude);
            map.fitBounds(
              [
                [Math.min(...longitudes), Math.min(...latitudes)],
                [Math.max(...longitudes), Math.max(...latitudes)]
              ],
              { padding: 16, maxZoom: 18, duration: 0 }
            );
          },
          () => {
            if (!disposed)
              setOverlayError(
                "The historic image could not be loaded for the overlay. Reopen the review copy and try again."
              );
          }
        );
      }
    });

    map.on("click", (event) => {
      if (showOverlay) return;
      onPickRef.current({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        crs: "EPSG:4326"
      });
    });

    return () => {
      disposed = true;
      restyleOverlayRef.current = undefined;
      cancelOverlayLoad?.();
      map.off("error", handleMapError);
      map.remove();
      mapRef.current = null;
    };
  }, [
    historicImageUrl,
    initialView?.latitude,
    initialView?.longitude,
    initialView?.zoom,
    overlayCornersKey,
    showOverlay
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let animationFrame: number | undefined;
    const queueResize = () => {
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
      animationFrame = window.requestAnimationFrame(() => {
        mapRef.current?.resize();
      });
    };
    const observer = new ResizeObserver(queueResize);
    observer.observe(container);
    queueResize();

    return () => {
      observer.disconnect();
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <section className="map-pane modern-pane" aria-label="Modern reference map">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">Step 2 · modern reference</p>
          <h2>Current map layers</h2>
        </div>
        <span className="source-badge">{referenceBasemap.displayName}</span>
      </div>
      <div className="modern-map-description">
        <p className="pane-instruction">
          Choose the same landmark. This reference map is for orientation; authoritative municipal
          layers belong here before publication.
        </p>
        {basemapMessage ? (
          <p className="basemap-alert" role="alert">
            {basemapMessage}
          </p>
        ) : null}
        {overlayError ? (
          <p className="basemap-alert" role="alert">
            {overlayError}
          </p>
        ) : null}
        {overlayStyleError ? (
          <p className="basemap-alert" role="alert">
            {overlayStyleError}
          </p>
        ) : null}
        {overlayResolutionNotice ? <p className="panel-note">{overlayResolutionNotice}</p> : null}
      </div>
      <div className="modern-map-toolbar-spacer">
        <button
          className="text-button"
          disabled={!historicBounds}
          onClick={() => {
            if (historicBounds) {
              mapRef.current?.fitBounds(historicBounds, { padding: 16, maxZoom: 18 });
            }
          }}
          title="Fits the reference view to the full historic sheet using the current provisional fit. At least three usable fit points are required."
          type="button"
        >
          Show approximate historic extent
        </button>
        <p className="panel-note">
          {historicBounds
            ? "Uses the current provisional fit; verify it with independent check points."
            : "Available after at least three non-collinear fit points produce a usable estimate."}
        </p>
      </div>
      <div
        className="modern-map-stage"
        ref={containerRef}
        style={{ aspectRatio: viewportAspectRatio }}
      />
      <div className="pane-footer">
        <span>Green = fit point (builds transform)</span>
        <span>Orange = independent check (validates transform)</span>
      </div>
    </section>
  );
}

function updateControlPointSource(
  map: maplibregl.Map | null | undefined,
  points: GroundControlPoint[]
) {
  if (!map || !map.isStyleLoaded()) {
    return;
  }
  const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  source?.setData(controlPointGeoJson(points));
}

function updateOverlay(
  map: maplibregl.Map | null | undefined,
  showOverlay: boolean,
  overlayOpacity: number
) {
  if (!map?.style || !map.getLayer(overlayLayerId)) {
    return;
  }
  map.setLayoutProperty(overlayLayerId, "visibility", showOverlay ? "visible" : "none");
  map.setPaintProperty(overlayLayerId, "raster-opacity", overlayOpacity);
}

function addHistoricOverlay(
  map: maplibregl.Map,
  historicImageUrl: string,
  overlayCorners: HistoricOverlayCorners,
  currentStyle: () => HistoricOverlayStyle,
  currentPaint: () => { visible: boolean; opacity: number },
  onRestyleReady: (restyle: (style: HistoricOverlayStyle) => void) => void,
  onStyleError: (message: string | undefined) => void,
  onReady: (reducedResolution: boolean) => void,
  onError: () => void
): () => void {
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    if (map.getSource(overlaySourceId)) {
      return;
    }
    const canvas = document.createElement("canvas");
    if (!image.naturalWidth || !image.naturalHeight) {
      onError();
      return;
    }
    const gl = map.getCanvas().getContext("webgl2") ?? map.getCanvas().getContext("webgl");
    const maxTextureSize = gl ? (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) : 4096;
    if (!Number.isFinite(maxTextureSize) || maxTextureSize < 1) {
      onError();
      return;
    }
    const scale = Math.min(1, maxTextureSize / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.floor(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.floor(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      onError();
      return;
    }
    try {
      const attachOverlay = () => {
        const paint = currentPaint();
        map.addSource(overlaySourceId, {
          type: "canvas",
          canvas,
          coordinates: overlayCorners,
          animate: false
        });
        map.addLayer(
          {
            id: overlayLayerId,
            type: "raster",
            source: overlaySourceId,
            layout: { visibility: paint.visible ? "visible" : "none" },
            paint: { "raster-opacity": paint.opacity }
          },
          sourceId
        );
      };
      const drawStyle = (style: HistoricOverlayStyle) => {
        try {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          if (style === "ink") {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            fadeLightBackground(imageData.data);
            context.putImageData(imageData, 0, 0);
          }
          onStyleError(undefined);
        } catch {
          // Cross-origin security can block pixel reads and WebGL uploads.
          onStyleError(
            "The light-background view could not be created. Try Original scan or use a local or same-origin review copy; a cross-origin image may also prevent the original overlay from rendering."
          );
        }

        const source = map.getSource(overlaySourceId) as maplibregl.CanvasSource | undefined;
        if (source) {
          try {
            // A new source will upload the current canvas even if its previous
            // tile was off screen. Keep the map and camera unchanged.
            map.removeLayer(overlayLayerId);
            map.removeSource(overlaySourceId);
            attachOverlay();
          } catch {
            onError();
          }
        }
      };
      drawStyle(currentStyle());
      attachOverlay();
      onRestyleReady(drawStyle);
      onReady(scale < 1);
    } catch {
      onError();
    }
  };
  image.onerror = onError;
  image.src = historicImageUrl;
  return () => {
    image.onload = null;
    image.onerror = null;
  };
}

function controlPointGeoJson(points: GroundControlPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points
      .filter((point) => point.enabled)
      .map((point) => ({
        type: "Feature" as const,
        properties: {
          id: point.id,
          label: point.label,
          role: point.role
        },
        geometry: {
          type: "Point" as const,
          coordinates: [point.modernLocation.longitude, point.modernLocation.latitude] as [
            number,
            number
          ]
        }
      }))
  };
}

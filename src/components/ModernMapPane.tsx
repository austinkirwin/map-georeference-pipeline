import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GroundControlPoint, MapCoordinate, ModernMapView } from "../domain/types";
import { resolveReferenceBasemap } from "../lib/basemap";
import type { AffineTransform } from "../lib/georeference";
import { historicExtentBounds } from "../lib/historicExtent";

interface ModernMapPaneProps {
  controlPoints: GroundControlPoint[];
  onPick: (point: MapCoordinate) => void;
  showOverlay: boolean;
  overlayOpacity: number;
  historicImageUrl: string;
  overlayCorners: [[number, number], [number, number], [number, number], [number, number]];
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
  const [runtimeBasemapError, setRuntimeBasemapError] = useState<string>();
  const basemapMessage = runtimeBasemapError ?? referenceBasemap.configurationNotice;
  const historicBounds = historicExtentBounds(historicTransform, historicWidth, historicHeight);

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
    if (!containerRef.current) {
      return undefined;
    }

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
      addHistoricOverlay(
        map,
        historicImageUrl,
        overlayCorners,
        showOverlayRef.current,
        overlayOpacityRef.current,
        () => {
          updateOverlay(map, showOverlayRef.current, overlayOpacityRef.current);
        }
      );
    });

    map.on("click", (event) => {
      onPickRef.current({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        crs: "EPSG:4326"
      });
    });

    return () => {
      map.off("error", handleMapError);
      map.remove();
      mapRef.current = null;
    };
  }, [
    historicImageUrl,
    initialView?.latitude,
    initialView?.longitude,
    initialView?.zoom,
    overlayCorners
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
  if (!map || !map.isStyleLoaded() || !map.getLayer(overlayLayerId)) {
    return;
  }
  map.setLayoutProperty(overlayLayerId, "visibility", showOverlay ? "visible" : "none");
  map.setPaintProperty(overlayLayerId, "raster-opacity", overlayOpacity);
}

function addHistoricOverlay(
  map: maplibregl.Map,
  historicImageUrl: string,
  overlayCorners: [[number, number], [number, number], [number, number], [number, number]],
  showOverlay: boolean,
  overlayOpacity: number,
  onReady: () => void
) {
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    if (map.getSource(overlaySourceId)) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 1200;
    canvas.height = image.naturalHeight || 900;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    map.addSource(overlaySourceId, {
      type: "canvas",
      canvas,
      coordinates: overlayCorners,
      animate: false
    });
    map.addLayer({
      id: overlayLayerId,
      type: "raster",
      source: overlaySourceId,
      layout: {
        visibility: showOverlay ? "visible" : "none"
      },
      paint: {
        "raster-opacity": overlayOpacity
      }
    });
    onReady();
  };
  image.src = historicImageUrl;
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

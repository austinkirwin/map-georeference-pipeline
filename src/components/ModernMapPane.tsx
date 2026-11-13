import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GroundControlPoint, MapCoordinate, ModernMapView } from "../domain/types";

interface ModernMapPaneProps {
  controlPoints: GroundControlPoint[];
  onPick: (point: MapCoordinate) => void;
  showOverlay: boolean;
  overlayOpacity: number;
  historicImageUrl: string;
  overlayCorners: [[number, number], [number, number], [number, number], [number, number]];
  initialView?: ModernMapView;
}

const sourceId = "control-points";
const overlaySourceId = "historical-overlay";
const overlayLayerId = "historical-overlay-layer";

export function ModernMapPane({
  controlPoints,
  onPick,
  showOverlay,
  overlayOpacity,
  historicImageUrl,
  overlayCorners,
  initialView
}: ModernMapPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onPickRef = useRef(onPick);
  const pointsRef = useRef(controlPoints);
  const showOverlayRef = useRef(showOverlay);
  const overlayOpacityRef = useRef(overlayOpacity);

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
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          }
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm"
          }
        ]
      }
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

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

  return (
    <section className="map-pane modern-pane" aria-label="Modern reference map">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">Step 2 · modern reference</p>
          <h2>Current map layers</h2>
        </div>
        <span className="source-badge">OSM reference</span>
      </div>
      <p className="pane-instruction">
        Choose the same landmark. OSM is for orientation; authoritative municipal layers belong here
        before publication.
      </p>
      <div className="modern-map-stage" ref={containerRef} />
      <div className="pane-footer">
        <span>Green = fit point</span>
        <span>Orange = independent check point</span>
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

import type {
  GroundControlPoint,
  HistoricPixel,
  MapCoordinate,
  SourceCitation
} from "../domain/types";
import type { GeoreferenceProject } from "../domain/types";

const fictionalSource: SourceCitation = {
  id: "source-fictional-riverton",
  title: "Riverton demonstration map (fictional training fixture)",
  repository: "Local fixture bundled with this application",
  locator: "Synthetic sample; not evidence",
  accessedAt: "2026-11-11",
  rights: "CC0-style project fixture"
};

function modernCoordinateFor(pixel: HistoricPixel): MapCoordinate {
  /*
   * This deliberately simple relationship lets the fictional fixture produce
   * a useful affine fit. It is not a claim about the real-world location
   * displayed by the public reference basemap.
   */
  return {
    longitude: -88.278 + pixel.x * 0.0000085 - pixel.y * 0.0000003,
    latitude: 40.132 - pixel.x * 0.00000025 - pixel.y * 0.000009,
    crs: "EPSG:4326"
  };
}

function point(
  id: string,
  label: string,
  historicPixel: HistoricPixel,
  role: GroundControlPoint["role"],
  kind: GroundControlPoint["kind"]
): GroundControlPoint {
  return {
    id,
    label,
    kind,
    historicPixel,
    modernLocation: modernCoordinateFor(historicPixel),
    role,
    confidence: role === "check" ? "medium" : "high",
    enabled: true,
    source: fictionalSource,
    reviewerNote:
      role === "check"
        ? "Independent check point; excluded from the affine fit."
        : "Demonstration fit point."
  };
}

export const demoProject: GeoreferenceProject = {
  schemaVersion: "0.1",
  id: "riverton-1930-demo",
  title: "Riverton 1930 — fictional georeferencing demo",
  historicMap: {
    id: "riverton-zoning-1930-sheet-1",
    title: "Zoning & Street Map of Riverton (fictional)",
    placeName: "Riverton, Illinois (fictional)",
    mapDate: "1930-06-01",
    sheet: "1 of 1",
    rawImageUrl: "/samples/riverton-1930.svg",
    widthPx: 4000,
    heightPx: 3000,
    source: fictionalSource,
    status: "draft",
    targetCrs: "EPSG:3857"
  },
  referenceLayers: [
    {
      id: "osm-basemap",
      name: "OpenStreetMap standard raster basemap",
      kind: "basemap",
      source: "https://www.openstreetmap.org/copyright",
      status: "enabled",
      authority: "reference"
    },
    {
      id: "municipal-roads-placeholder",
      name: "Municipal roads (future authoritative connector)",
      kind: "roads",
      source: "Not connected in the demo",
      status: "available",
      authority: "authoritative"
    },
    {
      id: "historic-boundaries-placeholder",
      name: "Historic jurisdiction boundaries (future evidence layer)",
      kind: "boundaries",
      source: "Not connected in the demo",
      status: "available",
      authority: "authoritative"
    }
  ],
  controlPoints: [
    point("gcp-1", "Broad & First", { x: 460, y: 460 }, "fit", "road_intersection"),
    point("gcp-2", "Depot crossing", { x: 1350, y: 650 }, "fit", "rail_crossing"),
    point("gcp-3", "Court House corner", { x: 2800, y: 650 }, "fit", "civic_building"),
    point("gcp-4", "River bridge", { x: 3350, y: 1600 }, "fit", "bridge"),
    point("gcp-5", "Mill & South", { x: 2200, y: 2550 }, "fit", "road_intersection"),
    point("gcp-6", "West shoreline", { x: 700, y: 2250 }, "check", "shoreline"),
    point("gcp-7", "East market", { x: 3300, y: 2600 }, "check", "road_intersection")
  ],
  temporalJurisdictions: [
    {
      id: "riverton-municipality",
      name: "Riverton (fictional municipality)",
      governmentType: "municipality",
      validFrom: "1928-01-01",
      source: fictionalSource,
      status: "draft"
    }
  ],
  zoningEvidence: [
    {
      id: "riverton-r1-1930",
      jurisdictionId: "riverton-municipality",
      districtCode: "R-1",
      districtName: "Residence District",
      ordinanceTitle: "Fictional Riverton Zoning Ordinance of 1930",
      adoptedOn: "1930-05-15",
      effectiveFrom: "1930-06-01",
      source: fictionalSource,
      confidence: "low",
      status: "draft",
      notes: "Fixture only. A real finding requires the adopted map and ordinance citation."
    }
  ],
  sampleFinding: {
    address: "100 Example Avenue, Riverton (fictional)",
    queryDate: "1930-07-01",
    jurisdictionId: "riverton-municipality",
    zoningEvidenceIds: ["riverton-r1-1930"],
    result: "inconclusive",
    explanation:
      "The demo records a possible district association but has no adopted ordinance map or verified historical parcel geometry.",
    disclaimer:
      "Research aid only. This interface must not be used as a legal zoning determination."
  }
};

export const demoOverlayCorners: [
  [number, number],
  [number, number],
  [number, number],
  [number, number]
] = [
  [-88.278, 40.132],
  [-88.244, 40.131],
  [-88.2449, 40.103],
  [-88.2789, 40.104]
];

export function createDemoControlPoints(): GroundControlPoint[] {
  return demoProject.controlPoints.map((controlPoint) => ({
    ...controlPoint,
    historicPixel: { ...controlPoint.historicPixel },
    modernLocation: { ...controlPoint.modernLocation }
  }));
}

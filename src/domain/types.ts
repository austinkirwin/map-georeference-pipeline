export type Confidence = "low" | "medium" | "high";
export type ControlPointRole = "fit" | "check";
export type ReviewStatus = "draft" | "in_review" | "approved" | "rejected";
export type LandmarkKind =
  "road_intersection" | "bridge" | "rail_crossing" | "civic_building" | "shoreline" | "other";

export interface SourceCitation {
  id: string;
  title: string;
  repository?: string;
  url?: string;
  locator?: string;
  accessedAt: string;
  rights?: string;
}

export interface HistoricPixel {
  x: number;
  y: number;
}

export interface MapCoordinate {
  longitude: number;
  latitude: number;
  crs: string;
}

export interface GroundControlPoint {
  id: string;
  label: string;
  kind: LandmarkKind;
  historicPixel: HistoricPixel;
  modernLocation: MapCoordinate;
  role: ControlPointRole;
  confidence: Confidence;
  enabled: boolean;
  source?: SourceCitation;
  reviewerNote?: string;
}

export interface HistoricMap {
  id: string;
  title: string;
  placeName: string;
  mapDate: string;
  sheet?: string;
  rawImageUrl: string;
  widthPx: number;
  heightPx: number;
  source: SourceCitation;
  status: ReviewStatus;
  targetCrs: string;
}

export interface ReferenceLayer {
  id: string;
  name: string;
  kind: "basemap" | "roads" | "parcels" | "boundaries" | "zoning";
  source: string;
  status: "enabled" | "available";
  authority: "reference" | "authoritative";
}

export interface TemporalJurisdiction {
  id: string;
  name: string;
  governmentType: "municipality" | "county" | "unincorporated";
  validFrom: string;
  validTo?: string;
  source: SourceCitation;
  status: ReviewStatus;
}

export interface ZoningEvidence {
  id: string;
  jurisdictionId: string;
  districtCode: string;
  districtName: string;
  ordinanceTitle: string;
  adoptedOn?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  source: SourceCitation;
  confidence: Confidence;
  status: ReviewStatus;
  notes?: string;
}

export interface HistoricalZoningFinding {
  address: string;
  queryDate: string;
  jurisdictionId?: string;
  zoningEvidenceIds: string[];
  result: "supported" | "inconclusive" | "not_found";
  explanation: string;
  disclaimer: string;
}

export interface GeoreferenceProject {
  schemaVersion: "0.1";
  id: string;
  title: string;
  historicMap: HistoricMap;
  referenceLayers: ReferenceLayer[];
  controlPoints: GroundControlPoint[];
  temporalJurisdictions: TemporalJurisdiction[];
  zoningEvidence: ZoningEvidence[];
  sampleFinding: HistoricalZoningFinding;
}

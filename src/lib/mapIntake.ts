import { demoProject } from "../data/demoProject";
import type { GeoreferenceProject, ModernMapView, SourceCitation } from "../domain/types";

const mapIdPattern = /^[a-z0-9][a-z0-9-]{1,80}$/;
const fileNamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const publicMapReviewPath = "maps/public-review/";

export interface MapIntakeDocument {
  schemaVersion: "0.1";
  id: string;
  title: string;
  placeName: string;
  mapDate: string;
  reviewImage: string;
  widthPx: number;
  heightPx: number;
  targetCrs: string;
  modernMapView?: ModernMapView;
  source: SourceCitation;
  storage?: {
    originalUrl?: string;
    sha256?: string;
    reviewCopy?: {
      provider: "dropbox";
      fileId: string;
      revision: string;
      contentHash: string;
      sha256: string;
    };
  };
}

export function getIssueContext(search: string): {
  issueNumber?: number;
  mapId?: string;
} {
  const query = new URLSearchParams(search);
  const issueValue = query.get("issue");
  const mapId = query.get("map");
  const issueNumber =
    issueValue && /^[1-9][0-9]*$/.test(issueValue) ? Number(issueValue) : undefined;

  return {
    issueNumber,
    mapId: mapId && isValidMapId(mapId) ? mapId : undefined
  };
}

export function isValidMapId(value: string): boolean {
  return mapIdPattern.test(value);
}

export function mapManifestUrl(mapId: string, baseUrl = import.meta.env.BASE_URL): string {
  assertValidMapId(mapId);
  return joinBaseUrl(baseUrl, publicMapReviewPath + encodeURIComponent(mapId) + "/map.json");
}

export function mapReviewImageUrl(
  mapId: string,
  reviewImage: string,
  baseUrl = import.meta.env.BASE_URL
): string {
  assertValidMapId(mapId);
  if (!fileNamePattern.test(reviewImage)) {
    throw new Error("reviewImage must be a file name without directory segments.");
  }
  return joinBaseUrl(
    baseUrl,
    publicMapReviewPath + encodeURIComponent(mapId) + "/" + encodeURIComponent(reviewImage)
  );
}

export function parseMapIntake(value: unknown): MapIntakeDocument {
  if (!isRecord(value)) {
    throw new Error("Map intake data must be an object.");
  }
  const id = requiredString(value, "id");
  assertValidMapId(id);
  const source = requiredRecord(value, "source");
  const schemaVersion = requiredString(value, "schemaVersion");
  if (schemaVersion !== "0.1") {
    throw new Error("Unsupported map intake schema version.");
  }

  return {
    schemaVersion,
    id,
    title: requiredString(value, "title"),
    placeName: requiredString(value, "placeName"),
    mapDate: requiredString(value, "mapDate"),
    reviewImage: requiredFileName(value, "reviewImage"),
    widthPx: requiredPositiveInteger(value, "widthPx"),
    heightPx: requiredPositiveInteger(value, "heightPx"),
    targetCrs: requiredString(value, "targetCrs"),
    modernMapView: optionalModernMapView(value.modernMapView),
    source: {
      id: "source-" + id,
      title: requiredString(source, "title"),
      repository: optionalString(source, "repository"),
      url: optionalString(source, "url"),
      locator: optionalString(source, "locator"),
      accessedAt: requiredString(source, "accessedAt"),
      rights: optionalString(source, "rights")
    },
    storage: optionalStorage(value.storage)
  };
}

export function projectFromMapIntake(
  intake: MapIntakeDocument,
  baseUrl = import.meta.env.BASE_URL
): GeoreferenceProject {
  return {
    ...demoProject,
    id: intake.id,
    title: intake.title,
    modernMapView: intake.modernMapView,
    historicMap: {
      ...demoProject.historicMap,
      id: intake.id,
      title: intake.title,
      placeName: intake.placeName,
      mapDate: intake.mapDate,
      rawImageUrl: mapReviewImageUrl(intake.id, intake.reviewImage, baseUrl),
      widthPx: intake.widthPx,
      heightPx: intake.heightPx,
      source: intake.source,
      targetCrs: intake.targetCrs
    },
    controlPoints: [],
    temporalJurisdictions: [],
    zoningEvidence: [],
    sampleFinding: {
      address: "No historical address query selected",
      queryDate: intake.mapDate,
      result: "inconclusive",
      zoningEvidenceIds: [],
      explanation:
        "This map has been opened for landmark selection. Add historical jurisdiction and zoning evidence after the georeference review.",
      disclaimer: "Research aid only. A map alignment alone is not a legal zoning determination."
    }
  };
}

export interface LocalReviewProjectInput {
  id: string;
  title: string;
  imageUrl: string;
  widthPx: number;
  heightPx: number;
  issueNumber?: number;
}

export function projectFromLocalReview(input: LocalReviewProjectInput): GeoreferenceProject {
  assertValidMapId(input.id);
  const source: SourceCitation = {
    id: "source-" + input.id,
    title: "Private local review copy",
    repository: input.issueNumber
      ? "GitHub Issue #" + input.issueNumber + " attachment or collaborator-provided file"
      : "Collaborator-provided local file",
    accessedAt: new Date().toISOString().slice(0, 10),
    rights: "Not published by this picker. Verify source terms and provenance before approval."
  };

  return {
    ...demoProject,
    id: input.id,
    title: input.title,
    modernMapView: undefined,
    historicMap: {
      ...demoProject.historicMap,
      id: input.id,
      title: input.title,
      placeName: "Private review location not yet recorded",
      mapDate: "Date not yet recorded",
      rawImageUrl: input.imageUrl,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      source
    },
    controlPoints: [],
    temporalJurisdictions: [],
    zoningEvidence: [],
    sampleFinding: {
      address: "No historical address query selected",
      queryDate: "Date not yet recorded",
      result: "inconclusive",
      zoningEvidenceIds: [],
      explanation:
        "This private local review copy has no recorded jurisdiction, historical date, or zoning evidence yet.",
      disclaimer: "Research aid only. A map alignment alone is not a legal zoning determination."
    }
  };
}

export function localMapIdFromFileName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "").toLowerCase();
  const normalized = stem
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return "local-" + (normalized.length >= 2 ? normalized : "review-map");
}

function optionalStorage(value: unknown): MapIntakeDocument["storage"] {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error("storage must be an object when supplied.");
  }
  return {
    originalUrl: optionalString(value, "originalUrl"),
    sha256: optionalString(value, "sha256"),
    reviewCopy: optionalDropboxReviewCopy(value.reviewCopy)
  };
}

function optionalDropboxReviewCopy(
  value: unknown
): NonNullable<MapIntakeDocument["storage"]>["reviewCopy"] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error("storage.reviewCopy must be an object when supplied.");
  }
  if (requiredString(value, "provider") !== "dropbox") {
    throw new Error("storage.reviewCopy.provider must be dropbox.");
  }
  const checksum = requiredString(value, "sha256");
  if (!/^[a-f0-9]{64}$/i.test(checksum)) {
    throw new Error("storage.reviewCopy.sha256 must be a SHA-256 hexadecimal digest.");
  }
  return {
    provider: "dropbox",
    fileId: requiredString(value, "fileId"),
    revision: requiredString(value, "revision"),
    contentHash: requiredString(value, "contentHash"),
    sha256: checksum.toLowerCase()
  };
}

function optionalModernMapView(value: unknown): ModernMapView | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error("modernMapView must be an object when supplied.");
  }
  const longitude = requiredFiniteNumber(value, "longitude");
  const latitude = requiredFiniteNumber(value, "latitude");
  const zoom = requiredFiniteNumber(value, "zoom");
  if (
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90 ||
    zoom < 0 ||
    zoom > 22
  ) {
    throw new Error("modernMapView has invalid coordinates or zoom.");
  }
  return { longitude, latitude, zoom };
}

function joinBaseUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/?$/, "/") + path;
}

function assertValidMapId(value: string) {
  if (!isValidMapId(value)) {
    throw new Error("Map ID must use lowercase letters, numbers, and hyphens.");
  }
}

function requiredFileName(record: Record<string, unknown>, key: string): string {
  const value = requiredString(record, key);
  if (!fileNamePattern.test(value)) {
    throw new Error(key + " must be a file name without directory segments.");
  }
  return value;
}

function requiredPositiveInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(key + " must be a positive integer.");
  }
  return value;
}

function requiredFiniteNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(key + " must be a finite number.");
  }
  return value;
}

function requiredRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  if (!isRecord(value)) {
    throw new Error(key + " must be an object.");
  }
  return value;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(key + " must be a non-empty string.");
  }
  return value;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(key + " must be a string when supplied.");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

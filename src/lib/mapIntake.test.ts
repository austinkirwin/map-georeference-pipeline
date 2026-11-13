import { describe, expect, it } from "vitest";
import {
  getIssueContext,
  mapManifestUrl,
  mapReviewImageUrl,
  localMapIdFromFileName,
  parseMapIntake,
  projectFromLocalReview,
  projectFromMapIntake
} from "./mapIntake";
import kentwoodIntake from "../../maps/inbox/kentwood-mi-zoning-1970/map.json";

const intake = {
  schemaVersion: "0.1",
  id: "riverton-1930-sheet-01",
  title: "Riverton zoning map",
  placeName: "Riverton, Illinois",
  mapDate: "1930-06-01",
  reviewImage: "review-copy.jpg",
  widthPx: 4000,
  heightPx: 3000,
  targetCrs: "EPSG:3857",
  source: {
    title: "Riverton archive",
    accessedAt: "2026-11-12"
  }
};

describe("GitHub map intake helpers", () => {
  it("reads valid Issue and map query parameters", () => {
    expect(getIssueContext("?issue=17&map=riverton-1930-sheet-01")).toEqual({
      issueNumber: 17,
      mapId: "riverton-1930-sheet-01"
    });
  });

  it("rejects unsafe map paths", () => {
    expect(() => mapManifestUrl("../private", "/repo/")).toThrow("Map ID");
    expect(() => mapReviewImageUrl("riverton-1930-sheet-01", "../secret.jpg", "/repo/")).toThrow(
      "file name"
    );
  });

  it("creates root-relative map and image URLs", () => {
    expect(mapManifestUrl("riverton-1930-sheet-01", "/map-georeference-pipeline/")).toBe(
      "/map-georeference-pipeline/maps/inbox/riverton-1930-sheet-01/map.json"
    );
    expect(mapReviewImageUrl("riverton-1930-sheet-01", "review-copy.jpg", "/")).toBe(
      "/maps/inbox/riverton-1930-sheet-01/review-copy.jpg"
    );
  });

  it("turns valid intake JSON into an empty map project", () => {
    const project = projectFromMapIntake(parseMapIntake(intake), "/repo/");

    expect(project.id).toBe("riverton-1930-sheet-01");
    expect(project.controlPoints).toEqual([]);
    expect(project.temporalJurisdictions).toEqual([]);
    expect(project.zoningEvidence).toEqual([]);
    expect(project.historicMap.rawImageUrl).toBe(
      "/repo/maps/inbox/riverton-1930-sheet-01/review-copy.jpg"
    );
  });

  it("keeps the optional modern-map view with the intake project", () => {
    const project = projectFromMapIntake(
      parseMapIntake({
        ...intake,
        modernMapView: { longitude: -88.25, latitude: 40.1, zoom: 14 }
      }),
      "/repo/"
    );

    expect(project.modernMapView).toEqual({ longitude: -88.25, latitude: 40.1, zoom: 14 });
  });

  it("builds a browser-only project for a private local review copy", () => {
    const project = projectFromLocalReview({
      id: "local-1970-zoning-map",
      title: "1970 Zoning Map.pdf",
      imageUrl: "blob:private-review-copy",
      widthPx: 1000,
      heightPx: 800,
      issueNumber: 42
    });

    expect(project.controlPoints).toEqual([]);
    expect(project.temporalJurisdictions).toEqual([]);
    expect(project.zoningEvidence).toEqual([]);
    expect(project.historicMap.rawImageUrl).toBe("blob:private-review-copy");
    expect(project.historicMap.source.repository).toContain("Issue #42");
    expect(localMapIdFromFileName("1970 Zoning Map.pdf")).toBe("local-1970-zoning-map");
  });

  it("parses the Kentwood review-map intake fixture", () => {
    const project = projectFromMapIntake(parseMapIntake(kentwoodIntake), "/repo/");

    expect(project.id).toBe("kentwood-mi-zoning-1970");
    expect(project.historicMap.placeName).toBe("Kentwood, Michigan");
    expect(project.historicMap.rawImageUrl).toBe(
      "/repo/maps/inbox/kentwood-mi-zoning-1970/review-copy.png"
    );
    expect(project.modernMapView).toEqual({ longitude: -85.61, latitude: 42.88, zoom: 12 });
  });
});

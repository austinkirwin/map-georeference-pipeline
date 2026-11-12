import { describe, expect, it } from "vitest";
import {
  getIssueContext,
  mapManifestUrl,
  mapReviewImageUrl,
  parseMapIntake,
  projectFromMapIntake
} from "./mapIntake";

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

  it("creates Pages-safe map and image URLs", () => {
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
    expect(project.historicMap.rawImageUrl).toBe(
      "/repo/maps/inbox/riverton-1930-sheet-01/review-copy.jpg"
    );
  });
});

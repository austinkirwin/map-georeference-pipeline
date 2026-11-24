import { describe, expect, it } from "vitest";
import { demoProject } from "../data/demoProject";
import { analyzeGeoreference } from "./georeference";
import { buildDraftManifest, formatIssueLandmarkRecord } from "./reviewExports";

describe("retained review export helpers", () => {
  it("keeps the draft manifest structure, including disabled points", () => {
    const points = demoProject.controlPoints.map((point, index) => ({
      ...point,
      enabled: index !== 0
    }));
    const analysis = analyzeGeoreference(points, 4000, 3000);
    const exported = buildDraftManifest(demoProject, points, analysis, "2026-01-01T00:00:00Z");

    expect(exported.schemaVersion).toBe(demoProject.schemaVersion);
    expect(exported.exportedAt).toBe("2026-01-01T00:00:00Z");
    expect(exported.project.controlPoints).toEqual(points);
    expect(exported.provisionalAnalysis).toEqual(analysis);
  });

  it("formats enabled landmarks and the issue marker while escaping table labels", () => {
    const points = demoProject.controlPoints.slice(0, 2).map((point, index) => ({
      ...point,
      label: index === 0 ? "Main | First\nintersection" : "Disabled",
      enabled: index === 0
    }));
    const analysis = analyzeGeoreference(points, 4000, 3000);
    const record = formatIssueLandmarkRecord(demoProject, points, analysis, 42);

    expect(record).toContain("<!-- georef-control-points:map=riverton-1930-demo;issue=42 -->");
    expect(record).toContain("Main \\| First intersection");
    expect(record).not.toContain("Disabled");
    expect(record).toContain("Fit RMSE: not calculated");
  });
});

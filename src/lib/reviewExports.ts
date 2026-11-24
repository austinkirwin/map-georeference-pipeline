/** Draft export helpers retained for future review workflows. They are not wired to the picker UI. */
import type { GeoreferenceProject, GroundControlPoint } from "../domain/types";
import type { GeoreferenceAnalysis } from "./georeference";

export function buildDraftManifest(
  project: GeoreferenceProject,
  controlPoints: GroundControlPoint[],
  analysis: GeoreferenceAnalysis,
  exportedAt = new Date().toISOString()
) {
  return {
    schemaVersion: project.schemaVersion,
    exportedAt,
    project: { ...project, controlPoints },
    provisionalAnalysis: analysis
  };
}

/** Download a draft manifest only when explicitly invoked by a future UI. */
export function downloadDraftManifest(
  project: GeoreferenceProject,
  controlPoints: GroundControlPoint[],
  analysis: GeoreferenceAnalysis
): void {
  const manifest = buildDraftManifest(project, controlPoints, analysis);
  downloadBlob(
    new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }),
    project.id + "-georeference-manifest.json"
  );
}

/** Copy the record or fall back to downloading it when clipboard access is unavailable. */
export async function copyIssueLandmarkRecord(
  project: GeoreferenceProject,
  controlPoints: GroundControlPoint[],
  analysis: GeoreferenceAnalysis,
  issueNumber?: number
): Promise<"copied" | "downloaded"> {
  const record = formatIssueLandmarkRecord(project, controlPoints, analysis, issueNumber);
  try {
    await navigator.clipboard.writeText(record);
    return "copied";
  } catch {
    downloadBlob(
      new Blob([record], { type: "text/markdown" }),
      project.id + "-landmarks-for-issue.md"
    );
    return "downloaded";
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatIssueLandmarkRecord(
  project: GeoreferenceProject,
  controlPoints: GroundControlPoint[],
  analysis: GeoreferenceAnalysis,
  issueNumber?: number
): string {
  const marker =
    "<!-- georef-control-points:map=" +
    project.id +
    (issueNumber ? ";issue=" + issueNumber : "") +
    " -->";
  const rows = controlPoints
    .filter((point) => point.enabled)
    .map((point) => {
      const residual = analysis.residualMetersByPointId[point.id];
      return [
        escapeTableValue(point.label),
        point.role,
        point.historicPixel.x,
        point.historicPixel.y,
        point.modernLocation.longitude.toFixed(7),
        point.modernLocation.latitude.toFixed(7),
        residual === undefined ? "not calculated" : residual.toFixed(2) + " m",
        point.confidence
      ].join(" | ");
    });

  return [
    marker,
    "## Landmark record: " + project.title,
    "",
    "Map ID: " + project.id,
    issueNumber ? "Issue: #" + issueNumber : "Issue: add this record to the relevant map Issue",
    "Transform: " + (analysis.transform ? "affine" : "not fitted"),
    "Fit RMSE: " + formatMetric(analysis.fitRmseMeters),
    "Check RMSE: " + formatMetric(analysis.checkRmseMeters),
    "Sheet coverage: " + Math.round(analysis.coverageRatio * 100) + "%",
    "",
    "| Landmark | Role | Pixel X | Pixel Y | Longitude | Latitude | Residual | Confidence |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- | --- |",
    ...(rows.length > 0
      ? rows.map((row) => "| " + row + " |")
      : ["| No enabled points | — | — | — | — | — | — | — |"]),
    "",
    "Reviewer note: verify each landmark and its source before approving a transform.",
    "This record is a research aid and not a legal zoning determination."
  ].join("\n");
}

function escapeTableValue(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function formatMetric(value: number | undefined): string {
  return value === undefined ? "not calculated" : value.toFixed(2) + " m";
}

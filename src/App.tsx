import { useEffect, useMemo, useState } from "react";
import { ControlPointTable } from "./components/ControlPointTable";
import { HistoricMapPane } from "./components/HistoricMapPane";
import { ModernMapPane } from "./components/ModernMapPane";
import { QaPanel } from "./components/QaPanel";
import { ResearchFinding } from "./components/ResearchFinding";
import { demoOverlayCorners, demoProject } from "./data/demoProject";
import type {
  ControlPointRole,
  GeoreferenceProject,
  GroundControlPoint,
  HistoricPixel,
  MapCoordinate
} from "./domain/types";
import { analyzeGeoreference } from "./lib/georeference";
import {
  getIssueContext,
  mapManifestUrl,
  parseMapIntake,
  projectFromMapIntake
} from "./lib/mapIntake";

type WorkspaceMode = "edit" | "review";
type OverlayCorners = typeof demoOverlayCorners | undefined;

export default function App() {
  const issueContext = useMemo(() => getIssueContext(window.location.search), []);
  const [mode, setMode] = useState<WorkspaceMode>("edit");
  const [activeProject, setActiveProject] = useState<GeoreferenceProject>(demoProject);
  const [activeOverlayCorners, setActiveOverlayCorners] =
    useState<OverlayCorners>(demoOverlayCorners);
  const [mapLoadState, setMapLoadState] = useState<"demo" | "loading" | "ready" | "error">(
    issueContext.mapId ? "loading" : "demo"
  );
  const [controlPoints, setControlPoints] = useState<GroundControlPoint[]>(() =>
    readStoredControlPoints(demoProject)
  );
  const [hydratedProjectId, setHydratedProjectId] = useState(demoProject.id);
  const [pendingHistoricPoint, setPendingHistoricPoint] = useState<HistoricPixel>();
  const [nextPointRole, setNextPointRole] = useState<ControlPointRole>("fit");
  const [overlayOpacity, setOverlayOpacity] = useState(0.58);
  const [notice, setNotice] = useState(
    "Choose a durable landmark on the historical scan to begin a paired control point."
  );

  useEffect(() => {
    if (!issueContext.mapId) {
      return undefined;
    }

    let cancelled = false;
    const mapId = issueContext.mapId;
    setMapLoadState("loading");
    fetch(mapManifestUrl(mapId))
      .then((response) => {
        if (!response.ok) {
          throw new Error("Map intake manifest could not be loaded.");
        }
        return response.json();
      })
      .then((document) => {
        if (cancelled) {
          return;
        }
        const project = projectFromMapIntake(parseMapIntake(document));
        setActiveProject(project);
        setActiveOverlayCorners(undefined);
        setMapLoadState("ready");
        setNotice(
          "Loaded map " +
            project.id +
            ". Pair landmarks, then copy the issue-ready record into the linked GitHub Issue."
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setMapLoadState("error");
        setNotice(
          "The requested map intake record could not be loaded. Check that maps/inbox/" +
            mapId +
            "/map.json exists on the published branch."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [issueContext.mapId]);

  useEffect(() => {
    setControlPoints(readStoredControlPoints(activeProject));
    setHydratedProjectId(activeProject.id);
    setPendingHistoricPoint(undefined);
    setMode("edit");
  }, [activeProject]);

  const analysis = useMemo(
    () =>
      analyzeGeoreference(
        controlPoints,
        activeProject.historicMap.widthPx,
        activeProject.historicMap.heightPx
      ),
    [activeProject.historicMap.heightPx, activeProject.historicMap.widthPx, controlPoints]
  );
  const canReviewOverlay = analysis.transform !== undefined && activeOverlayCorners !== undefined;

  useEffect(() => {
    if (hydratedProjectId === activeProject.id) {
      window.localStorage.setItem(storageKeyFor(activeProject.id), JSON.stringify(controlPoints));
    }
  }, [activeProject.id, controlPoints, hydratedProjectId]);

  function handleHistoricPick(point: HistoricPixel) {
    setMode("edit");
    setPendingHistoricPoint(point);
    setNotice(
      "Historic pixel " +
        point.x.toLocaleString() +
        ", " +
        point.y.toLocaleString() +
        " is ready. Now click its modern counterpart."
    );
  }

  function handleModernPick(location: MapCoordinate) {
    if (!pendingHistoricPoint) {
      setNotice("Choose the historical landmark first, then click its modern counterpart.");
      return;
    }

    const nextNumber = controlPoints.length + 1;
    const newPoint: GroundControlPoint = {
      id: "browser-gcp-" + Date.now(),
      label: "Candidate landmark " + nextNumber,
      kind: "other",
      historicPixel: pendingHistoricPoint,
      modernLocation: location,
      role: nextPointRole,
      confidence: "medium",
      enabled: true,
      reviewerNote: "Added in the browser demo; add a cited landmark source before approval."
    };
    setControlPoints((existing) => [...existing, newPoint]);
    setPendingHistoricPoint(undefined);
    setNotice(
      "Paired control point " +
        nextNumber +
        " added as a " +
        nextPointRole +
        " point. Review its landmark and source before approval."
    );
  }

  function toggleControlPoint(id: string) {
    setControlPoints((existing) =>
      existing.map((point) => (point.id === id ? { ...point, enabled: !point.enabled } : point))
    );
  }

  function resetCurrentProject() {
    window.localStorage.removeItem(storageKeyFor(activeProject.id));
    setControlPoints(cloneControlPoints(activeProject.controlPoints));
    setPendingHistoricPoint(undefined);
    setNotice("The saved control points for this map were cleared.");
  }

  function exportManifest() {
    const manifest = {
      schemaVersion: activeProject.schemaVersion,
      exportedAt: new Date().toISOString(),
      project: {
        ...activeProject,
        controlPoints
      },
      provisionalAnalysis: analysis
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeProject.id + "-georeference-manifest.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(
      "A local project manifest was exported. It is a draft research record, not a published warp."
    );
  }

  async function copyIssueRecord() {
    const record = formatIssueLandmarkRecord(
      activeProject,
      controlPoints,
      analysis,
      issueContext.issueNumber
    );
    try {
      await navigator.clipboard.writeText(record);
      setNotice(
        "Landmark record copied. Paste it as a comment in the linked GitHub Issue for review."
      );
    } catch {
      const blob = new Blob([record], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = activeProject.id + "-landmarks-for-issue.md";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice(
        "Clipboard access was unavailable, so an issue-ready landmark record was downloaded instead."
      );
    }
  }

  const workspaceSidebar = (
    <aside className="workspace-sidebar">
      <section className="panel workflow-panel">
        <p className="eyebrow">Human review workflow</p>
        <ol className="workflow-list">
          <li className={mode === "edit" ? "active" : ""}>Pair durable landmarks</li>
          <li className={mode === "review" ? "active" : ""}>Inspect provisional overlay</li>
          <li>Confirm sources and independent checks</li>
          <li>Publish a reproducible artifact</li>
        </ol>
      </section>

      <section className="panel add-point-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Next control point</p>
            <h2>Role before placement</h2>
          </div>
        </div>
        <label className="field-label" htmlFor="next-point-role">
          Point role
        </label>
        <select
          id="next-point-role"
          onChange={(event) => setNextPointRole(event.target.value as ControlPointRole)}
          value={nextPointRole}
        >
          <option value="fit">Fit transform</option>
          <option value="check">Independent check</option>
        </select>
        <p className="panel-note">
          Use check points only to evaluate error. They do not alter the transform.
        </p>
      </section>

      <section className="panel layers-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Reference layers</p>
            <h2>Current inputs</h2>
          </div>
        </div>
        <ul className="layer-list">
          {activeProject.referenceLayers.map((layer) => (
            <li key={layer.id}>
              <span className={"layer-dot " + layer.status} />
              <span>
                <strong>{layer.name}</strong>
                <small>
                  {layer.authority === "authoritative" ? "Authoritative" : "Reference only"}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="product-name">MAP / TIME</p>
          <h1>Historical map georeferencing workbench</h1>
          <p className="product-subtitle">
            Human-reviewed control points, provisional overlays, and evidence-aware zoning research.
          </p>
        </div>
        <div className="header-actions">
          <button
            className={mode === "edit" ? "mode-button active" : "mode-button"}
            onClick={() => setMode("edit")}
            type="button"
          >
            Side-by-side edit
          </button>
          <button
            className={mode === "review" ? "mode-button active" : "mode-button"}
            disabled={!canReviewOverlay}
            onClick={() => setMode("review")}
            type="button"
          >
            Overlay review
          </button>
        </div>
      </header>

      <p className="notice" role="status">
        {notice}
      </p>

      {issueContext.mapId ? (
        <section className="issue-context panel" aria-label="GitHub Issue workspace">
          <div>
            <p className="eyebrow">GitHub Issue workspace</p>
            <h2>
              {mapLoadState === "loading"
                ? "Loading map intake record"
                : "Map review: " + activeProject.id}
            </h2>
            <p>
              Map ID: <code>{issueContext.mapId}</code>
              {issueContext.issueNumber ? " · Issue #" + issueContext.issueNumber : ""}
            </p>
            <p className="panel-note">
              Pick landmarks here, then copy the record into the GitHub Issue. The Pages picker
              never stores a GitHub token or posts on your behalf. Uploaded maps use side-by-side
              review first; an overlay requires a reviewed server-side warp.
            </p>
          </div>
          <button
            className="primary-button"
            disabled={mapLoadState !== "ready" || controlPoints.length === 0}
            onClick={copyIssueRecord}
            type="button"
          >
            Copy landmark record for Issue
          </button>
        </section>
      ) : null}

      {mode === "edit" ? (
        <section className="workbench" aria-label="Side-by-side georeferencing editor">
          <HistoricMapPane
            controlPoints={controlPoints}
            map={activeProject.historicMap}
            onPick={handleHistoricPick}
            pendingPoint={pendingHistoricPoint}
          />
          <ModernMapPane
            controlPoints={controlPoints}
            historicImageUrl={activeProject.historicMap.rawImageUrl}
            onPick={handleModernPick}
            overlayCorners={activeOverlayCorners ?? demoOverlayCorners}
            overlayOpacity={overlayOpacity}
            showOverlay={false}
          />
          {workspaceSidebar}
        </section>
      ) : (
        <section className="review-workbench" aria-label="Overlay review">
          <ModernMapPane
            controlPoints={controlPoints}
            historicImageUrl={activeProject.historicMap.rawImageUrl}
            onPick={handleModernPick}
            overlayCorners={activeOverlayCorners ?? demoOverlayCorners}
            overlayOpacity={overlayOpacity}
            showOverlay={activeOverlayCorners !== undefined}
          />
          <aside className="review-sidebar">
            <section className="panel overlay-panel">
              <p className="eyebrow">Provisional overlay</p>
              <h2>Visual validation only</h2>
              <label className="field-label" htmlFor="overlay-opacity">
                Historic scan opacity: {Math.round(overlayOpacity * 100)}%
              </label>
              <input
                id="overlay-opacity"
                max="1"
                min="0.1"
                onChange={(event) => setOverlayOpacity(Number(event.target.value))}
                step="0.05"
                type="range"
                value={overlayOpacity}
              />
              <p className="panel-note">
                This fictional sample demonstrates the review interaction. It is not a verified
                geographic overlay.
              </p>
            </section>
            <QaPanel analysis={analysis} />
            {workspaceSidebar}
          </aside>
        </section>
      )}

      <section className="lower-panels">
        <ControlPointTable
          controlPoints={controlPoints}
          onToggle={toggleControlPoint}
          residualMetersByPointId={analysis.residualMetersByPointId}
        />
        <QaPanel analysis={analysis} />
        <ResearchFinding
          evidence={activeProject.zoningEvidence}
          finding={activeProject.sampleFinding}
        />
      </section>

      <footer className="app-footer">
        <p>
          Demo fixture only. Historic zoning findings require the ordinance text, adopted zoning
          map, temporal jurisdiction boundary, source citations, and human review.
        </p>
        <div>
          <button className="text-button" onClick={resetCurrentProject} type="button">
            Clear saved points
          </button>
          {issueContext.mapId ? (
            <button className="text-button" onClick={copyIssueRecord} type="button">
              Copy landmark record
            </button>
          ) : null}
          <button className="primary-button" onClick={exportManifest} type="button">
            Export draft manifest
          </button>
        </div>
      </footer>
    </main>
  );
}

function storageKeyFor(projectId: string): string {
  return "map-georeference-pipeline.control-points.v1." + projectId;
}

function readStoredControlPoints(project: GeoreferenceProject): GroundControlPoint[] {
  try {
    const stored = window.localStorage.getItem(storageKeyFor(project.id));
    if (!stored) {
      return cloneControlPoints(project.controlPoints);
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? (parsed as GroundControlPoint[])
      : cloneControlPoints(project.controlPoints);
  } catch {
    return cloneControlPoints(project.controlPoints);
  }
}

function cloneControlPoints(controlPoints: GroundControlPoint[]): GroundControlPoint[] {
  return controlPoints.map((controlPoint) => ({
    ...controlPoint,
    historicPixel: { ...controlPoint.historicPixel },
    modernLocation: { ...controlPoint.modernLocation }
  }));
}

function formatIssueLandmarkRecord(
  project: GeoreferenceProject,
  controlPoints: GroundControlPoint[],
  analysis: ReturnType<typeof analyzeGeoreference>,
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

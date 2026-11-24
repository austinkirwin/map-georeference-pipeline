import { useEffect, useMemo, useState } from "react";
import { ControlPointTable } from "./components/ControlPointTable";
import { HistoricMapPane, type HistoricMapInteractionMode } from "./components/HistoricMapPane";
import { LandmarkSuggestions } from "./components/LandmarkSuggestions";
import { ModernMapPane } from "./components/ModernMapPane";
import { PrivateReviewLauncher } from "./components/PrivateReviewLauncher";
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
  localMapIdFromFileName,
  mapManifestUrl,
  parseMapIntake,
  projectFromLocalReview,
  projectFromMapIntake
} from "./lib/mapIntake";

type WorkspaceMode = "edit" | "review";
type OverlayCorners = typeof demoOverlayCorners | undefined;

export default function App() {
  const initialIssueContext = useMemo(() => getIssueContext(window.location.search), []);
  const [mode, setMode] = useState<WorkspaceMode>("edit");
  const [activeProject, setActiveProject] = useState<GeoreferenceProject>(demoProject);
  const [activeOverlayCorners, setActiveOverlayCorners] =
    useState<OverlayCorners>(demoOverlayCorners);
  const [requestedMapId, setRequestedMapId] = useState(initialIssueContext.mapId);
  const [activeIssueNumber, setActiveIssueNumber] = useState(initialIssueContext.issueNumber);
  const [localReviewActive, setLocalReviewActive] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string>();
  const [showLauncher, setShowLauncher] = useState(!initialIssueContext.mapId);
  const [mapLoadState, setMapLoadState] = useState<"demo" | "loading" | "ready" | "error">(
    initialIssueContext.mapId ? "loading" : "demo"
  );
  const [controlPoints, setControlPoints] = useState<GroundControlPoint[]>(() =>
    readStoredControlPoints(demoProject)
  );
  const [hydratedProjectId, setHydratedProjectId] = useState(demoProject.id);
  const [pendingHistoricPoint, setPendingHistoricPoint] = useState<HistoricPixel>();
  const [nextPointRole, setNextPointRole] = useState<ControlPointRole>("fit");
  const [historicInteractionMode, setHistoricInteractionMode] =
    useState<HistoricMapInteractionMode>("place");
  const [overlayOpacity, setOverlayOpacity] = useState(0.58);
  const [notice, setNotice] = useState(
    "Choose a durable landmark on the historical scan to begin a paired control point."
  );

  useEffect(() => {
    if (!requestedMapId) {
      return undefined;
    }

    let cancelled = false;
    const mapId = requestedMapId;
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
        setLocalReviewActive(false);
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
            "/map.json exists on the deployed Pages site, or open a local review copy instead."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestedMapId]);

  useEffect(() => {
    return () => {
      if (localImageUrl) {
        URL.revokeObjectURL(localImageUrl);
      }
    };
  }, [localImageUrl]);

  useEffect(() => {
    setControlPoints(
      localReviewActive
        ? cloneControlPoints(activeProject.controlPoints)
        : readStoredControlPoints(activeProject)
    );
    setHydratedProjectId(activeProject.id);
    setPendingHistoricPoint(undefined);
    setMode("edit");
  }, [activeProject, localReviewActive]);

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
  const isDemoProject = activeProject.id === demoProject.id;
  const historicViewportAspectRatio =
    activeProject.historicMap.widthPx / activeProject.historicMap.heightPx;

  useEffect(() => {
    if (hydratedProjectId === activeProject.id && !localReviewActive) {
      window.localStorage.setItem(storageKeyFor(activeProject.id), JSON.stringify(controlPoints));
    }
  }, [activeProject.id, controlPoints, hydratedProjectId, localReviewActive]);

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

  function setHistoricMapInteractionMode(nextMode: HistoricMapInteractionMode) {
    setHistoricInteractionMode(nextMode);
    setNotice(
      nextMode === "place"
        ? "Historic map point placement is enabled. Scroll to zoom, then click a landmark."
        : "Historic map navigation is enabled. Scroll to zoom, then drag or use the arrow keys to move around the scan."
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

  function handleOpenRepositoryMap(input: { mapId: string; issueNumber?: number }) {
    setLocalImageUrl(undefined);
    setRequestedMapId(input.mapId);
    setActiveIssueNumber(input.issueNumber);
    setLocalReviewActive(false);
    setMapLoadState("loading");
    setShowLauncher(false);
    updateReviewLocation(input.mapId, input.issueNumber);
  }

  async function handleOpenLocalReview(input: { file: File; issueNumber?: number }) {
    const imageUrl = URL.createObjectURL(input.file);
    setNotice("Preparing the private local review copy in this browser session.");
    try {
      const dimensions = await readImageDimensions(imageUrl);
      const project = projectFromLocalReview({
        id: localMapIdFromFileName(input.file.name),
        title: input.file.name,
        imageUrl,
        widthPx: dimensions.width,
        heightPx: dimensions.height,
        issueNumber: input.issueNumber
      });
      setLocalImageUrl(imageUrl);
      setRequestedMapId(undefined);
      setActiveIssueNumber(input.issueNumber);
      setLocalReviewActive(true);
      setActiveProject(project);
      setActiveOverlayCorners(undefined);
      setMapLoadState("ready");
      setShowLauncher(false);
      updateReviewLocation();
      setNotice(
        "Loaded " +
          input.file.name +
          " only in this browser session. Record source, date, and rights in the Issue before approval."
      );
    } catch {
      URL.revokeObjectURL(imageUrl);
      setNotice(
        "The selected file could not be read as an image. Convert a map page to PNG, JPEG, or WebP."
      );
    }
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
      activeIssueNumber
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

  const workspaceInformation = (
    <section className="workspace-information" aria-label="Review information">
      <details className="panel workflow-panel">
        <summary>Human review workflow</summary>
        <ol className="workflow-list">
          <li className={mode === "edit" ? "active" : ""}>Pair durable landmarks</li>
          <li className={mode === "review" ? "active" : ""}>Inspect provisional overlay</li>
          <li>Build with fit points; validate with independent checks</li>
          <li>Publish a reproducible artifact</li>
        </ol>
      </details>

      <details className="panel layers-panel">
        <summary>Reference layers</summary>
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
      </details>
      <LandmarkSuggestions mapId={activeProject.id} />
    </section>
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

      {showLauncher ? (
        <PrivateReviewLauncher
          onOpenIntake={handleOpenRepositoryMap}
          onOpenLocalReview={handleOpenLocalReview}
        />
      ) : null}

      {requestedMapId || localReviewActive ? (
        <section className="issue-context panel" aria-label="GitHub Issue workspace">
          <div>
            <p className="eyebrow">GitHub Issue workspace</p>
            <h2>
              {mapLoadState === "loading"
                ? "Loading map intake record"
                : "Map review: " + activeProject.id}
            </h2>
            <p>
              Map ID: <code>{activeProject.id}</code>
              {activeIssueNumber ? " · Issue #" + activeIssueNumber : ""}
            </p>
            <p className="panel-note">
              Pick landmarks here, then copy the record into the GitHub Issue. This GitHub Pages
              workspace never stores a GitHub token or posts on your behalf. Maps use side-by-side
              review first; an overlay requires a reviewed server-side warp.
            </p>
          </div>
          <div className="issue-context-actions">
            <button className="text-button" onClick={() => setShowLauncher(true)} type="button">
              Choose another map
            </button>
            <button
              className="primary-button"
              disabled={mapLoadState !== "ready" || controlPoints.length === 0}
              onClick={copyIssueRecord}
              type="button"
            >
              Copy landmark record for Issue
            </button>
          </div>
        </section>
      ) : null}

      {workspaceInformation}

      {mode === "edit" ? (
        <section className="workbench" aria-label="Side-by-side georeferencing editor">
          <div className="map-pair">
            <HistoricMapPane
              controlPoints={controlPoints}
              interactionMode={historicInteractionMode}
              map={activeProject.historicMap}
              nextPointRole={nextPointRole}
              onInteractionModeChange={setHistoricMapInteractionMode}
              onPick={handleHistoricPick}
              onPointRoleChange={setNextPointRole}
              pendingPoint={pendingHistoricPoint}
            />
            <ModernMapPane
              controlPoints={controlPoints}
              historicHeight={activeProject.historicMap.heightPx}
              historicImageUrl={activeProject.historicMap.rawImageUrl}
              historicTransform={analysis.transform}
              historicWidth={activeProject.historicMap.widthPx}
              initialView={activeProject.modernMapView}
              onPick={handleModernPick}
              overlayCorners={activeOverlayCorners ?? demoOverlayCorners}
              overlayOpacity={overlayOpacity}
              showOverlay={false}
              viewportAspectRatio={historicViewportAspectRatio}
            />
          </div>
        </section>
      ) : (
        <section className="review-workbench" aria-label="Overlay review">
          <ModernMapPane
            controlPoints={controlPoints}
            historicHeight={activeProject.historicMap.heightPx}
            historicImageUrl={activeProject.historicMap.rawImageUrl}
            historicTransform={analysis.transform}
            historicWidth={activeProject.historicMap.widthPx}
            initialView={activeProject.modernMapView}
            onPick={handleModernPick}
            overlayCorners={activeOverlayCorners ?? demoOverlayCorners}
            overlayOpacity={overlayOpacity}
            showOverlay={activeOverlayCorners !== undefined}
            viewportAspectRatio={historicViewportAspectRatio}
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
          {isDemoProject ? "Demo fixture only. " : "Draft research workspace. "}
          Historic zoning findings require the ordinance text, adopted zoning map, temporal
          jurisdiction boundary, source citations, and human review.
        </p>
        <div>
          <button className="text-button" onClick={resetCurrentProject} type="button">
            Clear saved points
          </button>
          {requestedMapId || localReviewActive ? (
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

function updateReviewLocation(mapId?: string, issueNumber?: number) {
  const query = new URLSearchParams(window.location.search);
  if (mapId) {
    query.set("map", mapId);
  } else {
    query.delete("map");
  }
  if (issueNumber) {
    query.set("issue", String(issueNumber));
  } else {
    query.delete("issue");
  }
  const suffix = query.toString();
  window.history.replaceState(null, "", window.location.pathname + (suffix ? "?" + suffix : ""));
}

function readImageDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Image could not be decoded."));
    image.src = imageUrl;
  });
}

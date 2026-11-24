import { useEffect, useMemo, useState } from "react";
import { ControlPointTable } from "./components/ControlPointTable";
import { HistoricMapPane, type HistoricMapInteractionMode } from "./components/HistoricMapPane";
import { LandmarkSuggestions } from "./components/LandmarkSuggestions";
import { ModernMapPane } from "./components/ModernMapPane";
import { PrivateReviewLauncher } from "./components/PrivateReviewLauncher";
import { QaPanel } from "./components/QaPanel";
import { ResearchFinding } from "./components/ResearchFinding";
import { demoProject } from "./data/demoProject";
import type {
  ControlPointRole,
  GeoreferenceProject,
  GroundControlPoint,
  HistoricPixel,
  MapCoordinate
} from "./domain/types";
import { analyzeGeoreference } from "./lib/georeference";
import { historicOverlayCorners } from "./lib/historicOverlay";
import type { HistoricOverlayStyle } from "./lib/overlayTransparency";
import {
  getIssueContext,
  localMapIdFromFileName,
  mapManifestUrl,
  parseMapIntake,
  projectFromLocalReview,
  projectFromMapIntake
} from "./lib/mapIntake";

type WorkspaceMode = "edit" | "review";
export default function App() {
  const initialIssueContext = useMemo(() => getIssueContext(window.location.search), []);
  const [mode, setMode] = useState<WorkspaceMode>("edit");
  const [activeProject, setActiveProject] = useState<GeoreferenceProject>(demoProject);
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
  const [overlayOpacity, setOverlayOpacity] = useState(0.9);
  const [overlayStyle, setOverlayStyle] = useState<HistoricOverlayStyle>("ink");
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
  const overlayCorners = useMemo(
    () =>
      historicOverlayCorners(
        analysis.transform,
        activeProject.historicMap.widthPx,
        activeProject.historicMap.heightPx
      ),
    [analysis.transform, activeProject.historicMap.widthPx, activeProject.historicMap.heightPx]
  );
  const canReviewOverlay = overlayCorners !== undefined;
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

  function handleDonePicking() {
    if (mapLoadState === "loading" || mapLoadState === "error") {
      setNotice("Open a map successfully before reviewing its overlay.");
      return;
    }
    if (pendingHistoricPoint) {
      setNotice(
        "Complete the pending historic and modern landmark pair before reviewing the overlay."
      );
      return;
    }
    if (!canReviewOverlay) {
      setNotice(
        "A usable fit is needed for the overlay. Check that at least three enabled fit points are non-collinear and have valid modern locations."
      );
      return;
    }
    setMode("review");
    setNotice(
      "Opening the provisional overlay. Review fit and independent check residuals before approving the landmarks."
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
            onClick={handleDonePicking}
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
              workspace never stores a GitHub token or posts on your behalf. The overlay is a
              provisional browser preview, not an approved georeferenced artifact.
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
          <div className="edit-workspace">
            <div className="map-pair">
              <HistoricMapPane
                controlPoints={controlPoints}
                interactionMode={historicInteractionMode}
                map={activeProject.historicMap}
                nextPointRole={nextPointRole}
                onClearPoints={resetCurrentProject}
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
                overlayCorners={overlayCorners}
                overlayOpacity={overlayOpacity}
                overlayStyle={overlayStyle}
                showOverlay={false}
                viewportAspectRatio={historicViewportAspectRatio}
              />
            </div>
            <aside className="edit-sidebar" aria-label="Control points and quality assurance">
              <ControlPointTable
                controlPoints={controlPoints}
                onToggle={toggleControlPoint}
                residualMetersByPointId={analysis.residualMetersByPointId}
              />
              <QaPanel analysis={analysis} />
            </aside>
          </div>
          <div className="review-action">
            <p>
              When your landmark pairs look reasonable, select Done to inspect a provisional
              overlay. Use at least three well-distributed, non-collinear fit points and separate
              check points.
            </p>
            <button className="primary-button" onClick={handleDonePicking} type="button">
              Done — review overlay
            </button>
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
            overlayCorners={overlayCorners}
            overlayOpacity={overlayOpacity}
            overlayStyle={overlayStyle}
            showOverlay={true}
            viewportAspectRatio={historicViewportAspectRatio}
          />
          <aside className="review-sidebar">
            <section className="panel overlay-panel">
              <p className="eyebrow">Provisional overlay</p>
              <h2>Visual validation only</h2>
              <label className="field-label" htmlFor="overlay-style">
                Historic map display
              </label>
              <select
                id="overlay-style"
                onChange={(event) => setOverlayStyle(event.target.value as HistoricOverlayStyle)}
                value={overlayStyle}
              >
                <option value="ink">Transparent light background</option>
                <option value="original">Original translucent scan</option>
              </select>
              <p className="panel-note">
                {overlayStyle === "ink"
                  ? "Light areas, including pale colors, become transparent. Switch to the original scan to inspect all source details."
                  : "The complete historic image is shown with adjustable transparency."}
              </p>
              <label className="field-label" htmlFor="overlay-opacity">
                Historic layer opacity: {Math.round(overlayOpacity * 100)}%
              </label>
              <input
                id="overlay-opacity"
                max="1"
                min="0"
                onChange={(event) => setOverlayOpacity(Number(event.target.value))}
                step="0.05"
                type="range"
                value={overlayOpacity}
              />
              <p className="panel-note">
                {isDemoProject ? "Fictional demonstration. " : "Draft preview. "}Check the landmark
                pairs, independent check residuals, and fit coverage before accepting the alignment.
                Select Side-by-side edit to revise points. This does not approve points or close the
                Issue.
              </p>
              {!canReviewOverlay ? (
                <p className="overlay-unavailable" role="alert">
                  No overlay is available for the current points. Enable or add at least three
                  non-collinear fit points with valid modern locations.
                </p>
              ) : null}
              <button
                className="text-button edit-points-button"
                onClick={() => setMode("edit")}
                type="button"
              >
                Edit landmark pairs
              </button>
            </section>
            <QaPanel analysis={analysis} />
          </aside>
        </section>
      )}

      <section className={mode === "edit" ? "lower-panels edit-lower-panels" : "lower-panels"}>
        {mode === "review" ? (
          <ControlPointTable
            controlPoints={controlPoints}
            onToggle={toggleControlPoint}
            residualMetersByPointId={analysis.residualMetersByPointId}
          />
        ) : null}
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

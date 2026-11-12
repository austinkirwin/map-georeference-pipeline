import { useEffect, useMemo, useState } from "react";
import { ControlPointTable } from "./components/ControlPointTable";
import { HistoricMapPane } from "./components/HistoricMapPane";
import { ModernMapPane } from "./components/ModernMapPane";
import { QaPanel } from "./components/QaPanel";
import { ResearchFinding } from "./components/ResearchFinding";
import { createDemoControlPoints, demoOverlayCorners, demoProject } from "./data/demoProject";
import type {
  ControlPointRole,
  GroundControlPoint,
  HistoricPixel,
  MapCoordinate
} from "./domain/types";
import { analyzeGeoreference } from "./lib/georeference";

type WorkspaceMode = "edit" | "review";

const storageKey = "map-georeference-pipeline.control-points.v1";

export default function App() {
  const [mode, setMode] = useState<WorkspaceMode>("edit");
  const [controlPoints, setControlPoints] = useState<GroundControlPoint[]>(readStoredControlPoints);
  const [pendingHistoricPoint, setPendingHistoricPoint] = useState<HistoricPixel>();
  const [nextPointRole, setNextPointRole] = useState<ControlPointRole>("fit");
  const [overlayOpacity, setOverlayOpacity] = useState(0.58);
  const [notice, setNotice] = useState(
    "Choose a durable landmark on the historical scan to begin a paired control point."
  );

  const analysis = useMemo(
    () =>
      analyzeGeoreference(
        controlPoints,
        demoProject.historicMap.widthPx,
        demoProject.historicMap.heightPx
      ),
    [controlPoints]
  );

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(controlPoints));
  }, [controlPoints]);

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

  function resetDemo() {
    window.localStorage.removeItem(storageKey);
    setControlPoints(createDemoControlPoints());
    setPendingHistoricPoint(undefined);
    setNotice("The fictional demonstration control points were restored.");
  }

  function exportManifest() {
    const manifest = {
      schemaVersion: demoProject.schemaVersion,
      exportedAt: new Date().toISOString(),
      project: {
        ...demoProject,
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
    link.download = "riverton-1930-georeference-manifest.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(
      "A local project manifest was exported. It is a draft research record, not a published warp."
    );
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
          {demoProject.referenceLayers.map((layer) => (
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
            disabled={!analysis.transform}
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

      {mode === "edit" ? (
        <section className="workbench" aria-label="Side-by-side georeferencing editor">
          <HistoricMapPane
            controlPoints={controlPoints}
            map={demoProject.historicMap}
            onPick={handleHistoricPick}
            pendingPoint={pendingHistoricPoint}
          />
          <ModernMapPane
            controlPoints={controlPoints}
            historicImageUrl={demoProject.historicMap.rawImageUrl}
            onPick={handleModernPick}
            overlayCorners={demoOverlayCorners}
            overlayOpacity={overlayOpacity}
            showOverlay={false}
          />
          {workspaceSidebar}
        </section>
      ) : (
        <section className="review-workbench" aria-label="Overlay review">
          <ModernMapPane
            controlPoints={controlPoints}
            historicImageUrl={demoProject.historicMap.rawImageUrl}
            onPick={handleModernPick}
            overlayCorners={demoOverlayCorners}
            overlayOpacity={overlayOpacity}
            showOverlay
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
          evidence={demoProject.zoningEvidence}
          finding={demoProject.sampleFinding}
        />
      </section>

      <footer className="app-footer">
        <p>
          Demo fixture only. Historic zoning findings require the ordinance text, adopted zoning
          map, temporal jurisdiction boundary, source citations, and human review.
        </p>
        <div>
          <button className="text-button" onClick={resetDemo} type="button">
            Restore demo
          </button>
          <button className="primary-button" onClick={exportManifest} type="button">
            Export draft manifest
          </button>
        </div>
      </footer>
    </main>
  );
}

function readStoredControlPoints(): GroundControlPoint[] {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return createDemoControlPoints();
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as GroundControlPoint[]) : createDemoControlPoints();
  } catch {
    return createDemoControlPoints();
  }
}

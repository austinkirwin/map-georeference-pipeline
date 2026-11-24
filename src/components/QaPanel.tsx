import type { GeoreferenceAnalysis } from "../lib/georeference";

interface QaPanelProps {
  analysis: GeoreferenceAnalysis;
}

export function QaPanel({ analysis }: QaPanelProps) {
  return (
    <section className="panel qa-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Quality assurance</p>
          <h2>Transform review</h2>
        </div>
        <span className={"quality-badge " + analysis.coverage}>{analysis.coverage}</span>
      </div>
      <dl className="metric-list">
        <div>
          <dt>Method</dt>
          <dd>{analysis.transform ? "Affine" : "Not fitted"}</dd>
        </div>
        <div>
          <dt>Fit RMSE</dt>
          <dd>{formatMeters(analysis.fitRmseMeters)}</dd>
        </div>
        <div>
          <dt>Check RMSE</dt>
          <dd>{formatMeters(analysis.checkRmseMeters)}</dd>
        </div>
        <div>
          <dt>Sheet coverage</dt>
          <dd>{Math.round(analysis.coverageRatio * 100)}%</dd>
        </div>
      </dl>
      <p className="panel-note">
        Residuals use Web Mercator projected metres; they are not ground-distance measurements.
      </p>
      {analysis.warnings.length > 0 ? (
        <ul className="warning-list">
          {analysis.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : (
        <p className="success-note">
          Basic fit checks passed. A human reviewer still needs to validate landmarks and sources.
        </p>
      )}
    </section>
  );
}

function formatMeters(value: number | undefined): string {
  return value === undefined ? "—" : value.toFixed(value < 10 ? 1 : 0) + " m";
}

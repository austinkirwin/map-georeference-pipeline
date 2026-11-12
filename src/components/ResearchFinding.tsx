import type { HistoricalZoningFinding, ZoningEvidence } from "../domain/types";

interface ResearchFindingProps {
  finding: HistoricalZoningFinding;
  evidence: ZoningEvidence[];
}

export function ResearchFinding({ finding, evidence }: ResearchFindingProps) {
  return (
    <section className="panel finding-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Temporal zoning research</p>
          <h2>Evidence, not an answer generator</h2>
        </div>
        <span className="status-badge">{finding.result.replaceAll("_", " ")}</span>
      </div>
      <p>
        <strong>{finding.address}</strong>
        <br />
        Query date: {finding.queryDate}
      </p>
      <p>{finding.explanation}</p>
      <ul className="evidence-list">
        {evidence.map((item) => (
          <li key={item.id}>
            <strong>{item.districtCode}</strong> · {item.ordinanceTitle}
            <small>{item.source.locator}</small>
          </li>
        ))}
      </ul>
      <p className="legal-note">{finding.disclaimer}</p>
    </section>
  );
}

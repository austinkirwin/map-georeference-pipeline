import type { GroundControlPoint } from "../domain/types";

interface ControlPointTableProps {
  controlPoints: GroundControlPoint[];
  residualMetersByPointId: Record<string, number>;
  onToggle: (id: string) => void;
}

export function ControlPointTable({
  controlPoints,
  residualMetersByPointId,
  onToggle
}: ControlPointTableProps) {
  return (
    <section className="panel control-points-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Control points</p>
          <h2>Fit and check points</h2>
        </div>
        <span>{controlPoints.filter((point) => point.enabled).length} active</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Use</th>
              <th scope="col">Landmark</th>
              <th scope="col">Role</th>
              <th scope="col">Residual</th>
            </tr>
          </thead>
          <tbody>
            {controlPoints.map((point) => (
              <tr key={point.id}>
                <td>
                  <input
                    aria-label={"Use " + point.label}
                    checked={point.enabled}
                    onChange={() => onToggle(point.id)}
                    type="checkbox"
                  />
                </td>
                <td>
                  <strong>{point.label}</strong>
                  <small>{point.kind.replaceAll("_", " ")}</small>
                </td>
                <td>
                  <span className={"role-pill " + point.role}>{point.role}</span>
                </td>
                <td>{formatMeters(residualMetersByPointId[point.id])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="panel-note">
        Check points remain outside the fit and provide independent error evidence.
      </p>
    </section>
  );
}

function formatMeters(value: number | undefined): string {
  return value === undefined ? "—" : value.toFixed(value < 10 ? 1 : 0) + " m";
}

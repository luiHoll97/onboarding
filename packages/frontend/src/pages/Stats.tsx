import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";

const STATS_QUERY = gql`
  query Stats($filters: StatsFiltersInput) {
    stats(filters: $filters) {
      byStatus {
        status
        count
      }
      total
    }
  }
`;

type DriverStatus = "PENDING" | "APPROVED" | "REJECTED";

type Data = {
  stats: {
    byStatus: Array<{ status: DriverStatus; count: number }>;
    total: number;
  };
};

const labels: Record<DriverStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const colors: Record<DriverStatus, string> = {
  PENDING: "#d97706",
  APPROVED: "#059669",
  REJECTED: "#dc2626",
};

type Segment = {
  status: DriverStatus;
  count: number;
  percentage: number;
  path: string;
};

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function arcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function buildPieSegments(items: Array<{ status: DriverStatus; count: number }>, total: number): Segment[] {
  if (total <= 0) {
    return [];
  }

  const nonZero = items.filter((item) => item.count > 0);
  let currentAngle = 0;

  return nonZero.map((item) => {
    const percentage = (item.count / total) * 100;
    const sweep = (item.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;

    return {
      status: item.status,
      count: item.count,
      percentage,
      path: arcPath(100, 100, 90, startAngle, endAngle),
    };
  });
}

export function Stats() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | DriverStatus>("ALL");
  const [search, setSearch] = useState("");

  const filters = useMemo(() => {
    const out: { status?: DriverStatus; search?: string } = {};
    if (statusFilter !== "ALL") {
      out.status = statusFilter;
    }
    if (search.trim()) {
      out.search = search.trim();
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }, [statusFilter, search]);

  const { data, loading, error } = useQuery<Data>(STATS_QUERY, {
    variables: { filters },
  });

  if (loading) return <div className="loading">Loading stats...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  const stats = data?.stats ?? { byStatus: [], total: 0 };
  const byStatus = stats.byStatus;
  const total = stats.total;
  const segments = buildPieSegments(byStatus, total);

  return (
    <>
      <div className="page-header">
        <h1>Stats</h1>
        <p>Applications by status with filterable chart inputs.</p>
      </div>

      <div className="filters">
        <select
          value={statusFilter}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (value === "ALL" || value === "PENDING" || value === "APPROVED" || value === "REJECTED") {
              setStatusFilter(value);
            }
          }}
          aria-label="Filter chart by status"
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <input
          type="search"
          placeholder="Search scope for chart..."
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          aria-label="Search scope"
        />
      </div>

      <div className="stats-layout">
        <div className="pie-card">
          <svg viewBox="0 0 200 200" role="img" aria-label="Pie chart of applications by status">
            {segments.length === 0 ? (
              <circle cx="100" cy="100" r="90" fill="#e5e7eb" />
            ) : (
              segments.map((segment) => (
                <path
                  key={segment.status}
                  d={segment.path}
                  fill={colors[segment.status]}
                  stroke="#fff"
                  strokeWidth="1"
                />
              ))
            )}
            <circle cx="100" cy="100" r="44" fill="#ffffff" />
            <text x="100" y="96" textAnchor="middle" className="pie-total-number">
              {total}
            </text>
            <text x="100" y="113" textAnchor="middle" className="pie-total-label">
              Total
            </text>
          </svg>

          <ul className="pie-legend">
            {byStatus.map((item) => {
              const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
              return (
                <li key={item.status}>
                  <span className="dot" style={{ backgroundColor: colors[item.status] }} />
                  <span>{labels[item.status]}</span>
                  <strong>{item.count}</strong>
                  <span>{percentage}%</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="value">{total}</div>
            <div className="label">Total applications</div>
          </div>
          {byStatus.map((item) => (
            <div key={item.status} className="stat-card">
              <div className="value">{item.count}</div>
              <div className="label">{labels[item.status]}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

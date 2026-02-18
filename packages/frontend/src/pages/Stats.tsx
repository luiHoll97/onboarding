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

  if (loading) return <div className="py-8 text-center text-slate-500">Loading stats...</div>;
  if (error) return <div className="py-8 text-center text-red-700">Error: {error.message}</div>;

  const stats = data?.stats ?? { byStatus: [], total: 0 };
  const byStatus = stats.byStatus;
  const total = stats.total;
  const segments = buildPieSegments(byStatus, total);

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Stats</h1>
        <p className="text-sm text-slate-500">Applications by status with filterable chart inputs.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (value === "ALL" || value === "PENDING" || value === "APPROVED" || value === "REJECTED") {
              setStatusFilter(value);
            }
          }}
          aria-label="Filter chart by status"
          className="min-w-44 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
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
          className="min-w-60 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
            <text x="100" y="96" textAnchor="middle" className="fill-slate-900 text-[1.1rem] font-bold">
              {total}
            </text>
            <text x="100" y="113" textAnchor="middle" className="fill-slate-500 text-xs">
              Total
            </text>
          </svg>

          <ul className="mt-3 grid gap-2">
            {byStatus.map((item) => {
              const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
              return (
                <li key={item.status} className="grid grid-cols-[12px_1fr_auto_auto] items-center gap-2 text-sm text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[item.status] }} />
                  <span>{labels[item.status]}</span>
                  <strong>{item.count}</strong>
                  <span>{percentage}%</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-3xl font-bold text-slate-900">{total}</div>
            <div className="mt-1 text-sm text-slate-500">Total applications</div>
          </div>
          {byStatus.map((item) => (
            <div key={item.status} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-3xl font-bold text-slate-900">{item.count}</div>
              <div className="mt-1 text-sm text-slate-500">{labels[item.status]}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  DRIVER_STATUS_VALUES,
  driverStatusLabels,
  type DriverStatus,
} from "../driverStatus.ts";

const STATS_QUERY = gql`
  query DashboardStats {
    stats {
      byStatus {
        status
        count
      }
      total
    }
  }
`;

type Data = {
  stats: {
    byStatus: Array<{ status: DriverStatus; count: number }>;
    total: number;
  };
};

const chartColors: Record<DriverStatus, string> = {
  ADDITIONAL_DETAILS_SENT: "#d97706",
  ADDITIONAL_DETAILS_COMPLETED: "#10b981",
  INTERNAL_DETAILS_SENT: "#0ea5e9",
  INTERNAL_DETAILS_COMPLETED: "#2563eb",
  AWAITING_INDUCTION: "#8b5cf6",
  WITHDRAWN: "#64748b",
  REJECTED: "#dc2626",
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

export function Dashboard() {
  const { data, loading, error } = useQuery<Data>(STATS_QUERY);
  if (loading) return <div className="py-8 text-center text-slate-500">Loading dashboard…</div>;
  if (error) return <div className="py-8 text-center text-red-700">Error: {error.message}</div>;

  const stats = data?.stats ?? { byStatus: [], total: 0 };
  const byStatus = DRIVER_STATUS_VALUES.map((status) => ({
    status,
    count: stats.byStatus.find((item) => item.status === status)?.count ?? 0,
  }));
  const total = stats.total;
  const inProcess =
    total -
    (byStatus.find((item) => item.status === "WITHDRAWN")?.count ?? 0) -
    (byStatus.find((item) => item.status === "REJECTED")?.count ?? 0);

  let currentAngle = 0;
  const segments = byStatus
    .filter((item) => item.count > 0)
    .map((item) => {
      const sweep = total > 0 ? (item.count / total) * 360 : 0;
      const path = arcPath(100, 100, 90, currentAngle, currentAngle + sweep);
      currentAngle += sweep;
      return { ...item, path };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of onboarding pipeline health.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{total}</div>
          <div className="mt-1 text-sm text-slate-500">Total drivers</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">{Math.max(0, inProcess)}</div>
          <div className="mt-1 text-sm text-slate-500">Drivers in process</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold text-slate-900">
            {byStatus.find((item) => item.status === "AWAITING_INDUCTION")?.count ?? 0}
          </div>
          <div className="mt-1 text-sm text-slate-500">Awaiting induction</div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <svg viewBox="0 0 200 200" role="img" aria-label="Drivers by status">
            {segments.length === 0 ? (
              <circle cx="100" cy="100" r="90" fill="#e5e7eb" />
            ) : (
              segments.map((segment) => (
                <path
                  key={segment.status}
                  d={segment.path}
                  fill={chartColors[segment.status]}
                  stroke="#fff"
                  strokeWidth="1"
                />
              ))
            )}
            <circle cx="100" cy="100" r="44" fill="#fff" />
            <text x="100" y="96" textAnchor="middle" className="fill-slate-900 text-[1.1rem] font-bold">
              {total}
            </text>
            <text x="100" y="113" textAnchor="middle" className="fill-slate-500 text-xs">
              Total
            </text>
          </svg>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">By Status</h2>
          <ul className="grid gap-2">
            {byStatus.map((item) => (
              <li key={item.status} className="grid grid-cols-[14px_1fr_auto] items-center gap-2 text-sm text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[item.status] }} />
                <span>{driverStatusLabels[item.status]}</span>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

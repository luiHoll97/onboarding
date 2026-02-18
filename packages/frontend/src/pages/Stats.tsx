import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  DRIVER_STATUS_VALUES,
  driverStatusLabels,
  isDriverStatus,
  type DriverStatus,
} from "../driverStatus.ts";

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

type Data = {
  stats: {
    byStatus: Array<{ status: DriverStatus; count: number }>;
    total: number;
  };
};

export function Stats() {
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "ALL">("ALL");
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
  const byStatus = DRIVER_STATUS_VALUES.map((status) => ({
    status,
    count: stats.byStatus.find((item) => item.status === status)?.count ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Stats</h1>
        <p className="text-sm text-slate-500">Filterable breakdown by onboarding status.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (value === "ALL") {
              setStatusFilter("ALL");
              return;
            }
            if (isDriverStatus(value)) {
              setStatusFilter(value);
            }
          }}
          className="min-w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        >
          <option value="ALL">All statuses</option>
          {DRIVER_STATUS_VALUES.map((status) => (
            <option key={status} value={status}>
              {driverStatusLabels[status]}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search scope..."
          className="min-w-72 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-slate-800">Total: {stats.total}</div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {byStatus.map((item) => (
            <li key={item.status} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-700">{driverStatusLabels[item.status]}</span>
              <strong className="float-right text-slate-900">{item.count}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

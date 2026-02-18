import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useNavigate } from "react-router-dom";

const DRIVERS_BY_FILTERS = gql`
  query DriversByFilters($filters: DriverFiltersInput, $pageSize: Int, $pageToken: String) {
    driversByFilters(filters: $filters, pageSize: $pageSize, pageToken: $pageToken) {
      drivers {
        id
        name
        email
        phone
        status
        appliedAt
      }
      nextPageToken
    }
  }
`;

type Driver = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  appliedAt?: string | null;
};
type Data = {
  driversByFilters: { drivers: Driver[]; nextPageToken?: string | null };
};

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return s;
  }
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "APPROVED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "REJECTED"
        ? "bg-rose-100 text-rose-800"
        : "bg-amber-100 text-amber-800";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

export function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filters = useMemo(() => {
    const f: { status?: string; search?: string } = {};
    if (statusFilter) f.status = statusFilter;
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [statusFilter, search]);

  const { data, loading, error } = useQuery<Data>(DRIVERS_BY_FILTERS, {
    variables: { filters, pageSize: 50 },
  });

  if (loading) return <div className="py-8 text-center text-slate-500">Loading drivers…</div>;
  if (error) return <div className="py-8 text-center text-red-700">Error: {error.message}</div>;

  const drivers = data?.driversByFilters?.drivers ?? [];

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Drivers in application. Filter and open a row to view details.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="min-w-44 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search drivers"
          className="min-w-60 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Name
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Phone
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Applied
              </th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr
                key={d.id}
                onClick={() => navigate(`/driver/${d.id}`)}
                role="button"
                tabIndex={0}
                className="cursor-pointer transition hover:bg-slate-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/driver/${d.id}`);
                  }
                }}
              >
                <td className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{d.name}</td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">{d.email}</td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">{d.phone ?? "—"}</td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <StatusBadge status={d.status} />
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">{formatDate(d.appliedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drivers.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No drivers match the current filters.</p>
      )}
    </>
  );
}

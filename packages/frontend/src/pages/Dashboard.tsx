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
  const c =
    status === "APPROVED"
      ? "status-approved"
      : status === "REJECTED"
        ? "status-rejected"
        : "status-pending";
  return <span className={`status-badge ${c}`}>{status}</span>;
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

  if (loading) return <div className="loading">Loading drivers…</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  const drivers = data?.driversByFilters?.drivers ?? [];

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Drivers in application. Filter and open a row to view details.</p>
      </div>

      <div className="filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
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
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Applied</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr
                key={d.id}
                onClick={() => navigate(`/driver/${d.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/driver/${d.id}`);
                  }
                }}
              >
                <td><strong>{d.name}</strong></td>
                <td>{d.email}</td>
                <td>{d.phone ?? "—"}</td>
                <td><StatusBadge status={d.status} /></td>
                <td>{formatDate(d.appliedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {drivers.length === 0 && (
        <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
          No drivers match the current filters.
        </p>
      )}
    </>
  );
}

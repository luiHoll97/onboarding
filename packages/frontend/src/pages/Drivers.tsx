import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import {
  DRIVER_STATUS_VALUES,
  driverStatusColors,
  driverStatusLabels,
  isDriverStatus,
  type DriverStatus,
} from "../driverStatus.ts";

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

const CREATE_DRIVER_MUTATION = gql`
  mutation CreateDriver($input: CreateDriverInput!) {
    createDriver(input: $input) {
      id
      name
    }
  }
`;

type Driver = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: DriverStatus;
  appliedAt?: string | null;
};

type Data = {
  driversByFilters: { drivers: Driver[]; nextPageToken?: string | null };
};

type CreateDriverData = {
  createDriver: {
    id: string;
    name: string;
  } | null;
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

function StatusBadge({ status }: { status: DriverStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${driverStatusColors[status]}`}>
      {driverStatusLabels[status]}
    </span>
  );
}

type AppliedFilters = {
  status: DriverStatus | "";
  search: string;
};

export function Drivers() {
  const navigate = useNavigate();
  const [statusDraft, setStatusDraft] = useState<DriverStatus | "">("");
  const [searchDraft, setSearchDraft] = useState("");
  const [applied, setApplied] = useState<AppliedFilters>({ status: "", search: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [createError, setCreateError] = useState("");

  const filters = useMemo(() => {
    const out: { status?: DriverStatus; search?: string } = {};
    if (applied.status) {
      out.status = applied.status;
    }
    if (applied.search.trim()) {
      out.search = applied.search.trim();
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }, [applied]);

  const { data, loading, error, refetch } = useQuery<Data>(DRIVERS_BY_FILTERS, {
    variables: { filters, pageSize: 100 },
  });

  const [createDriver, createState] = useMutation<CreateDriverData>(CREATE_DRIVER_MUTATION);

  function applyFilters() {
    setApplied({ status: statusDraft, search: searchDraft });
  }

  function clearFilters() {
    setStatusDraft("");
    setSearchDraft("");
    setApplied({ status: "", search: "" });
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applyFilters();
    }
  }

  async function onCreateDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    const result = await createDriver({
      variables: {
        input: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          status: "ADDITIONAL_DETAILS_SENT",
          notes: null,
        },
      },
    });
    const created = result.data?.createDriver;
    if (!created) {
      setCreateError("Failed to create driver");
      return;
    }
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setShowCreate(false);
    await refetch();
    navigate(`/driver/${created.id}`);
  }

  if (loading) return <div className="py-8 text-center text-slate-500">Loading drivers…</div>;
  if (error) return <div className="py-8 text-center text-red-700">Error: {error.message}</div>;

  const drivers = data?.driversByFilters?.drivers ?? [];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-slate-900">Drivers</h1>
          <p className="text-sm text-slate-500">Filter, review and open driver profiles.</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => setShowCreate((current) => !current)}
        >
          {showCreate ? "Close" : "Add Driver"}
        </button>
      </div>

      {showCreate ? (
        <form className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={onCreateDriver}>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Create Driver</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              placeholder="First name"
              value={firstName}
              onChange={(event) => setFirstName(event.currentTarget.value)}
              required
            />
            <input
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              placeholder="Last name"
              value={lastName}
              onChange={(event) => setLastName(event.currentTarget.value)}
              required
            />
            <input
              type="email"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
            <input
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(event) => setPhone(event.currentTarget.value)}
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={createState.loading}
            >
              {createState.loading ? "Creating..." : "Create Driver"}
            </button>
            {createState.error ? (
              <p className="text-sm text-red-700">{createState.error.message}</p>
            ) : null}
            {createError ? <p className="text-sm text-red-700">{createError}</p> : null}
          </div>
        </form>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={statusDraft}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setStatusDraft(value && isDriverStatus(value) ? value : "");
          }}
          aria-label="Filter by status"
          className="min-w-56 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        >
          <option value="">All statuses</option>
          {DRIVER_STATUS_VALUES.map((status) => (
            <option key={status} value={status}>
              {driverStatusLabels[status]}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search name, email, phone, NI or postcode..."
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.currentTarget.value)}
          onKeyDown={onSearchKeyDown}
          aria-label="Search drivers"
          className="min-w-72 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        />
        <button
          type="button"
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          onClick={applyFilters}
        >
          Apply Filters
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          onClick={clearFilters}
        >
          Clear
        </button>
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
            {drivers.map((driver) => (
              <tr
                key={driver.id}
                onClick={() => navigate(`/driver/${driver.id}`)}
                role="button"
                tabIndex={0}
                className="cursor-pointer transition hover:bg-slate-50"
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/driver/${driver.id}`);
                  }
                }}
              >
                <td className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
                  {driver.name}
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">{driver.email}</td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">{driver.phone ?? "—"}</td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <StatusBadge status={driver.status} />
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">{formatDate(driver.appliedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drivers.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No drivers match the selected filters.</p>
      ) : null}
    </>
  );
}

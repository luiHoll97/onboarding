import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

const ADMINS_QUERY = gql`
  query Admins {
    admins {
      id
      name
      email
      role
      permissions
      createdAt
    }
  }
`;

const CREATE_ADMIN_MUTATION = gql`
  mutation CreateAdmin($input: CreateAdminInput!) {
    createAdmin(input: $input) {
      id
    }
  }
`;

type Admin = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt: string;
};

type AdminsData = {
  admins: Admin[];
};

type CreateAdminData = {
  createAdmin: { id: string } | null;
};

type Role = "SUPER_ADMIN" | "OPERATIONS" | "RECRUITER" | "VIEWER";
type Permission =
  | "MANAGE_ADMINS"
  | "VIEW_DRIVERS"
  | "EDIT_DRIVERS"
  | "VIEW_STATS"
  | "SEND_FORMS";

const roleOptions: Role[] = ["SUPER_ADMIN", "OPERATIONS", "RECRUITER", "VIEWER"];
const permissionOptions: Permission[] = [
  "MANAGE_ADMINS",
  "VIEW_DRIVERS",
  "EDIT_DRIVERS",
  "VIEW_STATS",
  "SEND_FORMS",
];

function parseRole(value: string): Role {
  if (value === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (value === "OPERATIONS") return "OPERATIONS";
  if (value === "RECRUITER") return "RECRUITER";
  return "VIEWER";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function Staff() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<AdminsData>(ADMINS_QUERY);
  const [createAdmin, createState] = useMutation<CreateAdminData>(CREATE_ADMIN_MUTATION);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [permissions, setPermissions] = useState<Permission[]>(["VIEW_DRIVERS"]);
  const [formMessage, setFormMessage] = useState("");

  const rows = useMemo(() => data?.admins ?? [], [data]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");
    const result = await createAdmin({
      variables: {
        input: {
          name,
          email,
          password,
          role,
          permissions,
        },
      },
    });
    if (!result.data?.createAdmin?.id) {
      setFormMessage("Unable to create admin.");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setRole("VIEWER");
    setPermissions(["VIEW_DRIVERS"]);
    setFormMessage("Admin created.");
    await refetch();
  }

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Loading staff...</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-red-700">Error: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Staff</h1>
        <p className="text-sm text-slate-500">Manage admin accounts and access controls.</p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-800">Create Admin</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            placeholder="Full name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            required
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            type="password"
            placeholder="Temporary password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            value={role}
            onChange={(event) => setRole(parseRole(event.currentTarget.value))}
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-300 px-3 py-2">
            {permissionOptions.map((permission) => (
              <label key={permission} className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  onChange={(event) => {
                    const isChecked = event.currentTarget.checked;
                    setPermissions((current) =>
                      isChecked
                        ? [...current, permission]
                        : current.filter((item) => item !== permission)
                    );
                  }}
                />
                {permission}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={createState.loading}
          >
            {createState.loading ? "Creating..." : "Create Admin"}
          </button>
          {formMessage ? <p className="text-sm text-slate-600">{formMessage}</p> : null}
        </div>
      </form>

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
                Role
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Created At
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((admin) => (
              <tr
                key={admin.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => navigate(`/staff/${admin.id}`)}
              >
                <td className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
                  {admin.name}
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  {admin.email}
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  {admin.role}
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                  {formatDate(admin.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

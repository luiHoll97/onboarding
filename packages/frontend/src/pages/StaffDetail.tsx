import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const ADMIN_QUERY = gql`
  query Admin($id: ID!) {
    admin(id: $id) {
      id
      name
      email
      role
      permissions
      createdAt
    }
  }
`;

const UPDATE_ADMIN_ACCESS_MUTATION = gql`
  mutation UpdateAdminAccess($input: UpdateAdminAccessInput!) {
    updateAdminAccess(input: $input) {
      id
      role
      permissions
    }
  }
`;

const DELETE_ADMIN_MUTATION = gql`
  mutation DeleteAdmin($id: ID!) {
    deleteAdmin(id: $id)
  }
`;

type Role = "SUPER_ADMIN" | "OPERATIONS" | "RECRUITER" | "VIEWER";
type Permission =
  | "MANAGE_ADMINS"
  | "VIEW_DRIVERS"
  | "EDIT_DRIVERS"
  | "VIEW_STATS"
  | "SEND_FORMS";

type Admin = {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  createdAt: string;
};

type AdminData = {
  admin: Admin | null;
};

type UpdateAdminAccessData = {
  updateAdminAccess: {
    id: string;
    role: Role;
    permissions: Permission[];
  } | null;
};

type DeleteAdminData = {
  deleteAdmin: boolean;
};

const roleOptions: Role[] = ["SUPER_ADMIN", "OPERATIONS", "RECRUITER", "VIEWER"];
const permissionOptions: Permission[] = [
  "MANAGE_ADMINS",
  "VIEW_DRIVERS",
  "EDIT_DRIVERS",
  "VIEW_STATS",
  "SEND_FORMS",
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function parseRole(value: string): Role {
  if (value === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (value === "OPERATIONS") return "OPERATIONS";
  if (value === "RECRUITER") return "RECRUITER";
  return "VIEWER";
}

export function StaffDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<AdminData>(ADMIN_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
  });
  const [updateAdminAccess, updateState] =
    useMutation<UpdateAdminAccessData>(UPDATE_ADMIN_ACCESS_MUTATION);
  const [deleteAdmin, deleteState] = useMutation<DeleteAdminData>(DELETE_ADMIN_MUTATION);
  const [message, setMessage] = useState("");

  const admin = data?.admin;
  const [selectedRole, setSelectedRole] = useState<Role>("VIEWER");
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (!admin) {
      return;
    }
    setSelectedRole(parseRole(admin.role));
    setSelectedPermissions(admin.permissions);
  }, [admin]);

  async function onSave() {
    if (!id || !admin) {
      return;
    }
    setMessage("");
    await updateAdminAccess({
      variables: {
        input: {
          id,
          role: selectedRole,
          permissions: selectedPermissions,
        },
      },
    });
    setMessage("Permissions updated.");
    await refetch();
  }

  async function onDelete() {
    if (!id) {
      return;
    }
    setMessage("");
    const result = await deleteAdmin({ variables: { id } });
    if (result.data?.deleteAdmin) {
      navigate("/staff");
      return;
    }
    setMessage("Unable to delete admin.");
  }

  if (!id) {
    return <div className="py-8 text-center text-red-700">Missing admin ID.</div>;
  }
  if (loading) {
    return <div className="py-8 text-center text-slate-500">Loading admin...</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-red-700">Error: {error.message}</div>;
  }
  if (!admin) {
    return <div className="py-8 text-center text-red-700">Admin not found.</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          className="mb-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => navigate("/staff")}
        >
          Back to Staff
        </button>
        <h1 className="text-2xl font-semibold text-slate-900">{admin.name}</h1>
        <p className="text-sm text-slate-500">{admin.email}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 grid gap-1 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">Role:</span> {admin.role}
          </p>
          <p>
            <span className="font-semibold text-slate-800">Created:</span> {formatDate(admin.createdAt)}
          </p>
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            value={selectedRole}
            onChange={(event) => {
              setSelectedRole(parseRole(event.currentTarget.value));
            }}
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700">Permissions</label>
        <div className="mb-4 flex flex-wrap gap-3 rounded-md border border-slate-200 p-3">
          {permissionOptions.map((permission) => (
            <label key={permission} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selectedPermissions.includes(permission)}
                onChange={(event) => {
                  const nextPermissions = event.currentTarget.checked
                    ? [...selectedPermissions, permission]
                    : selectedPermissions.filter((item) => item !== permission);
                  setSelectedPermissions(nextPermissions);
                }}
              />
              {permission}
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={onSave}
            disabled={updateState.loading}
          >
            {updateState.loading ? "Saving..." : "Save Access"}
          </button>
          <button
            type="button"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            onClick={onDelete}
            disabled={deleteState.loading}
          >
            {deleteState.loading ? "Deleting..." : "Delete Admin"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>
    </div>
  );
}

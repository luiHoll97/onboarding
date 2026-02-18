import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { clearAuthToken } from "./auth.ts";
import logo from "./assets/logo2.png";

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

const ME_NAV_QUERY = gql`
  query MeNav {
    me {
      id
      permissions
    }
  }
`;

type MeNavData = {
  me: {
    id: string;
    permissions: string[];
  } | null;
};

export function Layout() {
  const navigate = useNavigate();
  const [logout] = useMutation(LOGOUT_MUTATION);
  const { data } = useQuery<MeNavData>(ME_NAV_QUERY, { fetchPolicy: "cache-first" });
  const canManageAdmins = data?.me?.permissions.includes("MANAGE_ADMINS") ?? false;

  async function onLogout() {
    try {
      await logout();
    } finally {
      clearAuthToken();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-3 flex gap-3 flex-col items-center border-b border-slate-200 pb-3 text-center">
          <img src={logo} alt="Driver Onboarding" className="h-18 w-18 object-contain" />
          <div className="flex flex-col items-center">
          <span className="text-xs font-light text-slate-500">Response Able Solutions</span>
          <span className="text-xs font-light text-slate-900">Driver Onboarding</span>
          </div>
        </div>

        <nav className="space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/stats"
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            Stats
          </NavLink>
          {canManageAdmins ? (
            <NavLink
              to="/staff"
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              Staff
            </NavLink>
          ) : null}
          <button
            type="button"
            className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            onClick={onLogout}
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

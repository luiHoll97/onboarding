import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { clearAuthToken } from "./auth.ts";
import logo from "./assets/logo.png";

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export function Layout() {
  const navigate = useNavigate();
  const [logout] = useMutation(LOGOUT_MUTATION);

  async function onLogout() {
    try {
      await logout();
    } finally {
      clearAuthToken();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="Driver Onboarding" className="sidebar-logo" />
          <span>Driver Onboarding</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
            Dashboard
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => (isActive ? "active" : undefined)}>
            Stats
          </NavLink>
          <button type="button" className="sidebar-logout" onClick={onLogout}>
            Logout
          </button>
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

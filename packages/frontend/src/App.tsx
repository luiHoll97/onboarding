import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./Layout.tsx";
import { RequireAuth } from "./RequireAuth.tsx";
import { RequirePermission } from "./RequirePermission.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { Drivers } from "./pages/Drivers.tsx";
import { DriverDetail } from "./pages/DriverDetail.tsx";
import { Stats } from "./pages/Stats.tsx";
import { Login } from "./pages/Login.tsx";
import { Staff } from "./pages/Staff.tsx";
import { StaffDetail } from "./pages/StaffDetail.tsx";
import { Webhooks } from "./pages/Webhooks.tsx";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="driver/:id" element={<DriverDetail />} />
          <Route path="stats" element={<Stats />} />
          <Route path="webhooks" element={<Webhooks />} />
          <Route
            path="staff"
            element={
              <RequirePermission permission="MANAGE_ADMINS">
                <Staff />
              </RequirePermission>
            }
          />
          <Route
            path="staff/:id"
            element={
              <RequirePermission permission="MANAGE_ADMINS">
                <StaffDetail />
              </RequirePermission>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

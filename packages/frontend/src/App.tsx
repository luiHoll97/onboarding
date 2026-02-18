import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./Layout.tsx";
import { RequireAuth } from "./RequireAuth.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { DriverDetail } from "./pages/DriverDetail.tsx";
import { Stats } from "./pages/Stats.tsx";
import { Login } from "./pages/Login.tsx";

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
          <Route path="driver/:id" element={<DriverDetail />} />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

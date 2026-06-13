import { Navigate, Route, Routes } from "react-router-dom";
import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductionPage from "@/pages/ProductionPage";
import EquipmentPage from "@/pages/EquipmentPage";
import QualityPage from "@/pages/QualityPage";
import SafetyPage from "@/pages/SafetyPage";
import AiSearchPage from "@/pages/AiSearchPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";

function Protected({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, loading, hasRole } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !hasRole("admin")) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="quality" element={<QualityPage />} />
        <Route path="safety" element={<SafetyPage />} />
        <Route path="ai" element={<AiSearchPage />} />
        <Route
          path="users"
          element={
            <Protected admin>
              <UsersPage />
            </Protected>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

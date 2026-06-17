import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PublicVenuePage from "./pages/PublicVenuePage.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminReservations from "./pages/AdminReservations.jsx";
import AdminCalendar from "./pages/AdminCalendar.jsx";
import AdminConfiguration from "./pages/AdminConfiguration.jsx";
import AdminExpenses from "./pages/AdminExpenses.jsx";
import AdminTasks from "./pages/AdminTasks.jsx";
import AdminFinance from "./pages/AdminFinance.jsx";
import AdminClients from "./pages/AdminClients.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import { useAuth } from "./auth/AuthProvider.jsx";
import { ROLES } from "./auth/permissions.js";
import { venues } from "./data/venues.js";
import AccessSplash from "./components/admin/AccessSplash.jsx";

const paraiso = venues.find((venue) => venue.slug === "paraiso-escondido");

function InternalEntryRedirect() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [canContinue, setCanContinue] = useState(false);

  if (isLoading || !canContinue) {
    return <AccessSplash isReady={!isLoading} onComplete={() => setCanContinue(true)} />;
  }

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (role === ROLES.manager) return <Navigate to="/encargado/tareas" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<InternalEntryRedirect />} />
      <Route path="/publica" element={<PublicVenuePage venue={paraiso} />} />
      <Route
        path="/quinta/paraiso-escondido"
        element={<PublicVenuePage venue={paraiso} />}
      />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.admin]} redirectTo="/encargado/tareas">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="control" element={<Navigate to="/admin" replace />} />
        <Route path="contenido" element={<Navigate to="/admin/configuracion" replace />} />
        <Route path="reservas" element={<AdminReservations />} />
        <Route path="calendario" element={<AdminCalendar />} />
        <Route path="gastos" element={<AdminExpenses />} />
        <Route path="tareas" element={<AdminTasks />} />
        <Route path="finanzas" element={<AdminFinance />} />
        <Route path="clientes" element={<AdminClients />} />
        <Route path="precios" element={<Navigate to="/admin/configuracion" replace />} />
        <Route path="configuracion" element={<AdminConfiguration />} />
      </Route>
      <Route
        path="/encargado"
        element={
          <ProtectedRoute allowedRoles={[ROLES.admin, ROLES.manager]} redirectTo="/admin">
            <AdminLayout mode="manager" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/encargado/tareas" replace />} />
        <Route path="tareas" element={<AdminTasks mode="manager" />} />
        <Route path="reservas" element={<AdminReservations mode="manager" />} />
        <Route path="calendario" element={<AdminCalendar mode="manager" />} />
        <Route path="gastos" element={<AdminExpenses mode="manager" />} />
        <Route path="*" element={<Navigate to="/encargado/tareas" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

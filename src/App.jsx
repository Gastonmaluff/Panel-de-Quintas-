import { Navigate, Route, Routes } from "react-router-dom";
import PublicVenuePage from "./pages/PublicVenuePage.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminReservations from "./pages/AdminReservations.jsx";
import AdminCalendar from "./pages/AdminCalendar.jsx";
import AdminConfiguration from "./pages/AdminConfiguration.jsx";
import AdminExpenses from "./pages/AdminExpenses.jsx";
import AdminFinance from "./pages/AdminFinance.jsx";
import AdminClients from "./pages/AdminClients.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import { ROLES } from "./auth/permissions.js";
import { venues } from "./data/venues.js";

const paraiso = venues.find((venue) => venue.slug === "paraiso-escondido");

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicVenuePage venue={paraiso} />} />
      <Route
        path="/quinta/paraiso-escondido"
        element={<PublicVenuePage venue={paraiso} />}
      />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.admin]} redirectTo="/encargado/reservas">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="contenido" element={<Navigate to="/admin/configuracion" replace />} />
        <Route path="reservas" element={<AdminReservations />} />
        <Route path="calendario" element={<AdminCalendar />} />
        <Route path="gastos" element={<AdminExpenses />} />
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
        <Route index element={<Navigate to="/encargado/reservas" replace />} />
        <Route path="reservas" element={<AdminReservations mode="manager" />} />
        <Route path="calendario" element={<AdminCalendar mode="manager" />} />
        <Route path="gastos" element={<AdminExpenses mode="manager" />} />
        <Route path="*" element={<Navigate to="/encargado/reservas" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

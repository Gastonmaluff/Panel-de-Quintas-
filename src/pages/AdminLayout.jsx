import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  LogOut,
  Settings,
  Users,
  WalletCards,
  ReceiptText,
} from "lucide-react";
import { AdminDataProvider } from "../admin/AdminDataProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import ShareAvailabilityButton from "../components/admin/ShareAvailabilityButton.jsx";
import BrandLogo from "../components/branding/BrandLogo.jsx";
import { venues } from "../data/venues.js";

const adminLinks = [
  { to: "/admin", label: "Control", icon: BarChart3, end: true },
  { to: "/admin/reservas", label: "Reservas", icon: WalletCards },
  { to: "/admin/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/admin/gastos", label: "Gastos", icon: ReceiptText },
  { to: "/admin/finanzas", label: "Finanzas", icon: BarChart3 },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
];

function AdminShell() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const venue = venues[0];

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-app admin-app--topnav">
      <header className="admin-system-header">
        <div className="admin-system-header__brand">
          <BrandLogo variant="mark" className="admin-brand__mark" />
          <div>
            <strong>Panel interno</strong>
            <span>{venue.name}</span>
          </div>
        </div>

        <nav className="admin-system-nav" aria-label="Administración principal">
          {adminLinks.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                end={link.end}
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? "is-active" : "")}
              >
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-system-header__actions">
          <ShareAvailabilityButton />
          <button type="button" onClick={handleLogout}>
            <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-session-line">Sesión activa: {user?.email}</div>
        <Outlet />
      </main>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminDataProvider>
      <AdminShell />
    </AdminDataProvider>
  );
}

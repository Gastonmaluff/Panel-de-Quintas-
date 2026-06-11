import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  LogOut,
  Users,
  WalletCards,
  ReceiptText,
} from "lucide-react";
import { AdminDataProvider } from "../admin/AdminDataProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import ShareAvailabilityButton from "../components/admin/ShareAvailabilityButton.jsx";
import BrandLogo from "../components/branding/BrandLogo.jsx";

const adminLinks = [
  { to: "/admin", label: "Control", icon: BarChart3, end: true },
  { to: "/admin/reservas", label: "Reservas", icon: WalletCards },
  { to: "/admin/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/admin/gastos", label: "Gastos", icon: ReceiptText },
  { to: "/admin/finanzas", label: "Finanzas", icon: BarChart3 },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
];

function AdminShell() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-app admin-app--topnav">
      <header className="admin-system-header">
        <div className="admin-system-header__brand">
          <BrandLogo variant="horizontal" className="admin-system-header__logo" />
        </div>

        <nav className="admin-system-nav" aria-label="Administracion principal">
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
          <ShareAvailabilityButton iconOnly />
          <button type="button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-session-line">Sesion activa: {user?.email}</div>
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

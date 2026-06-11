import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  LogOut,
  Users,
  WalletCards,
  ReceiptText,
  Settings,
} from "lucide-react";
import { AdminDataProvider, useAdminData } from "../admin/AdminDataProvider.jsx";
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
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
];

function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { logActivity } = useAdminData();
  const activeIndex = adminLinks.findIndex((link) =>
    link.end ? location.pathname === link.to : location.pathname.startsWith(link.to),
  );
  const [lastIndex, setLastIndex] = useState(activeIndex);
  const direction = activeIndex >= lastIndex ? "forward" : "back";

  const handleLogout = async () => {
    await logActivity("Usuario cerró sesión", user?.email || "Sin usuario");
    await logout();
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    setLastIndex(activeIndex);
  }, [activeIndex]);

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
        <div className={`admin-route-transition admin-route-transition--${direction}`} key={location.pathname}>
          <Outlet />
        </div>
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

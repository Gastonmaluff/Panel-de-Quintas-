import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Tag,
  WalletCards,
} from "lucide-react";
import { AdminDataProvider } from "../admin/AdminDataProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import ShareAvailabilityButton from "../components/admin/ShareAvailabilityButton.jsx";
import BrandLogo from "../components/branding/BrandLogo.jsx";
import { venues } from "../data/venues.js";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/contenido", label: "Contenido publico", icon: FileText },
  { to: "/admin/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/admin/reservas", label: "Reservas", icon: WalletCards },
  { to: "/admin/precios", label: "Precios", icon: Tag },
  { to: "/admin/configuracion", label: "Configuracion", icon: Settings },
];

function AdminShell() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const venue = venues[0];
  const publicPath = import.meta.env.BASE_URL;

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a className="admin-brand" href={publicPath}>
          <BrandLogo variant="mark" className="admin-brand__mark" />
          <span>Panel de control</span>
          <small>{venue.name}</small>
        </a>
        <nav>
          {adminLinks.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                end={link.end}
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? "is-active" : "")}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="admin-sidebar__footer">
          <a href={publicPath} target="_blank" rel="noreferrer">
            Ver pagina publica
          </a>
          <button type="button" onClick={handleLogout}>
            <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__brand">
            <p className="eyebrow">Panel administrador</p>
            <BrandLogo variant="horizontal" className="admin-topbar__logo" />
            <span>Sesion activa: {user?.email}</span>
          </div>
          <div className="admin-topbar__actions">
            <a href={publicPath} target="_blank" rel="noreferrer">
              Ver pagina publica
            </a>
            <ShareAvailabilityButton />
            <button type="button" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </div>
        </header>
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

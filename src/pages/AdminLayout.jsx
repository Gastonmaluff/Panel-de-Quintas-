import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  UserCircle,
  Users,
  WalletCards,
  ReceiptText,
  Settings,
} from "lucide-react";
import { AdminDataProvider, useAdminData } from "../admin/AdminDataProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { ROLE_LABELS } from "../auth/permissions.js";
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

const managerLinks = [
  { to: "/encargado/reservas", label: "Reservas", icon: WalletCards },
  { to: "/encargado/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/encargado/gastos", label: "Gastos", icon: ReceiptText },
];

function AdminShell({ mode = "admin" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, profile, role, user } = useAuth();
  const { logActivity } = useAdminData();
  const isManagerView = mode === "manager";
  const links = isManagerView ? managerLinks : adminLinks;
  const userMenuRef = useRef(null);
  const activeIndex = useMemo(
    () =>
      links.findIndex((link) =>
        link.end ? location.pathname === link.to : location.pathname.startsWith(link.to),
      ),
    [links, location.pathname],
  );
  const [lastIndex, setLastIndex] = useState(activeIndex);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const direction = activeIndex >= lastIndex ? "forward" : "back";
  const roleLabel = ROLE_LABELS[role] || role || "Sin rol";

  const handleLogout = async () => {
    await logActivity(
      "Usuario cerró sesión",
      `${profile?.name || user?.email || "Sin usuario"} · ${ROLE_LABELS[role] || role || "Sin rol"}`,
    );
    await logout();
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    setLastIndex(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    if (!isUserMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isUserMenuOpen]);

  return (
    <div className={`admin-app admin-app--topnav${isManagerView ? " admin-app--manager" : ""}`}>
      <header className="admin-system-header">
        <div className="admin-system-header__brand">
          <BrandLogo variant="horizontal" className="admin-system-header__logo" />
          {isManagerView ? <span className="admin-view-badge">Vista Encargado</span> : null}
        </div>

        <nav className="admin-system-nav" aria-label={isManagerView ? "Vista Encargado" : "Administración principal"}>
          {links.map((link) => {
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
          <div className="admin-user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="admin-user-menu__trigger"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              aria-label="Abrir menu de usuario"
              title="Usuario"
            >
              <UserCircle size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {isUserMenuOpen ? (
              <div className="admin-user-menu__popover" role="menu">
                <small>Sesion activa</small>
                <strong>{user?.email || "Sin usuario"}</strong>
                <span>{roleLabel}</span>
                <button type="button" onClick={handleLogout} role="menuitem">
                  Cerrar sesion
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className={`admin-route-transition admin-route-transition--${direction}`} key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ mode = "admin" }) {
  return (
    <AdminDataProvider>
      <AdminShell mode={mode} />
    </AdminDataProvider>
  );
}

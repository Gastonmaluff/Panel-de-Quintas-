import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { venues } from "../data/venues.js";

const adminLinks = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/contenido", label: "Contenido público" },
  { to: "/admin/calendario", label: "Calendario" },
  { to: "/admin/reservas", label: "Reservas" },
  { to: "/admin/precios", label: "Precios" },
  { to: "/admin/configuracion", label: "Configuración" },
];

export default function AdminLayout() {
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
          <span>QuintaFlow</span>
          <small>{venue.name}</small>
        </a>
        <nav>
          {adminLinks.map((link) => (
            <NavLink
              end={link.end}
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Panel administrador</p>
            <h1>{venue.name}</h1>
            <span>{user?.email}</span>
          </div>
          <div className="admin-topbar__actions">
            <a href={publicPath} target="_blank" rel="noreferrer">
              Ver página pública
            </a>
            <button type="button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

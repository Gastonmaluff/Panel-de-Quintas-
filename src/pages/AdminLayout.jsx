import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";

const adminLinks = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/reservas", label: "Reservas" },
  { to: "/admin/calendario", label: "Calendario" },
  { to: "/admin/precios", label: "Precios" },
  { to: "/admin/configuracion", label: "Configuración" },
];

export default function AdminLayout() {
  const homePath = import.meta.env.BASE_URL;
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authMessage, setAuthMessage] = useState("Base lista para Firebase Auth.");

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      setAuthMessage("Sesión iniciada.");
    } catch (error) {
      setAuthMessage("Firebase Auth está configurado. Creá el usuario para iniciar sesión.");
    }
  };

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a className="admin-brand" href={homePath}>
          <span>QuintaFlow</span>
          <small>Paraíso Escondido</small>
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
        <section className="admin-login">
          <div>
            <p className="eyebrow">Acceso administrador</p>
            <h1>Panel de gestión</h1>
            <span>{authMessage}</span>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={credentials.email}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, email: event.target.value }))
              }
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, password: event.target.value }))
              }
            />
            <button type="submit">Entrar</button>
          </form>
        </section>
        <Outlet />
      </main>
    </div>
  );
}

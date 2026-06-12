import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { ROLES } from "../auth/permissions.js";

export default function AdminLogin() {
  const location = useLocation();
  const { isAuthenticated, isLoading, role } = useAuth();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestedFrom = location.state?.from?.pathname || "";
  const defaultRoute = role === ROLES.manager ? "/encargado/reservas" : "/admin";
  const from =
    role === ROLES.manager && requestedFrom.startsWith("/admin")
      ? "/encargado/reservas"
      : requestedFrom || defaultRoute;

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      const id = `log-${Date.now()}`;
      await setDoc(doc(db, "activityLog", id), {
        id,
        date: new Date().toISOString(),
        user: result.user.email || credentials.email,
        action: "Usuario inició sesión",
        detail: result.user.email || credentials.email,
      });
    } catch {
      setError("No pudimos iniciar sesión. Revisá el email y la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-auth-shell">
      <form className="admin-auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Acceso administrador</p>
        <h1>Entrar al panel</h1>
        <p>
          Ingresá con el usuario autorizado para administrar reservas, precios y
          contenido público.
        </p>

        <label>
          Email
          <input
            autoComplete="email"
            type="email"
            value={credentials.email}
            onChange={(event) =>
              setCredentials((current) => ({ ...current, email: event.target.value }))
            }
            required
          />
        </label>

        <label>
          Contraseña
          <input
            autoComplete="current-password"
            type="password"
            value={credentials.password}
            onChange={(event) =>
              setCredentials((current) => ({ ...current, password: event.target.value }))
            }
            required
          />
        </label>

        {error ? <p className="admin-auth-error">{error}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

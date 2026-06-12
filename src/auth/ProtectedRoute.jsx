import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export default function ProtectedRoute({ children, allowedRoles, redirectTo }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <main className="admin-auth-shell">
        <div className="admin-auth-card">
          <p className="eyebrow">Acceso administrador</p>
          <h1>Verificando sesión</h1>
          <p>Estamos preparando el panel.</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo || "/encargado/reservas"} replace />;
  }

  return children;
}

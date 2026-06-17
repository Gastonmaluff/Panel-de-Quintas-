import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AccessSplash from "../components/admin/AccessSplash.jsx";
import { useAuth } from "./AuthProvider.jsx";

export default function ProtectedRoute({ children, allowedRoles, redirectTo }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, role } = useAuth();
  const [canContinue, setCanContinue] = useState(false);

  if (isLoading || !canContinue) {
    return <AccessSplash isReady={!isLoading} onComplete={() => setCanContinue(true)} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo || "/encargado/tareas"} replace />;
  }

  return children;
}

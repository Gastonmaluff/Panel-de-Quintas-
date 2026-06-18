import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AccessSplash from "../components/admin/AccessSplash.jsx";
import { useAuth } from "./AuthProvider.jsx";

const ACCESS_SPLASH_KEY = "paraiso-access-splash-complete";

function hasCompletedAccessSplash() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(ACCESS_SPLASH_KEY) === "true";
}

function markAccessSplashComplete() {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(ACCESS_SPLASH_KEY, "true");
  }
}

export default function ProtectedRoute({ children, allowedRoles, redirectTo }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, role } = useAuth();
  const [canContinue, setCanContinue] = useState(() => hasCompletedAccessSplash());

  if (isLoading && canContinue) {
    return null;
  }

  if (isLoading || !canContinue) {
    return (
      <AccessSplash
        isReady={!isLoading}
        onComplete={() => {
          markAccessSplashComplete();
          setCanContinue(true);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo || "/encargado/tareas"} replace />;
  }

  return children;
}

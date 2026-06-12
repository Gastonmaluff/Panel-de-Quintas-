import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, limit, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../config/firebase.js";
import { ROLES, hasPermission } from "./permissions.js";

const AuthContext = createContext(null);
const ADMIN_EMAIL_FALLBACKS = new Set(["gaston@admin.com", "admin@paraisoescondido.com"]);

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function buildFallbackProfile(firebaseUser) {
  const email = normalizeEmail(firebaseUser?.email);
  const role = ADMIN_EMAIL_FALLBACKS.has(email) ? ROLES.admin : ROLES.manager;

  return {
    uid: firebaseUser?.uid || "",
    name: firebaseUser?.displayName || firebaseUser?.email || "Usuario",
    email,
    role,
    active: true,
    isFallbackProfile: true,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsProfileLoading(false);
      return undefined;
    }

    const email = normalizeEmail(user.email);
    const fallbackProfile = buildFallbackProfile(user);
    let uidLoaded = false;
    let emailLoaded = false;
    let uidProfile = null;
    let emailProfile = null;

    setIsProfileLoading(true);

    const finishLoading = () => {
      if (!uidLoaded || !emailLoaded) return;
      setProfile(uidProfile || emailProfile || fallbackProfile);
      setIsProfileLoading(false);
    };

    const unsubscribeUid = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        uidLoaded = true;
        uidProfile = snapshot.exists()
          ? { uid: user.uid, email, ...snapshot.data() }
          : null;
        finishLoading();
      },
      () => {
        uidLoaded = true;
        finishLoading();
      },
    );
    const unsubscribeEmail = onSnapshot(
      query(collection(db, "users"), where("email", "==", email), limit(1)),
      (snapshot) => {
        emailLoaded = true;
        emailProfile = snapshot.docs[0]
          ? { uid: user.uid, id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
          : null;
        finishLoading();
      },
      () => {
        emailLoaded = true;
        finishLoading();
      },
    );

    return () => {
      unsubscribeUid();
      unsubscribeEmail();
    };
  }, [user]);

  const role = profile?.role || null;
  const isLoading = isAuthLoading || isProfileLoading || Boolean(user && !profile);

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      isAdmin: role === ROLES.admin,
      isManager: role === ROLES.manager,
      isAuthenticated: Boolean(user && profile?.active !== false),
      isLoading,
      hasPermission: (permission) => hasPermission(role, permission),
      logout: () => signOut(auth),
    }),
    [isLoading, profile, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}

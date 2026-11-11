import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const AuthContext = createContext(null);

const DEMO_USER = {
  id: "demo-local-admin",
  email: "demo@local-browser",
  isDemo: true
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(isSupabaseConfigured ? null : DEMO_USER);
  const [role, setRole] = useState(isSupabaseConfigured ? null : "admin");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;

    async function loadProfile(session) {
      if (!session?.user) {
        if (!active) return;
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;
      setUser({
        id: session.user.id,
        email: session.user.email,
        displayName: data?.display_name || session.user.email
      });
      setRole(profileError ? null : data?.role || null);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => loadProfile(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session);
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError("");
    if (!isSupabaseConfigured) {
      setUser(DEMO_USER);
      setRole("admin");
      return { ok: true, demo: true };
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      return { ok: false, message: authError.message };
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      error,
      isAuthenticated: Boolean(user),
      isStaff: role === "admin" || role === "editor",
      isAdmin: role === "admin",
      signIn,
      signOut,
      mode: isSupabaseConfigured ? "supabase" : "local"
    }),
    [user, role, loading, error, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

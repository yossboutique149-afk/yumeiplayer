import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { isSupabaseConfigured } from "../lib/supabase.js";

export default function RequireAuth({ children }) {
  const { loading, isAuthenticated, isStaff, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page page-narrow">
        <div className="panel center stack">
          <span className="spinner" aria-hidden="true" />
          <p className="muted small">Checking your studio session…</p>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !isAuthenticated) {
    return <Navigate to="/studio/login" replace state={{ from: location.pathname }} />;
  }

  if (isSupabaseConfigured && isAuthenticated && !isStaff) {
    return (
      <div className="page page-narrow">
        <div className="panel stack">
          <h2 className="row">
            <ShieldAlert size={20} /> No studio access
          </h2>
          <p className="muted small">
            Your account is signed in but has no assigned role ({role || "none"}). An
            administrator must grant you the <code className="code-inline">editor</code> or{" "}
            <code className="code-inline">admin</code> role in the{" "}
            <code className="code-inline">profiles</code> table.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

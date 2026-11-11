import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function LoginPage() {
  const { signIn, isAuthenticated, isStaff, mode, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const from = location.state?.from || "/studio";

  useEffect(() => {
    if (!loading && isAuthenticated && isStaff) {
      navigate(from, { replace: true });
    }
  }, [loading, isAuthenticated, isStaff, navigate, from]);

  async function onSubmit(event) {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result?.ok === false) {
      setFormError(result.message || "Sign-in failed.");
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <div className="page page-narrow">
      <div className="panel stack">
        <div className="row between">
          <h1 className="row">
            <Lock size={20} /> Admin studio
          </h1>
          <Link className="tiny" to="/">
            Back to the public site
          </Link>
        </div>

        <p className="muted small">
          Private area. Accounts and roles live in Supabase Auth and the{" "}
          <code className="code-inline">profiles</code> table; only an administrator can grant
          studio access.
        </p>

        {mode === "local" ? (
          <div className="notice">
            <ShieldCheck size={16} /> Supabase is not configured, so this build runs in local demo
            mode with a demo administrator. Add <code className="code-inline">VITE_SUPABASE_URL</code>{" "}
            and <code className="code-inline">VITE_SUPABASE_ANON_KEY</code> to use real
            authentication.
          </div>
        ) : (
          <form className="stack" onSubmit={onSubmit}>
            <label className="field-label">
              Email
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
              />
            </label>

            <label className="field-label">
              Password
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={event => setPassword(event.target.value)}
              />
            </label>

            {(formError || error) && <p className="form-error small">{formError || error}</p>}

            <button className="btn btn-primary" type="submit" disabled={busy}>
              <LogIn size={16} /> {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

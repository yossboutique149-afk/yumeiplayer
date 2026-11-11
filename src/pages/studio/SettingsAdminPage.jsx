import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Database, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { repo } from "../../lib/dataClient.js";
import { useContent } from "../../contexts/ContentContext.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { RoleBadge } from "../../components/Badges.jsx";

export default function SettingsAdminPage() {
  const { isLocalMode, dataMode, refresh } = useContent();
  const { user, role, isAdmin, signOut } = useAuth();
  const { success, error: toastError } = useToast();
  const [busy, setBusy] = useState(false);

  async function resetDemo() {
    if (!window.confirm("Reset the local demo data back to the sample catalogue?")) return;
    setBusy(true);
    try {
      await repo.resetLocalData();
      await refresh();
      success("Local demo data reset.");
    } catch (err) {
      toastError(err.message || "Could not reset the demo data.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <span className="eyebrow">Configuration</span>
          <h1>Settings</h1>
          <p className="muted small">
            Connection state, your role and the remaining setup steps. Secrets never live in the
            browser: only the Supabase URL and anon key are read at build time.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <section className="admin-card stack">
          <h2 className="row">
            <Database size={17} /> Data source
          </h2>
          <p className="small">
            Current mode:{" "}
            <strong>{dataMode === "supabase" ? "Supabase (Row Level Security)" : "Local demo"}</strong>
          </p>
          {isLocalMode ? (
            <>
              <p className="small muted">
                To go live, add these build-time variables and redeploy:
              </p>
              <ul className="checklist small">
                <li>
                  <code className="code-inline">VITE_SUPABASE_URL</code>
                </li>
                <li>
                  <code className="code-inline">VITE_SUPABASE_ANON_KEY</code>
                </li>
              </ul>
              <p className="tiny faint">
                Run <code className="code-inline">supabase/schema.sql</code> in the SQL editor, then
                promote your first account to <code className="code-inline">admin</code> in the{" "}
                <code className="code-inline">profiles</code> table.
              </p>
              <button type="button" className="btn btn-quiet btn-sm" onClick={resetDemo} disabled={busy}>
                <RefreshCw size={14} /> Reset local demo data
              </button>
            </>
          ) : (
            <p className="small muted">
              Content and uploads are served by Supabase. Row Level Security decides what the
              public can read.
            </p>
          )}
        </section>

        <section className="admin-card stack">
          <h2 className="row">
            <ShieldCheck size={17} /> Your session
          </h2>
          <div className="row">
            <RoleBadge role={role} />
            {isAdmin && <span className="tiny faint">full control</span>}
          </div>
          <p className="tiny faint break-all">{user?.email || "demo session (no email)"}</p>
          <div className="divider" />
          <p className="small muted">
            Roles are managed in the <code className="code-inline">profiles</code> table. Editors
            can publish content; only admins can change roles.
          </p>
          <div className="row">
            <button type="button" className="btn btn-quiet btn-sm" onClick={signOut}>
              Sign out
            </button>
            <Link className="btn btn-ghost btn-sm" to="/">
              <ExternalLink size={14} /> Public site
            </Link>
          </div>
        </section>
      </div>

      <section className="admin-card stack">
        <h2>Publishing policy</h2>
        <ul className="checklist small muted">
          <li>Never invent official lyrics, translations or artist statements.</li>
          <li>Mark placeholder content as sample; it is badged on every public card.</li>
          <li>Label AI-assisted analysis and keep the disclaimer visible.</li>
          <li>Karaoke only for uploaded audio with timed lines.</li>
          <li>Embed only official Spotify/YouTube URLs; nothing is downloaded or re-hosted.</li>
        </ul>
        <div className="notice">
          <AlertTriangle size={15} /> The public site is not published from here. Deployment is a
          separate, explicit step.
        </div>
      </section>
    </div>
  );
}

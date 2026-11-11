import { NavLink, Outlet, Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Disc3,
  ExternalLink,
  Image as ImageIcon,
  LogOut,
  Music2,
  Settings,
  Sparkles,
  Star
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useContent } from "../../contexts/ContentContext.jsx";
import { RoleBadge } from "../../components/Badges.jsx";

const LINKS = [
  ["/studio", "Overview", BarChart3, true],
  ["/studio/albums", "Albums", Disc3],
  ["/studio/songs", "Songs", Music2],
  ["/studio/lyrics", "Lyrics", BookOpen],
  ["/studio/decode", "Song decode", Sparkles],
  ["/studio/media", "Media", ImageIcon],
  ["/studio/integrations", "AI & Spotify", Sparkles],
  ["/studio/settings", "Settings", Settings]
];

export default function StudioLayout() {
  const { user, role, signOut, isAdmin, mode } = useAuth();
  const { isLocalMode } = useContent();

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <Link className="brand" to="/studio">
          <span className="brand-symbol">Y</span>
          <span>
            <strong>YUMEIKA</strong>
            <small>Admin studio</small>
          </span>
        </Link>

        <nav className="stack">
          {LINKS.map(([to, label, Icon, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="stack admin-nav-foot">
          <div className="row">
            <RoleBadge role={role} />
            {isAdmin && <span className="tiny faint">full control</span>}
          </div>
          <p className="tiny faint">{user?.email || "demo session"}</p>
          <button type="button" className="btn btn-quiet btn-sm" onClick={signOut}>
            <LogOut size={14} /> Sign out
          </button>
          <Link className="btn btn-ghost btn-sm" to="/">
            <ExternalLink size={14} /> View public site
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        {mode === "local" && (
          <div className="notice">
            <strong>Demo studio.</strong> No Supabase project is connected, so albums, songs and
            uploads are stored in this browser only. Connect the project to manage real content.
          </div>
        )}

        {isLocalMode && (
          <div className="notice">
            <Star size={15} /> Local mode is for reviewing the interface. Published changes are
            visible to you only.
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}

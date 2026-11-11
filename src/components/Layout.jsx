import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BookOpen,
  Compass,
  Disc3,
  Disc,
  Heart,
  Home,
  Menu,
  Mic2,
  Moon,
  Music2,
  Sparkles,
  Sun,
  UserRound,
  X,
  Lock
} from "lucide-react";
import StarField from "./StarField.jsx";
import PlayerBar from "./PlayerBar.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/music", label: "Music", icon: Music2 },
  { to: "/albums", label: "Albums", icon: Disc3 },
  { to: "/singles", label: "Singles", icon: Disc },
  { to: "/lyrics", label: "Lyrics", icon: BookOpen },
  { to: "/sing", label: "Sing With Yumei", icon: Mic2 },
  { to: "/decode", label: "Song Decode", icon: Sparkles },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/artist", label: "Artist Profile", icon: UserRound }
];

const BOTTOM_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/music", label: "Music", icon: Music2 },
  { to: "/lyrics", label: "Lyrics", icon: BookOpen },
  { to: "/sing", label: "Sing", icon: Mic2 },
  { to: "/favorites", label: "Saved", icon: Heart }
];

function Brand() {
  return (
    <NavLink className="brand" to="/" aria-label="YUMEIKA home">
      <span className="brand-mark">Y</span>
      <span className="brand-text">
        <span className="brand-name">YUMEIKA</span>
        <span className="brand-sub">The Music Universe</span>
      </span>
    </NavLink>
  );
}

function NavList({ onNavigate }) {
  return (
    <nav className="nav-group" aria-label="Public sections">
      <span className="nav-group-label">Universe</span>
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="app-shell">
      <StarField />

      <div className="shell-body">
        <aside className="sidebar">
          <Brand />
          <NavList />
          <div className="sidebar-footer">
            <NavLink className="studio-link" to="/studio">
              <Lock size={15} /> Admin Studio
            </NavLink>
            <p className="sidebar-note">
              Fan platform · Fan-made universe. No official lyrics are shown unless the administrator supplies them.
            </p>
          </div>
        </aside>

        <div className="main-column">
          <header className="topbar">
            <div className="topbar-crumbs">
              <button
                type="button"
                className="icon-btn mobile-only"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
              <span className="online-pill">Universe online</span>
            </div>

            <div className="topbar-actions">
              <button
                type="button"
                className="icon-btn"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <NavLink className="btn btn-sm btn-ghost" to="/studio">
                Studio
              </NavLink>
            </div>
          </header>

          <Outlet />
        </div>
      </div>

      {drawerOpen && (
        <>
          <div
            className="drawer-backdrop"
            role="presentation"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="drawer" aria-label="Mobile navigation">
            <div className="drawer-head">
              <Brand />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            <NavList onNavigate={() => setDrawerOpen(false)} />
            <NavLink className="studio-link" to="/studio" onClick={() => setDrawerOpen(false)}>
              <Lock size={15} /> Admin Studio
            </NavLink>
          </aside>
        </>
      )}

      <PlayerBar />

      <nav className="bottom-nav" aria-label="Quick navigation">
        <div className="bottom-nav-inner">
          {BOTTOM_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `bottom-link${isActive ? " is-active" : ""}`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  CloudOff,
  Download,
  HardDrive,
  Heart,
  Music2,
  RefreshCw,
  Share,
  Smartphone,
  Wifi,
  WifiOff
} from "lucide-react";

import { useContent } from "../contexts/ContentContext.jsx";
import { useFavorites } from "../contexts/FavoritesContext.jsx";
import { useOffline } from "../contexts/OfflineContext.jsx";
import { formatBytes } from "../lib/pwa.js";

/**
 * Offline mode: proof that the app works with no connection, plus the controls
 * to install it and store every file on the device.
 */
export default function OfflinePage() {
  const { albums, songs } = useContent();
  const { count: favoriteCount } = useFavorites();
  const {
    online,
    installed,
    canInstall,
    ios,
    install,
    controlled,
    updateReady,
    applyUpdateNow,
    downloading,
    progress,
    fileCount,
    cachedCount,
    savedAt,
    saveAll,
    storage
  } = useOffline();

  const savedLabel = savedAt
    ? new Date(savedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className="page offline-page">
      <header className="page-head">
        <span className="eyebrow">
          <CloudOff size={13} /> Offline mode
        </span>
        <h1>Your universe, always with you</h1>
        <p className="page-sub">
          YUMEIKA works like a fan app on your phone: the catalogue, lyrics, translations,
          decode notes and your favorites are stored on this device, so nothing stops when the
          connection does.
        </p>
      </header>

      <div className="offline-status-row">
        <span className={`status-chip ${online ? "is-good" : "is-warn"}`}>
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? "Connected" : "No connection — running from device storage"}
        </span>
        <span className={`status-chip ${installed ? "is-good" : ""}`}>
          <Smartphone size={14} />
          {installed ? "Installed on this device" : "Running in the browser"}
        </span>
        <span className={`status-chip ${cachedCount ? "is-good" : ""}`}>
          <HardDrive size={14} />
          {cachedCount
            ? `${cachedCount} of ${fileCount || cachedCount} files cached`
            : controlled
              ? "Cache preparing"
              : "Not stored yet"}
        </span>
      </div>

      <div className="offline-grid">
        <section className="panel offline-card">
          <h2>
            <Download size={17} /> Save everything now
          </h2>
          <p>
            The app shell is already stored the first time you open it. This button downloads
            every file explicitly — covers, audio and the full build — so the very first offline
            launch never has to wait.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={saveAll}
            disabled={downloading}
          >
            <Download size={16} />
            {downloading ? `Saving… ${progress}%` : "Save all files for offline"}
          </button>

          {downloading && (
            <div
              className="offline-progress"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          )}

          {savedLabel && !downloading && (
            <p className="offline-meta">
              <CheckCircle2 size={14} /> Saved on this device · {savedLabel}
            </p>
          )}
        </section>

        <section className="panel offline-card">
          <h2>
            <Smartphone size={17} /> Install on your phone
          </h2>
          {installed ? (
            <p className="offline-meta">
              <CheckCircle2 size={14} /> YUMEIKA is installed. Open it from your home screen — it
              launches full screen, without the browser bars.
            </p>
          ) : canInstall ? (
            <>
              <p>Add YUMEIKA to your home screen for a full-screen app with an offline library.</p>
              <button type="button" className="btn btn-primary" onClick={install}>
                <Download size={16} /> Install app
              </button>
            </>
          ) : (
            <p className="offline-meta">
              <Share size={14} />{" "}
              {ios
                ? "On iPhone/iPad: open this page in Safari, tap Share, then Add to Home Screen."
                : "In Chrome or Edge, open the browser menu and choose Install app / Add to Home screen."}
            </p>
          )}
        </section>

        <section className="panel offline-card">
          <h2>
            <HardDrive size={17} /> Storage on this device
          </h2>
          <p>
            {formatBytes(storage.usage)} used
            {storage.quota ? ` of about ${formatBytes(storage.quota)} available` : ""}.
          </p>
          <p className="offline-meta">
            Favorites, playback position and cached files live only on this device. Clearing the
            browser's site data removes them.
          </p>
        </section>

        <section className="panel offline-card">
          <h2>
            <RefreshCw size={17} /> Updates
          </h2>
          {updateReady ? (
            <>
              <p>A newer version of YUMEIKA has been downloaded and is ready.</p>
              <button type="button" className="btn btn-primary" onClick={applyUpdateNow}>
                <RefreshCw size={16} /> Reload with the new version
              </button>
            </>
          ) : (
            <p className="offline-meta">
              <CheckCircle2 size={14} /> You are on the latest version. Updates install the next
              time you open the app with a connection.
            </p>
          )}
        </section>
      </div>

      <section className="panel offline-card offline-library">
        <h2>
          <BookOpen size={17} /> What is available offline
        </h2>
        <ul className="offline-checklist">
          <li>
            <CheckCircle2 size={15} /> {albums.length} albums and {songs.length} songs with covers
          </li>
          <li>
            <CheckCircle2 size={15} /> Lyrics, translations, romanization and decode notes already
            published
          </li>
          <li>
            <CheckCircle2 size={15} /> {favoriteCount} saved favorite{favoriteCount === 1 ? "" : "s"}{" "}
            on this device
          </li>
          <li>
            <CheckCircle2 size={15} /> Sing-along with the bundled audio track
          </li>
          <li>
            <WifiOff size={15} /> Spotify and YouTube players need a connection — the app tells you
            instead of failing silently
          </li>
        </ul>

        <div className="offline-links">
          <Link className="btn btn-ghost btn-sm" to="/music">
            <Music2 size={15} /> Browse music
          </Link>
          <Link className="btn btn-ghost btn-sm" to="/favorites">
            <Heart size={15} /> Saved favorites
          </Link>
        </div>
      </section>
    </div>
  );
}

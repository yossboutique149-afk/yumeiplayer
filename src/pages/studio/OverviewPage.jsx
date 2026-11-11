import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Disc3,
  FileEdit,
  Mic2,
  Music2,
  Plus,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { repo } from "../../lib/dataClient.js";
import { useContent } from "../../contexts/ContentContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { StatusBadge, SampleBadge } from "../../components/Badges.jsx";
import { formatDate, pluralize } from "../../lib/format.js";

export default function OverviewPage() {
  const { albums, songs, refresh, dataMode } = useContent();
  const { success, error: toastError } = useToast();
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    repo
      .getStats()
      .then(value => active && setStats(value))
      .catch(() => active && setStats(null));
    return () => {
      active = false;
    };
  }, [albums, songs]);

  async function reload() {
    setBusy(true);
    try {
      await refresh();
      setStats(await repo.getStats());
      success("Studio data refreshed.");
    } catch (err) {
      toastError(err.message || "Could not refresh.");
    } finally {
      setBusy(false);
    }
  }

  const cards = [
    ["Albums", stats?.albums ?? albums.length, Disc3],
    ["Songs", stats?.songs ?? songs.length, Music2],
    ["Published", stats?.published ?? songs.filter(song => song.status === "published").length, Sparkles],
    ["Drafts", stats?.drafts ?? songs.filter(song => song.status === "draft").length, FileEdit],
    ["Lyric lines", stats?.lines ?? "—", BookOpen],
    ["Analyses", stats?.analyses ?? "—", Sparkles],
    ["Vocabulary", stats?.vocabulary ?? "—", Mic2]
  ];

  const recentSongs = [...songs]
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, 5);

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <span className="eyebrow">Control center</span>
          <h1>Overview</h1>
          <p className="muted small">
            Everything published here is visible on the public platform immediately. Drafts stay
            private to staff.
          </p>
        </div>
        <div className="row">
          <button type="button" className="btn btn-quiet" onClick={reload} disabled={busy}>
            <RefreshCw size={15} /> {busy ? "Refreshing…" : "Refresh"}
          </button>
          <Link className="btn btn-primary" to="/studio/songs">
            <Plus size={15} /> New song
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        {cards.map(([label, value, Icon]) => (
          <div className="stat-card" key={label}>
            <Icon size={16} />
            <strong>{value}</strong>
            <span className="tiny faint">{label}</span>
          </div>
        ))}
      </div>

      <div className="detail-grid">
        <section className="admin-card stack">
          <div className="section-head">
            <h2>Recent songs</h2>
            <Link className="tiny" to="/studio/songs">
              Manage all
            </Link>
          </div>

          {recentSongs.length ? (
            <div className="stack">
              {recentSongs.map(song => (
                <div className="row between song-row" key={song.id}>
                  <div>
                    <div className="song-row-title">{song.title}</div>
                    <div className="tiny faint">
                      {song.slug} · {formatDate(song.created_at)}
                    </div>
                  </div>
                  <div className="row">
                    <SampleBadge show={song.is_sample} />
                    <StatusBadge status={song.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted">No songs yet. Create the first one in Songs.</p>
          )}
        </section>

        <section className="admin-card stack">
          <h2>Publishing checklist</h2>
          <ul className="checklist small muted">
            <li>Add the album and mark it published.</li>
            <li>Create the song, then upload audio or paste an authorized embed URL.</li>
            <li>Enter lyrics line by line with translation, romanisation and pronunciation.</li>
            <li>Add start/end times to every line to unlock karaoke.</li>
            <li>Label any AI-assisted decode before publishing it.</li>
          </ul>
          <div className="divider" />
          <p className="tiny faint">
            Data source: {dataMode === "supabase" ? "Supabase (RLS enforced)" : "browser local demo"} ·{" "}
            {pluralize(albums.length, "album")}
          </p>
        </section>
      </div>
    </div>
  );
}

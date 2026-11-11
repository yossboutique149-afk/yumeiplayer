import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  KeyRound,
  Music2,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { repo } from "../../lib/dataClient.js";
import { useContent } from "../../contexts/ContentContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import StudyGenerator from "../../components/StudyGenerator.jsx";
import {
  IntegrationError,
  fetchIntegrationStatus,
  getServerPassword,
  importSpotifyCatalog,
  setServerPassword
} from "../../lib/integrations.js";
import { summarizeImport } from "../../lib/spotify.js";

function Problem({ problem }) {
  if (!problem) return null;
  return (
    <div className="notice notice-warn stack">
      <strong className="row">
        <AlertTriangle size={15} /> {problem.message}
      </strong>
      {problem.missing?.length > 0 && (
        <p className="tiny">
          Missing on the server: <code>{problem.missing.join(", ")}</code>
        </p>
      )}
      {problem.hint && <p className="tiny faint">{problem.hint}</p>}
    </div>
  );
}

function StatusRow({ label, ok, detail }) {
  return (
    <div className="row between">
      <span className="row">
        {ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
        {label}
      </span>
      <span className="tiny faint">{detail}</span>
    </div>
  );
}

export default function IntegrationsAdminPage() {
  const { albums, songs, refresh } = useContent();
  const { success, error: toastError } = useToast();

  const [status, setStatus] = useState(null);
  const [password, setPassword] = useState(getServerPassword());
  const [artistId, setArtistId] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState(null);
  const [preview, setPreview] = useState(null);
  const [chosen, setChosen] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchIntegrationStatus()
      .then(data => {
        if (!alive) return;
        setStatus(data);
        setArtistId(current => current || data?.spotify?.artistId || "");
      })
      .catch(() => {
        if (alive) setStatus({ spotify: {}, ai: {}, adminGate: {} });
      });
    return () => {
      alive = false;
    };
  }, []);

  const summary = useMemo(() => (preview ? summarizeImport(preview) : null), [preview]);

  async function runImport() {
    setBusy(true);
    setProblem(null);
    setPreview(null);
    try {
      setServerPassword(password);
      const data = await importSpotifyCatalog({ artistId, password });
      setPreview(data.albums || []);
      setChosen((data.albums || []).map(entry => entry.spotify_id));
      success(`Spotify returned ${data.summary?.albums || 0} releases.`);
    } catch (err) {
      setProblem(
        err instanceof IntegrationError
          ? { message: err.message, missing: err.missing, hint: err.hint }
          : { message: err.message || "Spotify import failed." }
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveImported() {
    if (!preview?.length) return;
    setSaving(true);
    setProblem(null);
    let albumsAdded = 0;
    let songsAdded = 0;
    const failures = [];

    for (const entry of preview) {
      if (!chosen.includes(entry.spotify_id)) continue;
      try {
        const existing = albums.find(album => album.slug === entry.album.slug);
        const savedAlbum = existing || (await repo.saveAlbum(entry.album));
        if (!existing) albumsAdded += 1;

        for (const song of entry.songs) {
          const duplicate = songs.find(row => row.slug === song.slug);
          if (duplicate) continue;
          await repo.saveSong({ ...song, album_id: savedAlbum.id });
          songsAdded += 1;
        }
      } catch (err) {
        failures.push(`${entry.album.title}: ${err.message}`);
      }
    }

    await refresh();
    setSaving(false);
    if (failures.length) toastError(`${failures.length} release(s) could not be saved: ${failures[0]}`);
    if (albumsAdded || songsAdded) {
      success(`Imported ${albumsAdded} album(s) and ${songsAdded} song(s) as drafts.`);
      setPreview(null);
    }
  }

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <span className="eyebrow">Integrations</span>
          <h1>AI &amp; Spotify</h1>
          <p className="muted small">
            Spotify supplies real titles, covers, durations and official players. The AI writer turns
            each song into a full study: lyrics, romanisation, pronunciation, translation, vocabulary
            and deep analysis. Both run on the server so no key ever reaches the browser.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={() => {
            setPassword(getServerPassword());
            fetchIntegrationStatus().then(setStatus).catch(() => setStatus(null));
          }}
        >
          <RefreshCw size={14} /> Refresh status
        </button>
      </div>

      <section className="admin-card stack">
        <h2>Studio password</h2>
        <p className="tiny faint">
          The privileged endpoints require the same ADMIN_PASSWORD configured on the server. It is kept
          in this tab only (sessionStorage) and never written into the repository.
        </p>
        <label className="field-label">
          <span className="row tiny">
            <KeyRound size={13} /> ADMIN_PASSWORD
          </span>
          <input
            className="input"
            type="password"
            autoComplete="off"
            value={password}
            onChange={event => setPassword(event.target.value)}
            onBlur={() => setServerPassword(password)}
            placeholder="Server studio password"
          />
        </label>

        {status && (
          <div className="stack">
            <StatusRow
              label="Spotify credentials"
              ok={Boolean(status.spotify?.configured)}
              detail={status.spotify?.configured ? "configured" : "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET"}
            />
            <StatusRow
              label="AI writer"
              ok={Boolean(status.ai?.configured)}
              detail={status.ai?.configured ? status.ai?.model : "AI_API_KEY"}
            />
            <StatusRow
              label="Studio gate"
              ok={Boolean(status.adminGate?.configured)}
              detail={status.adminGate?.configured ? "configured" : "ADMIN_PASSWORD"}
            />
          </div>
        )}
      </section>

      <section className="admin-card stack">
        <div className="row between">
          <h2>
            <Music2 size={17} /> Import from Spotify
          </h2>
        </div>
        <p className="tiny faint">
          Pulls the artist catalogue with the Spotify Web API and creates drafts. Audio is never
          downloaded: each song keeps the official Spotify player and links.
        </p>

        <label className="field-label">
          Spotify artist ID
          <input
            className="input"
            value={artistId}
            onChange={event => setArtistId(event.target.value)}
            placeholder="4rvqZA6szL4nbRkoN7soB1"
          />
        </label>

        <div className="row">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={runImport}
            disabled={busy || !password}
          >
            <Download size={14} /> {busy ? "Reading Spotify…" : "Read catalogue"}
          </button>
          {summary && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={saveImported}
              disabled={saving || !chosen.length}
            >
              <CheckCircle2 size={14} /> {saving ? "Saving…" : `Add ${summary.albums} albums / ${summary.songs} songs`}
            </button>
          )}
        </div>

        <Problem problem={problem} />

        {preview?.length ? (
          <div className="stack">
            {preview.map(entry => (
              <label className="admin-card row between" key={entry.spotify_id}>
                <span className="row">
                  <input
                    type="checkbox"
                    checked={chosen.includes(entry.spotify_id)}
                    onChange={event =>
                      setChosen(current =>
                        event.target.checked
                          ? [...current, entry.spotify_id]
                          : current.filter(id => id !== entry.spotify_id)
                      )
                    }
                  />
                  <span>
                    <strong>{entry.album.title}</strong>
                    <span className="tiny faint block">
                      {entry.album.release_year} · {entry.songs.length} tracks · draft
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </section>

      <section className="admin-card stack">
        <h2>
          <Sparkles size={17} /> Generate a study for a song
        </h2>
        <p className="tiny faint">
          Pick a song and let the AI write the full study. Review the preview before saving it.
        </p>
        {songs.length ? (
          songs.map(song => <StudyGenerator key={song.id} song={song} onApplied={refresh} />)
        ) : (
          <p className="muted small">No songs yet. Import the catalogue or add a song first.</p>
        )}
      </section>
    </div>
  );
}

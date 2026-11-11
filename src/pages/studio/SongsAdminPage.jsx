import { useState } from "react";
import { ExternalLink, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { repo } from "../../lib/dataClient.js";
import { STORAGE_BUCKETS } from "../../lib/supabase.js";
import { useContent } from "../../contexts/ContentContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { SampleBadge, StatusBadge } from "../../components/Badges.jsx";
import CoverArt from "../../components/CoverArt.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import StudyGenerator from "../../components/StudyGenerator.jsx";
import { formatDuration, slugify } from "../../lib/format.js";
import { isAllowedEmbed } from "../../components/EmbedFrame.jsx";

const EMPTY = {
  title: "",
  title_ja: "",
  slug: "",
  album_id: "",
  track_number: 1,
  duration_seconds: 0,
  release_type: "album_track",
  status: "draft",
  is_sample: false,
  cover_url: "",
  audio_url: "",
  spotify_embed_url: "",
  youtube_embed_url: "",
  description: "",
  credits: "",
  external_links: []
};

export default function SongsAdminPage() {
  const { albums, songs, refresh } = useContent();
  const { success, error: toastError, info } = useToast();
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [linksText, setLinksText] = useState("[]");

  function edit(song) {
    const value = { ...EMPTY, ...song, album_id: song.album_id || "" };
    setDraft(value);
    setLinksText(JSON.stringify(song.external_links || [], null, 2));
  }

  function startNew() {
    setDraft({ ...EMPTY });
    setLinksText("[]");
  }

  function patch(changes) {
    setDraft(current => ({ ...current, ...changes }));
  }

  async function save(event) {
    event.preventDefault();

    let externalLinks = [];
    try {
      const parsed = JSON.parse(linksText || "[]");
      if (!Array.isArray(parsed)) throw new Error("not an array");
      externalLinks = parsed
        .filter(entry => entry && entry.url)
        .map(entry => ({ label: String(entry.label || "Listen"), url: String(entry.url) }));
    } catch {
      toastError("External links must be a JSON array like [{\"label\":\"Spotify\",\"url\":\"https://…\"}]");
      return;
    }

    if (draft.spotify_embed_url && !isAllowedEmbed(draft.spotify_embed_url)) {
      toastError("Only official Spotify and YouTube embed URLs are allowed.");
      return;
    }
    if (draft.youtube_embed_url && !isAllowedEmbed(draft.youtube_embed_url)) {
      toastError("Only official Spotify and YouTube embed URLs are allowed.");
      return;
    }

    setBusy(true);
    try {
      await repo.saveSong({
        ...draft,
        slug: draft.slug || slugify(draft.title),
        album_id: draft.album_id || null,
        external_links: externalLinks
      });
      await refresh();
      success(`Song “${draft.title}” saved.`);
      setDraft(null);
    } catch (err) {
      toastError(err.message || "Could not save the song.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(song) {
    if (!window.confirm(`Delete “${song.title}” with its lyrics and analysis?`)) return;
    try {
      await repo.deleteSong(song.id);
      await refresh();
      success("Song deleted.");
    } catch (err) {
      toastError(err.message || "Could not delete the song.");
    }
  }

  async function upload(file, bucket, field) {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await repo.uploadAsset(file, { bucket, folder: bucket });
      patch({ [field]: url });
      success(`${field === "audio_url" ? "Audio" : "Cover"} uploaded.`);
    } catch (err) {
      toastError(err.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <span className="eyebrow">Library</span>
          <h1>Songs</h1>
          <p className="muted small">
            Uploaded audio enables karaoke. External players are embedded through the official
            Spotify and YouTube URLs only.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startNew}>
          <Plus size={15} /> New song
        </button>
      </div>

      {draft && (
        <form className="admin-card stack" onSubmit={save}>
          <div className="row between">
            <h2>{draft.id ? "Edit song" : "New song"}</h2>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setDraft(null)}>
              <X size={14} /> Close
            </button>
          </div>

          <div className="form-grid">
            <label className="field-label">
              Title
              <input
                className="input"
                required
                value={draft.title}
                onChange={event => patch({ title: event.target.value })}
              />
            </label>

            <label className="field-label">
              Japanese title
              <input
                className="input jp"
                value={draft.title_ja || ""}
                onChange={event => patch({ title_ja: event.target.value })}
              />
            </label>

            <label className="field-label">
              Album
              <select
                className="select"
                value={draft.album_id || ""}
                onChange={event => patch({ album_id: event.target.value })}
              >
                <option value="">No album (standalone)</option>
                {albums.map(album => (
                  <option key={album.id} value={album.id}>
                    {album.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Release type
              <select
                className="select"
                value={draft.release_type}
                onChange={event => patch({ release_type: event.target.value })}
              >
                <option value="album_track">Album track</option>
                <option value="single">Single</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="field-label">
              Track number
              <input
                className="input"
                type="number"
                min="1"
                value={draft.track_number ?? 1}
                onChange={event => patch({ track_number: Number(event.target.value) })}
              />
            </label>

            <label className="field-label">
              Duration (seconds)
              <input
                className="input"
                type="number"
                min="0"
                value={draft.duration_seconds ?? 0}
                onChange={event => patch({ duration_seconds: Number(event.target.value) })}
              />
            </label>

            <label className="field-label">
              Status
              <select
                className="select"
                value={draft.status}
                onChange={event => patch({ status: event.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label className="field-label">
              Slug
              <input
                className="input"
                value={draft.slug || ""}
                placeholder={slugify(draft.title || "song")}
                onChange={event => patch({ slug: event.target.value })}
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="field-label">
              Audio file URL (uploaded)
              <input
                className="input"
                value={draft.audio_url || ""}
                onChange={event => patch({ audio_url: event.target.value })}
                placeholder="/sample/sample-tone.mp3"
              />
            </label>

            <label className="field-label">
              Cover URL
              <input
                className="input"
                value={draft.cover_url || ""}
                onChange={event => patch({ cover_url: event.target.value })}
              />
            </label>

            <label className="field-label">
              Spotify embed URL
              <input
                className="input"
                value={draft.spotify_embed_url || ""}
                onChange={event => patch({ spotify_embed_url: event.target.value })}
                placeholder="https://open.spotify.com/embed/track/…"
              />
            </label>

            <label className="field-label">
              YouTube embed URL
              <input
                className="input"
                value={draft.youtube_embed_url || ""}
                onChange={event => patch({ youtube_embed_url: event.target.value })}
                placeholder="https://www.youtube.com/embed/…"
              />
            </label>
          </div>

          <div className="row">
            <label className="btn btn-quiet btn-sm">
              <Upload size={14} /> Upload audio
              <input
                type="file"
                accept="audio/*"
                hidden
                onChange={event => upload(event.target.files?.[0], STORAGE_BUCKETS.audio, "audio_url")}
              />
            </label>
            <label className="btn btn-quiet btn-sm">
              <Upload size={14} /> Upload cover
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={event => upload(event.target.files?.[0], STORAGE_BUCKETS.artwork, "cover_url")}
              />
            </label>
            {draft.audio_url && (
              <a className="btn btn-ghost btn-sm" href={draft.audio_url} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> Preview audio
              </a>
            )}
            {draft.duration_seconds > 0 && (
              <span className="tiny faint">{formatDuration(draft.duration_seconds)}</span>
            )}
          </div>

          <label className="field-label">
            Description
            <textarea
              className="input"
              rows={3}
              value={draft.description || ""}
              onChange={event => patch({ description: event.target.value })}
            />
          </label>

          <label className="field-label">
            Credits
            <textarea
              className="input"
              rows={2}
              value={draft.credits || ""}
              onChange={event => patch({ credits: event.target.value })}
            />
          </label>

          <label className="field-label">
            External links (JSON array)
            <textarea
              className="input code-inline"
              rows={4}
              value={linksText}
              onChange={event => setLinksText(event.target.value)}
            />
          </label>

          <div className="row between">
            <label className="row tiny">
              <input
                type="checkbox"
                checked={Boolean(draft.is_sample)}
                onChange={event => patch({ is_sample: event.target.checked })}
              />
              Mark as sample content
            </label>
            <span className="tiny faint">
              Karaoke needs timings in Lyrics → per-line start/end.
            </span>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              <Save size={15} /> {busy ? "Saving…" : "Save song"}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => info("Save the song first, then add lyrics in the Lyrics section.")}
            >
              Where do lyrics go?
            </button>
          </div>
        </form>
      )}

      {songs.length ? (
        <div className="stack">
          {songs.map(song => (
            <div className="admin-card stack" key={song.id}>
              <div className="row between">
                <div className="row">
                  <CoverArt item={song} className="song-thumb" />
                  <div>
                    <div className="song-row-title">{song.title}</div>
                    <div className="tiny faint">
                      {song.slug} · {song.release_type} ·{" "}
                      {song.audio_url ? "audio ✓" : "no audio"}
                    </div>
                    <div className="row">
                      <StatusBadge status={song.status} />
                      <SampleBadge show={song.is_sample} />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => edit(song)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => remove(song)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
              <StudyGenerator song={song} onApplied={refresh} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No songs yet">Add a song to publish your first track.</EmptyState>
      )}
    </div>
  );
}

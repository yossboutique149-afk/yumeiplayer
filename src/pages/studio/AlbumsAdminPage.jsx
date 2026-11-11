import { useState } from "react";
import { Plus, Save, Trash2, Upload, X } from "lucide-react";
import { repo } from "../../lib/dataClient.js";
import { STORAGE_BUCKETS } from "../../lib/supabase.js";
import { useContent } from "../../contexts/ContentContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import { SampleBadge, StatusBadge } from "../../components/Badges.jsx";
import CoverArt from "../../components/CoverArt.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { slugify } from "../../lib/format.js";

const EMPTY = {
  title: "",
  title_ja: "",
  slug: "",
  description: "",
  cover_url: "",
  release_date: "",
  album_type: "album",
  status: "draft",
  is_sample: false,
  sort_order: 0
};

export default function AlbumsAdminPage() {
  const { albums, refresh } = useContent();
  const { success, error: toastError } = useToast();
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  function edit(album) {
    setDraft({ ...EMPTY, ...album, release_date: album.release_date || "" });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await repo.saveAlbum({ ...draft, slug: draft.slug || slugify(draft.title) });
      await refresh();
      success(`Album “${draft.title}” saved.`);
      setDraft(null);
    } catch (err) {
      toastError(err.message || "Could not save the album.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(album) {
    if (!window.confirm(`Delete “${album.title}” and unlink its songs?`)) return;
    try {
      await repo.deleteAlbum(album.id);
      await refresh();
      success("Album deleted.");
    } catch (err) {
      toastError(err.message || "Could not delete the album.");
    }
  }

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await repo.uploadAsset(file, {
        bucket: STORAGE_BUCKETS.artwork,
        folder: "albums"
      });
      setDraft(current => ({ ...current, cover_url: url }));
      success("Cover uploaded.");
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
          <h1>Albums</h1>
          <p className="muted small">
            Create and edit album metadata. Drafts stay hidden from the public platform.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDraft({ ...EMPTY })}>
          <Plus size={15} /> New album
        </button>
      </div>

      {draft && (
        <form className="admin-card stack" onSubmit={save}>
          <div className="row between">
            <h2>{draft.id ? "Edit album" : "New album"}</h2>
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
                onChange={event => setDraft({ ...draft, title: event.target.value })}
              />
            </label>

            <label className="field-label">
              Japanese title
              <input
                className="input jp"
                value={draft.title_ja || ""}
                onChange={event => setDraft({ ...draft, title_ja: event.target.value })}
              />
            </label>

            <label className="field-label">
              Slug
              <input
                className="input"
                value={draft.slug || ""}
                placeholder={slugify(draft.title || "album")}
                onChange={event => setDraft({ ...draft, slug: event.target.value })}
              />
            </label>

            <label className="field-label">
              Release date
              <input
                className="input"
                type="date"
                value={draft.release_date || ""}
                onChange={event => setDraft({ ...draft, release_date: event.target.value })}
              />
            </label>

            <label className="field-label">
              Type
              <select
                className="select"
                value={draft.album_type}
                onChange={event => setDraft({ ...draft, album_type: event.target.value })}
              >
                <option value="album">Album</option>
                <option value="ep">EP</option>
                <option value="single">Single</option>
                <option value="compilation">Compilation</option>
              </select>
            </label>

            <label className="field-label">
              Status
              <select
                className="select"
                value={draft.status}
                onChange={event => setDraft({ ...draft, status: event.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label className="field-label">
              Cover URL
              <input
                className="input"
                value={draft.cover_url || ""}
                onChange={event => setDraft({ ...draft, cover_url: event.target.value })}
              />
            </label>

            <label className="field-label">
              Sort order
              <input
                className="input"
                type="number"
                value={draft.sort_order ?? 0}
                onChange={event => setDraft({ ...draft, sort_order: Number(event.target.value) })}
              />
            </label>
          </div>

          <label className="field-label">
            Description
            <textarea
              className="input"
              rows={3}
              value={draft.description || ""}
              onChange={event => setDraft({ ...draft, description: event.target.value })}
            />
          </label>

          <div className="row between">
            <label className="row tiny">
              <input
                type="checkbox"
                checked={Boolean(draft.is_sample)}
                onChange={event => setDraft({ ...draft, is_sample: event.target.checked })}
              />
              Mark as sample content
            </label>

            <label className="btn btn-quiet btn-sm">
              <Upload size={14} /> Upload cover
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={event => upload(event.target.files?.[0])}
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              <Save size={15} /> {busy ? "Saving…" : "Save album"}
            </button>
          </div>
        </form>
      )}

      {albums.length ? (
        <div className="stack">
          {albums.map(album => (
            <div className="admin-card row between" key={album.id}>
              <div className="row">
                <CoverArt item={album} className="song-thumb" />
                <div>
                  <div className="song-row-title">{album.title}</div>
                  <div className="tiny faint">
                    {album.title_ja || "—"} · {album.slug}
                  </div>
                  <div className="row">
                    <StatusBadge status={album.status} />
                    <SampleBadge show={album.is_sample} />
                  </div>
                </div>
              </div>
              <div className="row">
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => edit(album)}>
                  Edit
                </button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => remove(album)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No albums yet">Create the first album to start the discography.</EmptyState>
      )}
    </div>
  );
}

import { useState } from "react";
import { Copy, Image as ImageIcon, Music2, Upload } from "lucide-react";
import { repo } from "../../lib/dataClient.js";
import { STORAGE_BUCKETS } from "../../lib/supabase.js";
import { useContent } from "../../contexts/ContentContext.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";
import CoverArt from "../../components/CoverArt.jsx";

export default function MediaAdminPage() {
  const { songs, refresh } = useContent();
  const { success, error: toastError } = useToast();
  const [uploads, setUploads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [targetId, setTargetId] = useState("");

  async function upload(file, kind) {
    if (!file) return;
    setBusy(true);
    try {
      const bucket = kind === "audio" ? STORAGE_BUCKETS.audio : STORAGE_BUCKETS.artwork;
      const { url, path } = await repo.uploadAsset(file, { bucket, folder: kind });
      setUploads(current => [{ url, path, kind, name: file.name, at: Date.now() }, ...current]);
      success(`${kind === "audio" ? "Audio" : "Artwork"} uploaded.`);
    } catch (err) {
      toastError(err.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function attach(upload) {
    if (!targetId) {
      toastError("Choose a song to attach this file to.");
      return;
    }
    const song = songs.find(item => item.id === targetId);
    if (!song) return;
    setBusy(true);
    try {
      await repo.saveSong({
        ...song,
        [upload.kind === "audio" ? "audio_url" : "cover_url"]: upload.url
      });
      await refresh();
      success(`Attached to “${song.title}”.`);
    } catch (err) {
      toastError(err.message || "Could not attach the file.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(url) {
    try {
      await navigator.clipboard.writeText(url);
      success("URL copied.");
    } catch {
      toastError("Copy failed — select the URL manually.");
    }
  }

  const missingAudio = songs.filter(song => !song.audio_url);
  const missingCover = songs.filter(song => !song.cover_url);

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <span className="eyebrow">Storage</span>
          <h1>Media</h1>
          <p className="muted small">
            Uploads go to the private-to-staff Supabase buckets <code className="code-inline">yumeika-audio</code>{" "}
            and <code className="code-inline">yumeika-artwork</code>. Only upload audio you own or
            are authorised to host.
          </p>
        </div>
      </div>

      <div className="explore-grid">
        <section className="admin-card stack">
          <h2 className="row">
            <Music2 size={17} /> Audio
          </h2>
          <p className="tiny faint">MP3, M4A, WAV or OGG. Enables karaoke when lines are timed.</p>
          <label className="btn btn-primary btn-sm">
            <Upload size={14} /> Upload audio
            <input
              type="file"
              accept="audio/*"
              hidden
              onChange={event => upload(event.target.files?.[0], "audio")}
            />
          </label>
          {missingAudio.length > 0 && (
            <p className="tiny faint">{missingAudio.length} song(s) still have no audio.</p>
          )}
        </section>

        <section className="admin-card stack">
          <h2 className="row">
            <ImageIcon size={17} /> Artwork
          </h2>
          <p className="tiny faint">Square JPG, PNG or WebP for album and song covers.</p>
          <label className="btn btn-primary btn-sm">
            <Upload size={14} /> Upload artwork
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={event => upload(event.target.files?.[0], "artwork")}
            />
          </label>
          {missingCover.length > 0 && (
            <p className="tiny faint">{missingCover.length} song(s) still have no cover.</p>
          )}
        </section>
      </div>

      <div className="admin-card stack">
        <h2>Attach an upload</h2>
        <label className="field-label">
          Target song
          <select className="select" value={targetId} onChange={event => setTargetId(event.target.value)}>
            <option value="">Choose a song…</option>
            {songs.map(song => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </select>
        </label>
        <p className="tiny faint">
          Attaching replaces the existing audio or cover URL for that song.
        </p>
      </div>

      {busy && <p className="tiny faint">Working…</p>}

      <div className="stack">
        <h2>Session uploads</h2>
        {uploads.length ? (
          uploads.map(upload => (
            <div className="admin-card row between" key={upload.path}>
              <div>
                <div className="song-row-title">
                  {upload.kind === "audio" ? <Music2 size={14} /> : <ImageIcon size={14} />} {upload.name}
                </div>
                <div className="tiny faint break-all">{upload.url}</div>
              </div>
              <div className="row">
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => copy(upload.url)}>
                  <Copy size={13} /> Copy
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => attach(upload)}>
                  Attach
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="small muted">
            Uploaded files appear here for this session. Files already attached stay stored in the
            song record.
          </p>
        )}
      </div>

      {songs.length > 0 && (
        <div className="stack">
          <h2>Current covers</h2>
          <div className="album-grid">
            {songs.slice(0, 6).map(song => (
              <div className="admin-card stack" key={song.id}>
                <CoverArt item={song} className="album-cover" />
                <div className="tiny">{song.title}</div>
                <div className="tiny faint">{song.cover_url ? "cover ✓" : "no cover"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

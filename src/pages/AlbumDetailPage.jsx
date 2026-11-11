import { Link, useParams } from "react-router-dom";
import { Pause, Play, Pencil } from "lucide-react";
import { useContent } from "../contexts/ContentContext.jsx";
import { usePlayer } from "../contexts/PlayerContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import CoverArt from "../components/CoverArt.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { SampleBadge, StatusBadge } from "../components/Badges.jsx";
import { formatDuration, pluralize } from "../lib/format.js";

export default function AlbumDetailPage() {
  const { slug } = useParams();
  const { albums, songsForAlbum, loading } = useContent();
  const { current, playing, play, toggle } = usePlayer();
  const { isStaff } = useAuth();

  const album = albums.find(item => item.slug === slug) || null;
  const tracks = album ? songsForAlbum(album.id) : [];
  const totalSeconds = tracks.reduce((sum, song) => sum + Number(song.duration_seconds || 0), 0);

  if (loading) {
    return (
      <div className="page">
        <div className="panel center stack">
          <span className="spinner" aria-hidden="true" />
          <p className="muted small">Loading album…</p>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="page page-narrow">
        <EmptyState title="Album not found">
          This album may be unpublished or removed. <Link to="/albums">Back to albums</Link>.
        </EmptyState>
      </div>
    );
  }

  const playingAlbum = current && tracks.some(song => song.id === current.id) && playing;

  return (
    <div className="page">
      <section className="song-hero">
        <CoverArt item={album} className="album-cover" />

        <div className="song-hero-copy">
          <div className="row">
            <StatusBadge status={album.status} />
            <SampleBadge show={album.is_sample} />
            {album.release_year && album.release_year !== "—" && (
              <span className="badge">{album.release_year}</span>
            )}
          </div>

          <h1 className="song-hero-title">{album.title}</h1>
          {album.romanized_title && <p className="song-hero-jp">{album.romanized_title}</p>}
          {album.title_ja && album.title_ja !== album.title && (
            <p className="jp small faint">{album.title_ja}</p>
          )}

          <p className="song-hero-meta small muted">
            {pluralize(tracks.length, "track")}
            {totalSeconds > 0 ? ` · ${formatDuration(totalSeconds)} total` : ""}
          </p>

          {album.description && <p className="small muted pre-line">{album.description}</p>}

          <div className="song-hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!tracks.length}
              onClick={() => {
                if (playingAlbum) toggle();
                else if (tracks.length) play(tracks[0], tracks);
              }}
            >
              {playingAlbum ? <Pause size={16} /> : <Play size={16} />}
              {playingAlbum ? "Pause album" : "Play album"}
            </button>

            {isStaff && (
              <Link className="btn btn-quiet" to={`/studio/albums?edit=${album.id}`}>
                <Pencil size={15} /> Edit album
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="panel stack">
        <div className="section-head">
          <h2>Track list</h2>
          <span className="tiny faint">{pluralize(tracks.length, "track")}</span>
        </div>

        {tracks.length ? (
          <div className="song-list">
            {tracks.map((song, index) => {
              const isCurrent = current?.id === song.id;
              return (
                <div className={`song-row${isCurrent ? " is-playing" : ""}`} key={song.id}>
                  <span className="song-index">{String(index + 1).padStart(2, "0")}</span>
                  <CoverArt item={song} className="song-thumb" />

                  <div className="song-row-main">
                    <Link className="song-row-title" to={`/songs/${song.slug}`}>
                      {song.title}
                    </Link>
                    <span className="song-row-sub tiny muted">
                      {song.title_ja || (song.audio_url ? "Audio available" : "No audio uploaded")}
                    </span>
                  </div>

                  <span className="song-row-duration tiny faint">
                    {song.duration_seconds ? formatDuration(song.duration_seconds) : "—"}
                  </span>

                  <button
                    type="button"
                    className="btn btn-icon btn-quiet"
                    onClick={() => (isCurrent ? toggle() : play(song, tracks))}
                    disabled={!song.audio_url}
                    aria-label={isCurrent && playing ? `Pause ${song.title}` : `Play ${song.title}`}
                  >
                    {isCurrent && playing ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No tracks yet">
            The administrator can add tracks to this album from the Admin Studio.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

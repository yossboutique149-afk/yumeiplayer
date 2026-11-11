import { useMemo } from "react";
import { useContent } from "../contexts/ContentContext.jsx";
import SongCard from "../components/SongCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function SinglesPage() {
  const { songs, loading } = useContent();

  const singles = useMemo(
    () =>
      songs.filter(
        song =>
          song.source !== "spotify" &&
          (song.release_type === "single" || (!song.album_id && song.status === "published"))
      ),
    [songs]
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Releases</span>
          <h1>Singles</h1>
          <p className="muted small">
            Tracks released outside a full album. The administrator sets the release type on
            every song.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="song-grid">
          {[0, 1, 2].map(key => (
            <div className="skeleton" key={key} style={{ height: 210 }} />
          ))}
        </div>
      ) : singles.length ? (
        <div className="song-grid">
          {singles.map(song => (
            <SongCard key={song.id} song={song} list={singles} />
          ))}
        </div>
      ) : (
        <EmptyState title="No singles published">
          Mark a song as a single in the Admin Studio, or leave it outside an album, and it
          will appear here.
        </EmptyState>
      )}
    </div>
  );
}

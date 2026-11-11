import { Link } from "react-router-dom";
import { Heart, Play, Pause } from "lucide-react";
import CoverArt from "./CoverArt.jsx";
import { SampleBadge } from "./Badges.jsx";
import { usePlayer } from "../contexts/PlayerContext.jsx";
import { useFavorites } from "../contexts/FavoritesContext.jsx";
import { useContent } from "../contexts/ContentContext.jsx";
import { formatDuration } from "../lib/format.js";

export default function SongCard({ song, list = null, showAlbum = true }) {
  const { current, playing, play, toggle } = usePlayer();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { albumById } = useContent();
  const album = song.album_id ? albumById(song.album_id) : null;
  const isCurrent = current?.id === song.id;
  const favorite = isFavorite(song.id);

  const handlePlay = event => {
    event.preventDefault();
    event.stopPropagation();
    if (isCurrent) {
      toggle();
      return;
    }
    play(song, list || [song]);
  };

  return (
    <article className={`song-card${isCurrent ? " is-playing" : ""}`}>
      <div className="song-card-top">
        <Link to={`/songs/${song.slug}`} aria-label={`Open ${song.title}`}>
          <CoverArt item={song} className="song-cover" />
        </Link>
        <button
          type="button"
          className="btn btn-icon btn-primary"
          onClick={handlePlay}
          aria-label={isCurrent && playing ? `Pause ${song.title}` : `Play ${song.title}`}
          title={song.audio_url ? "Play" : "No audio uploaded yet"}
        >
          {isCurrent && playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      <div className="song-card-tags">
        <SampleBadge show={song.is_sample} />
        {!song.audio_url && <span className="badge">No audio</span>}
        <button
          type="button"
          className={`btn btn-icon btn-quiet${favorite ? " is-active" : ""}`}
          onClick={() => toggleFavorite(song.id)}
          aria-label={favorite ? `Remove ${song.title} from favorites` : `Add ${song.title} to favorites`}
          aria-pressed={favorite}
        >
          <Heart size={15} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div>
        <Link className="song-row-title" to={`/songs/${song.slug}`}>
          {song.title}
        </Link>
        {song.title_ja && <div className="jp tiny faint">{song.title_ja}</div>}
        {showAlbum && (
          <div className="tiny muted">
            {album ? (
              <Link to={`/albums/${album.slug}`}>{album.title}</Link>
            ) : (
              "Unassigned"
            )}
            {song.duration_seconds ? ` · ${formatDuration(song.duration_seconds)}` : ""}
          </div>
        )}
      </div>
    </article>
  );
}

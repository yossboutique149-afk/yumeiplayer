import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useContent } from "../contexts/ContentContext.jsx";
import { useFavorites } from "../contexts/FavoritesContext.jsx";
import SongCard from "../components/SongCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { pluralize } from "../lib/format.js";

export default function FavoritesPage() {
  const { songs, loading } = useContent();
  const { ids, count } = useFavorites();

  const saved = songs.filter(song => ids.includes(song.id));
  const missing = ids.filter(id => !songs.some(song => song.id === id));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Your universe</span>
          <h1 className="row">
            <Heart size={26} /> Favorites
          </h1>
          <p className="muted small">
            Saved on this device. Signed-in visitors also sync favorites to their Supabase
            account.
          </p>
        </div>
        <span className="badge">{pluralize(count, "song")}</span>
      </div>

      {loading ? (
        <div className="song-grid">
          {[0, 1, 2].map(key => (
            <div className="skeleton" key={key} style={{ height: 210 }} />
          ))}
        </div>
      ) : saved.length ? (
        <>
          <div className="song-grid">
            {saved.map(song => (
              <SongCard key={song.id} song={song} list={saved} />
            ))}
          </div>
          {missing.length > 0 && (
            <p className="tiny faint">
              {missing.length} saved song(s) are no longer published, so they are not shown.
            </p>
          )}
        </>
      ) : (
        <EmptyState title="No favorites yet">
          Tap the heart on any song to keep it here. <Link to="/music">Browse the music</Link>.
        </EmptyState>
      )}
    </div>
  );
}

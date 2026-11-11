import { useMemo, useState } from "react";
import { Search, Music4 } from "lucide-react";
import { useContent } from "../contexts/ContentContext.jsx";
import SongCard from "../components/SongCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { matchesQuery } from "../lib/format.js";

export default function MusicPage() {
  const { songs, albums, albumById, loading, spotifyArtist, spotifyCount } = useContent();
  const [query, setQuery] = useState("");
  const [albumFilter, setAlbumFilter] = useState("all");

  const filtered = useMemo(() => {
    return songs
      .filter(song => {
        const album = song.album_id ? albumById(song.album_id) : null;
        return matchesQuery(query, song.title, song.title_ja, album?.title, album?.romanized_title);
      })
      .filter(song => (albumFilter === "all" ? true : song.album_id === albumFilter));
  }, [songs, query, albumFilter, albumById]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Official catalogue</span>
          <h1>Music library</h1>
          <p className="muted small">
            Every published song, with its own detail page, audio player and decode.
          </p>
        </div>
      </div>

      {spotifyArtist && spotifyCount > 0 && (
        <p className="notice">
          <Music4 size={15} /> {spotifyCount} track{spotifyCount === 1 ? "" : "s"} come straight
          from the official Spotify catalogue of{" "}
          <a href={spotifyArtist.url} target="_blank" rel="noreferrer noopener">
            {spotifyArtist.name}
          </a>
          . Open any of them to play it in Spotify's own player — no audio is copied.
        </p>
      )}

      <div className="toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search songs, Japanese titles or albums…"
            aria-label="Search the music library"
          />
        </label>

        <label className="field-row">
          <span className="field-label">Album</span>
          <select
            className="select"
            value={albumFilter}
            onChange={event => setAlbumFilter(event.target.value)}
          >
            <option value="all">All albums</option>
            {albums.map(album => (
              <option key={album.id} value={album.id}>
                {album.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="song-grid">
          {[0, 1, 2, 3, 4, 5].map(key => (
            <div className="skeleton" key={key} style={{ height: 210 }} />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="song-grid">
          {filtered.map(song => (
            <SongCard key={song.id} song={song} list={filtered} />
          ))}
        </div>
      ) : (
        <EmptyState title="No songs match">
          {songs.length
            ? "Try a different search term or album filter."
            : "Nothing has been published yet. The administrator can publish songs from the Admin Studio."}
        </EmptyState>
      )}
    </div>
  );
}

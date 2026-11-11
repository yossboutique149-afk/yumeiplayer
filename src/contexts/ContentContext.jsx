import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { repo, dataMode } from "../lib/dataClient.js";
import { mergePublicSongs } from "../lib/publicCatalogue.js";
import { useAuth } from "./AuthContext.jsx";

const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const { isStaff } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publicSongs, setPublicSongs] = useState([]);
  const [spotifyArtist, setSpotifyArtist] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const includeDrafts = Boolean(isStaff);
      const [albumRows, songRows] = await Promise.all([
        repo.listAlbums({ includeDrafts }),
        repo.listSongs({ includeDrafts })
      ]);
      setAlbums(albumRows);
      setSongs(songRows);
    } catch (loadError) {
      setError(loadError.message || "Could not load the catalogue.");
      setAlbums([]);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The official Spotify catalogue is served by our own API, so the public
  // site shows the artist's real releases even without Supabase or API keys.
  useEffect(() => {
    let active = true;
    fetch("/api/public/catalogue")
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!active || !data) return;
        if (Array.isArray(data.songs) && data.songs.length) setPublicSongs(data.songs);
        if (data.artist) setSpotifyArtist(data.artist);
      })
      .catch(() => {
        /* Offline or unavailable: the stored catalogue still renders. */
      });
    return () => {
      active = false;
    };
  }, []);

  const allSongs = useMemo(() => mergePublicSongs(songs, publicSongs), [songs, publicSongs]);

  const albumById = useCallback(
    id => albums.find(album => album.id === id) || null,
    [albums]
  );

  const songsForAlbum = useCallback(
    albumId =>
      allSongs
        .filter(song => song.album_id === albumId)
        .sort((a, b) => Number(a.track_number || 0) - Number(b.track_number || 0)),
    [allSongs]
  );

  const value = useMemo(
    () => ({
      albums,
      songs: allSongs,
      spotifyArtist,
      spotifyCount: allSongs.length - songs.length,
      loading,
      error,
      refresh,
      albumById,
      songsForAlbum,
      dataMode,
      isLocalMode: dataMode === "local"
    }),
    [albums, allSongs, songs.length, spotifyArtist, loading, error, refresh, albumById, songsForAlbum]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error("useContent must be used inside ContentProvider");
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { repo, dataMode } from "../lib/dataClient.js";
import { useAuth } from "./AuthContext.jsx";

const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const { isStaff } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const albumById = useCallback(
    id => albums.find(album => album.id === id) || null,
    [albums]
  );

  const songsForAlbum = useCallback(
    albumId =>
      songs
        .filter(song => song.album_id === albumId)
        .sort((a, b) => Number(a.track_number || 0) - Number(b.track_number || 0)),
    [songs]
  );

  const value = useMemo(
    () => ({
      albums,
      songs,
      loading,
      error,
      refresh,
      albumById,
      songsForAlbum,
      dataMode,
      isLocalMode: dataMode === "local"
    }),
    [albums, songs, loading, error, refresh, albumById, songsForAlbum]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error("useContent must be used inside ContentProvider");
  return context;
}

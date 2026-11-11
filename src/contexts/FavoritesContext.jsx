import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { useAuth } from "./AuthContext.jsx";

const FavoritesContext = createContext(null);
const STORAGE_KEY = "yumeika.favorites";

function readLocal() {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(ids) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
}

export function FavoritesProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [ids, setIds] = useState(readLocal);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    writeLocal(ids);
  }, [ids]);

  // When a real account signs in, merge server favourites with this device.
  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated || !user?.id) return;
    let active = true;
    setSyncing(true);
    (async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("song_id")
        .eq("user_id", user.id);
      if (!active || error) {
        setSyncing(false);
        return;
      }
      const serverIds = (data || []).map(row => row.song_id);
      setIds(current => Array.from(new Set([...current, ...serverIds])));
      setSyncing(false);
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id]);

  const isFavorite = useCallback(songId => ids.includes(songId), [ids]);

  const toggle = useCallback(
    songId => {
      if (!songId) return;
      const willAdd = !ids.includes(songId);
      setIds(current =>
        willAdd ? [...current, songId] : current.filter(id => id !== songId)
      );
      if (isSupabaseConfigured && isAuthenticated && user?.id) {
        (async () => {
          if (willAdd) {
            await supabase
              .from("favorites")
              .upsert({ user_id: user.id, song_id: songId }, { onConflict: "user_id,song_id" });
          } else {
            await supabase
              .from("favorites")
              .delete()
              .eq("user_id", user.id)
              .eq("song_id", songId);
          }
        })().catch(() => {});
      }
      return willAdd;
    },
    [ids, isAuthenticated, user?.id]
  );

  const value = useMemo(
    () => ({ ids, isFavorite, toggle, count: ids.length, syncing }),
    [ids, isFavorite, toggle, syncing]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used inside FavoritesProvider");
  return context;
}

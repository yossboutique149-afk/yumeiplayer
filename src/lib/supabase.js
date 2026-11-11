import { createClient } from "@supabase/supabase-js";

/**
 * Only public client values are used here: the anon key is safe to ship in a
 * browser bundle because Row Level Security enforces every rule server-side.
 * The service-role key must never be referenced by client code.
 */
const url = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "yumeika.auth"
      }
    })
  : null;

export const STORAGE_BUCKETS = {
  audio: "yumeika-audio",
  artwork: "yumeika-artwork"
};

export const ROLE_LABELS = {
  admin: "Administrator",
  editor: "Editor",
  viewer: "Viewer"
};

export function canManage(role) {
  return role === "admin" || role === "editor";
}

export function canDelete(role) {
  return role === "admin";
}

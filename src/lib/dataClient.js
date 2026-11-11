import { supabase, isSupabaseConfigured, STORAGE_BUCKETS } from "./supabase.js";
import { readStore, writeStore, resetStore, newId } from "./localStore.js";
import { slugify } from "./format.js";

/**
 * Single repository used by every page. It talks to Supabase when the project
 * is configured, and otherwise to a local demo store so the whole interface
 * stays clickable before credentials exist. Row Level Security is what keeps
 * the Supabase path safe; the local path never leaves the browser.
 */
export const dataMode = isSupabaseConfigured ? "supabase" : "local";
export const isLocalMode = dataMode === "local";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clean = values => {
  const output = {};
  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    output[key] = value;
  });
  return output;
};

const visible = (row, includeDrafts) =>
  includeDrafts ? true : row.status === "published";

const byTrack = (a, b) => asNumber(a.track_number) - asNumber(b.track_number);

/* ------------------------------------------------------------------ *
 * Supabase adapter
 * ------------------------------------------------------------------ */
const supabaseAdapter = {
  async listAlbums({ includeDrafts = false } = {}) {
    let query = supabase.from("albums").select("*").order("created_at", { ascending: true });
    if (!includeDrafts) query = query.eq("status", "published");
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getAlbumBySlug(slug, { includeDrafts = false } = {}) {
    let query = supabase.from("albums").select("*").eq("slug", slug);
    if (!includeDrafts) query = query.eq("status", "published");
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  },

  async listSongs({ includeDrafts = false, albumId = null } = {}) {
    let query = supabase.from("songs").select("*").order("track_number", { ascending: true });
    if (!includeDrafts) query = query.eq("status", "published");
    if (albumId) query = query.eq("album_id", albumId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).sort(byTrack);
  },

  async getSongBySlug(slug, { includeDrafts = false } = {}) {
    let query = supabase.from("songs").select("*").eq("slug", slug);
    if (!includeDrafts) query = query.eq("status", "published");
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  },

  async getSongBundle(song, { includeDrafts = false } = {}) {
    if (!song) return { song: null, lines: [], vocabulary: [], analysis: null };
    const [linesResult, vocabResult, analysisResult] = await Promise.all([
      supabase.from("lyric_lines").select("*").eq("song_id", song.id).order("line_index"),
      supabase.from("vocabulary").select("*").eq("song_id", song.id).order("line_index"),
      supabase.from("song_analyses").select("*").eq("song_id", song.id).maybeSingle()
    ]);
    if (linesResult.error) throw new Error(linesResult.error.message);
    if (vocabResult.error) throw new Error(vocabResult.error.message);
    if (analysisResult.error) throw new Error(analysisResult.error.message);
    return {
      song,
      lines: linesResult.data || [],
      vocabulary: vocabResult.data || [],
      analysis: analysisResult.data || null
    };
  },

  async saveAlbum(values) {
    const payload = clean({
      ...values,
      slug: values.slug || slugify(values.title)
    });
    const { id, ...rest } = payload;
    const query = id
      ? supabase.from("albums").update(rest).eq("id", id)
      : supabase.from("albums").insert(rest);
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteAlbum(id) {
    const { error } = await supabase.from("albums").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },

  async saveSong(values) {
    const payload = clean({
      ...values,
      slug: values.slug || slugify(values.title),
      track_number: asNumber(values.track_number, 1),
      duration_seconds: asNumber(values.duration_seconds, 0)
    });
    const { id, ...rest } = payload;
    const query = id
      ? supabase.from("songs").update(rest).eq("id", id)
      : supabase.from("songs").insert(rest);
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteSong(id) {
    const { error } = await supabase.from("songs").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },

  async saveLyricLines(songId, lines) {
    const rows = (lines || []).map((line, index) => ({
      song_id: songId,
      line_index: index,
      original: line.original || "",
      romanization: line.romanization || "",
      translation: line.translation || "",
      pronunciation: line.pronunciation || "",
      start_ms: line.start_ms === "" || line.start_ms === null ? null : asNumber(line.start_ms, null),
      end_ms: line.end_ms === "" || line.end_ms === null ? null : asNumber(line.end_ms, null)
    }));
    const { error: deleteError } = await supabase.from("lyric_lines").delete().eq("song_id", songId);
    if (deleteError) throw new Error(deleteError.message);
    if (!rows.length) return [];
    const { data, error } = await supabase.from("lyric_lines").insert(rows).select();
    if (error) throw new Error(error.message);
    return data || [];
  },

  async saveVocabulary(songId, entries) {
    const rows = (entries || [])
      .filter(entry => entry.term)
      .map((entry, index) => ({
        song_id: songId,
        term: entry.term,
        reading: entry.reading || "",
        romaji: entry.romaji || "",
        meaning: entry.meaning || "",
        notes: entry.notes || "",
        line_index: entry.line_index === "" || entry.line_index === null
          ? index
          : asNumber(entry.line_index, index)
      }));
    const { error: deleteError } = await supabase.from("vocabulary").delete().eq("song_id", songId);
    if (deleteError) throw new Error(deleteError.message);
    if (!rows.length) return [];
    const { data, error } = await supabase.from("vocabulary").insert(rows).select();
    if (error) throw new Error(error.message);
    return data || [];
  },

  async saveAnalysis(songId, values) {
    const payload = {
      song_id: songId,
      meaning: values.meaning || "",
      pronunciation_guide: values.pronunciation_guide || "",
      story: values.story || "",
      verses: values.verses || "",
      metaphors: values.metaphors || "",
      symbolism: values.symbolism || "",
      emotions: values.emotions || "",
      production: values.production || "",
      themes: values.themes || "",
      connections: values.connections || "",
      is_ai_generated: Boolean(values.is_ai_generated),
      disclaimer: values.disclaimer || "",
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("song_analyses")
      .upsert(payload, { onConflict: "song_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async uploadAsset(file, { bucket = STORAGE_BUCKETS.artwork, folder = "uploads" } = {}) {
    const safeName = String(file.name || "asset").replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${folder}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data?.publicUrl || "", path };
  },

  async getStats() {
    const count = async (table, apply) => {
      let query = supabase.from(table).select("*", { count: "exact", head: true });
      if (apply) query = apply(query);
      const { count: value, error } = await query;
      if (error) return 0;
      return value || 0;
    };
    const [albums, songs, published, drafts, lines, analyses, vocabulary] = await Promise.all([
      count("albums"),
      count("songs"),
      count("songs", q => q.eq("status", "published")),
      count("songs", q => q.eq("status", "draft")),
      count("lyric_lines"),
      count("song_analyses"),
      count("vocabulary")
    ]);
    return { albums, songs, published, drafts, lines, analyses, vocabulary };
  },

  async resetLocalData() {
    return false;
  }
};

/* ------------------------------------------------------------------ *
 * Local demo adapter
 * ------------------------------------------------------------------ */
const localAdapter = {
  async listAlbums({ includeDrafts = false } = {}) {
    return readStore().albums.filter(row => visible(row, includeDrafts));
  },

  async getAlbumBySlug(slug, { includeDrafts = false } = {}) {
    return (
      readStore().albums.find(
        row => row.slug === slug && visible(row, includeDrafts)
      ) || null
    );
  },

  async listSongs({ includeDrafts = false, albumId = null } = {}) {
    return readStore()
      .songs.filter(row => visible(row, includeDrafts))
      .filter(row => (albumId ? row.album_id === albumId : true))
      .sort(byTrack);
  },

  async getSongBySlug(slug, { includeDrafts = false } = {}) {
    return (
      readStore().songs.find(
        row => row.slug === slug && visible(row, includeDrafts)
      ) || null
    );
  },

  async getSongBundle(song) {
    if (!song) return { song: null, lines: [], vocabulary: [], analysis: null };
    const store = readStore();
    return {
      song,
      lines: store.lyric_lines
        .filter(line => line.song_id === song.id)
        .sort((a, b) => asNumber(a.line_index) - asNumber(b.line_index)),
      vocabulary: store.vocabulary
        .filter(entry => entry.song_id === song.id)
        .sort((a, b) => asNumber(a.line_index) - asNumber(b.line_index)),
      analysis: store.analyses.find(item => item.song_id === song.id) || null
    };
  },

  async saveAlbum(values) {
    const store = readStore();
    const id = values.id || newId("album");
    const record = {
      ...values,
      id,
      slug: values.slug || slugify(values.title),
      created_at: values.created_at || new Date().toISOString()
    };
    const index = store.albums.findIndex(item => item.id === id);
    if (index >= 0) store.albums[index] = { ...store.albums[index], ...record };
    else store.albums.push(record);
    writeStore(store);
    return record;
  },

  async deleteAlbum(id) {
    const store = readStore();
    const songIds = store.songs.filter(song => song.album_id === id).map(song => song.id);
    store.albums = store.albums.filter(item => item.id !== id);
    store.songs = store.songs.filter(song => song.album_id !== id);
    store.lyric_lines = store.lyric_lines.filter(line => !songIds.includes(line.song_id));
    store.vocabulary = store.vocabulary.filter(item => !songIds.includes(item.song_id));
    store.analyses = store.analyses.filter(item => !songIds.includes(item.song_id));
    writeStore(store);
    return true;
  },

  async saveSong(values) {
    const store = readStore();
    const id = values.id || newId("song");
    const record = {
      ...values,
      id,
      slug: values.slug || slugify(values.title),
      track_number: asNumber(values.track_number, 1),
      duration_seconds: asNumber(values.duration_seconds, 0),
      created_at: values.created_at || new Date().toISOString()
    };
    const index = store.songs.findIndex(item => item.id === id);
    if (index >= 0) store.songs[index] = { ...store.songs[index], ...record };
    else store.songs.push(record);
    writeStore(store);
    return record;
  },

  async deleteSong(id) {
    const store = readStore();
    store.songs = store.songs.filter(item => item.id !== id);
    store.lyric_lines = store.lyric_lines.filter(line => line.song_id !== id);
    store.vocabulary = store.vocabulary.filter(item => item.song_id !== id);
    store.analyses = store.analyses.filter(item => item.song_id !== id);
    writeStore(store);
    return true;
  },

  async saveLyricLines(songId, lines) {
    const store = readStore();
    const rows = (lines || []).map((line, index) => ({
      id: line.id || newId("line"),
      song_id: songId,
      line_index: index,
      original: line.original || "",
      romanization: line.romanization || "",
      translation: line.translation || "",
      pronunciation: line.pronunciation || "",
      start_ms: line.start_ms === "" || line.start_ms === null ? null : asNumber(line.start_ms, null),
      end_ms: line.end_ms === "" || line.end_ms === null ? null : asNumber(line.end_ms, null)
    }));
    store.lyric_lines = [...store.lyric_lines.filter(line => line.song_id !== songId), ...rows];
    writeStore(store);
    return rows;
  },

  async saveVocabulary(songId, entries) {
    const store = readStore();
    const rows = (entries || [])
      .filter(entry => entry.term)
      .map((entry, index) => ({
        id: entry.id || newId("vocab"),
        song_id: songId,
        term: entry.term,
        reading: entry.reading || "",
        romaji: entry.romaji || "",
        meaning: entry.meaning || "",
        notes: entry.notes || "",
        line_index: entry.line_index === "" || entry.line_index === null
          ? index
          : asNumber(entry.line_index, index)
      }));
    store.vocabulary = [...store.vocabulary.filter(item => item.song_id !== songId), ...rows];
    writeStore(store);
    return rows;
  },

  async saveAnalysis(songId, values) {
    const store = readStore();
    const record = {
      song_id: songId,
      meaning: values.meaning || "",
      pronunciation_guide: values.pronunciation_guide || "",
      story: values.story || "",
      verses: values.verses || "",
      metaphors: values.metaphors || "",
      symbolism: values.symbolism || "",
      emotions: values.emotions || "",
      production: values.production || "",
      themes: values.themes || "",
      connections: values.connections || "",
      is_ai_generated: Boolean(values.is_ai_generated),
      disclaimer: values.disclaimer || "",
      updated_at: new Date().toISOString()
    };
    const index = store.analyses.findIndex(item => item.song_id === songId);
    if (index >= 0) store.analyses[index] = record;
    else store.analyses.push(record);
    writeStore(store);
    return record;
  },

  async uploadAsset(file, { folder = "uploads" } = {}) {
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(
        "Demo mode stores files in the browser (2 MB limit). Connect Supabase to upload larger audio or artwork."
      );
    }
    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the selected file."));
      reader.readAsDataURL(file);
    });
    return { url, path: `${folder}/${file.name}` };
  },

  async getStats() {
    const store = readStore();
    return {
      albums: store.albums.length,
      songs: store.songs.length,
      published: store.songs.filter(song => song.status === "published").length,
      drafts: store.songs.filter(song => song.status === "draft").length,
      lines: store.lyric_lines.length,
      analyses: store.analyses.length,
      vocabulary: store.vocabulary.length
    };
  },

  async resetLocalData() {
    resetStore();
    return true;
  }
};

export const repo = isSupabaseConfigured ? supabaseAdapter : localAdapter;

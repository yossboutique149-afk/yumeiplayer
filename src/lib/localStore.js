import {
  sampleAlbums,
  sampleSongs,
  sampleLyricLines,
  sampleVocabulary,
  sampleAnalyses
} from "../data/sample.js";

const STORAGE_KEY = "yumeika.local.v2";

function seed() {
  return {
    version: 2,
    albums: sampleAlbums.map(item => ({ ...item })),
    songs: sampleSongs.map(item => ({ ...item })),
    lyric_lines: sampleLyricLines.map(item => ({ ...item })),
    vocabulary: sampleVocabulary.map(item => ({ ...item })),
    analyses: sampleAnalyses.map(item => ({ ...item })),
    playlists: []
  };
}

export function emptyStore() {
  return {
    version: 2,
    albums: [],
    songs: [],
    lyric_lines: [],
    vocabulary: [],
    analyses: [],
    playlists: []
  };
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...emptyStore(),
      ...parsed,
      albums: Array.isArray(parsed.albums) ? parsed.albums : [],
      songs: Array.isArray(parsed.songs) ? parsed.songs : [],
      lyric_lines: Array.isArray(parsed.lyric_lines) ? parsed.lyric_lines : [],
      vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
      analyses: Array.isArray(parsed.analyses) ? parsed.analyses : [],
      playlists: Array.isArray(parsed.playlists) ? parsed.playlists : []
    };
  } catch {
    return null;
  }
}

export function readStore() {
  if (typeof localStorage === "undefined") return seed();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seed();
    writeStore(initial);
    return initial;
  }
  return safeParse(raw) || seed();
}

export function writeStore(store) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn("YUMEIKA local store is full:", error?.message);
  }
}

export function updateStore(mutator) {
  const store = readStore();
  const next = mutator(store) || store;
  writeStore(next);
  return next;
}

export function resetStore() {
  const initial = seed();
  writeStore(initial);
  return initial;
}

export function newId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

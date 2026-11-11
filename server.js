import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const DIST_DIR = path.join(__dirname, "dist");

const catalogPath = path.join(DATA_DIR, "catalog.json");
const lyricsPath = path.join(DATA_DIR, "lyrics.json");

const DEFAULTS = new Map([
  [catalogPath, { albums: [], youtube: [], lastSync: null }],
  [lyricsPath, { songs: [] }]
]);

app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));

function saveJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensureDataFiles() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const [file, value] of DEFAULTS) {
      if (!fs.existsSync(file)) saveJSON(file, value);
    }
  } catch (error) {
    console.error("Data directory not writable:", error.message);
  }
}

function readJSON(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readCatalog() {
  const data = readJSON(catalogPath);
  return {
    albums: Array.isArray(data.albums) ? data.albums : [],
    youtube: Array.isArray(data.youtube) ? data.youtube : [],
    lastSync: typeof data.lastSync === "string" ? data.lastSync : null
  };
}

function readLyrics() {
  const data = readJSON(lyricsPath);
  return { songs: Array.isArray(data.songs) ? data.songs : [] };
}

/* ------------------------------------------------------------------ *
 * Admin authentication
 * ------------------------------------------------------------------ */

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function throttled(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(ip, { first: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(503).json({
      error: "El panel no está configurado: falta la variable ADMIN_PASSWORD."
    });
  }
  if (throttled(req.ip)) {
    return res
      .status(429)
      .json({ error: "Demasiados intentos. Espera unos minutos." });
  }
  const provided = req.headers["x-admin-password"] || "";
  if (!safeEqual(provided, expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* ------------------------------------------------------------------ *
 * Official catalog sources
 * ------------------------------------------------------------------ */

async function spotifyToken() {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error("Spotify authentication failed");
  }

  const data = await response.json();
  return data.access_token;
}

async function syncSpotify() {
  const token = await spotifyToken();
  const artistId = process.env.SPOTIFY_ARTIST_ID || "4rvqZA6szL4nbRkoN7soB1";

  const response = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    throw new Error("Spotify catalog request failed");
  }

  const data = await response.json();

  return (data.items || []).map(album => ({
    id: album.id,
    kind: "spotify",
    name: album.name,
    image: album.images?.[0]?.url || "",
    releaseDate: album.release_date || "",
    totalTracks: album.total_tracks || 0,
    spotifyUrl: album.external_urls?.spotify || "",
    embedUrl: `https://open.spotify.com/embed/album/${album.id}`
  }));
}

async function syncYouTube() {
  const key = process.env.YOUTUBE_API_KEY;
  const channel = process.env.YOUTUBE_CHANNEL_ID || "UCx9lIvfBGqQOjy--SpFHnsA";

  if (!key) throw new Error("YOUTUBE_API_KEY is not configured");

  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel}&maxResults=50&order=date&type=video&key=${key}`
  );

  if (!searchResponse.ok) {
    throw new Error("YouTube catalog request failed");
  }

  const searchData = await searchResponse.json();

  return (searchData.items || [])
    .filter(item => item?.id?.videoId)
    .map(item => ({
      id: item.id.videoId,
      kind: "youtube",
      name: item.snippet.title,
      image: item.snippet.thumbnails?.high?.url || "",
      releaseDate: item.snippet.publishedAt || "",
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`
    }));
}

/* ------------------------------------------------------------------ *
 * API
 * ------------------------------------------------------------------ */

app.get("/api/catalog", (req, res) => {
  res.json(readCatalog());
});

app.get("/api/lyrics", (req, res) => {
  res.json(readLyrics());
});

app.get("/api/health", (req, res) => {
  res.json({ status: "online", service: "YUMEIKA API" });
});

app.get("/api/config", (req, res) => {
  res.json({
    adminConfigured: Boolean(process.env.ADMIN_PASSWORD),
    spotifyConfigured: Boolean(
      process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
    ),
    youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY)
  });
});

app.post("/api/auth", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.post("/api/sync", requireAdmin, async (req, res) => {
  const previous = readCatalog();
  const warnings = [];
  let albums = previous.albums;
  let youtube = previous.youtube;

  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    try {
      albums = await syncSpotify();
    } catch (error) {
      warnings.push(`Spotify: ${error.message}`);
    }
  } else {
    warnings.push("Spotify: faltan SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.");
  }

  if (process.env.YOUTUBE_API_KEY) {
    try {
      youtube = await syncYouTube();
    } catch (error) {
      warnings.push(`YouTube: ${error.message}`);
    }
  } else {
    warnings.push("YouTube: falta YOUTUBE_API_KEY.");
  }

  const result = {
    albums,
    youtube,
    lastSync: new Date().toISOString()
  };

  try {
    saveJSON(catalogPath, result);
  } catch (error) {
    return res
      .status(500)
      .json({ error: `No se pudo guardar el catálogo: ${error.message}` });
  }

  res.json({ ...result, warnings });
});

app.post("/api/lyrics", requireAdmin, (req, res) => {
  const { id, title, album, original, translation, romanization, analysis } =
    req.body || {};

  if (!id || !title) {
    return res.status(400).json({ error: "Song ID and title required" });
  }

  const data = readLyrics();
  const songs = data.songs;
  const index = songs.findIndex(song => song.id === id);

  const song = {
    id: String(id).trim(),
    title: String(title).trim(),
    album: album || "",
    original: original || "",
    translation: translation || "",
    romanization: romanization || "",
    analysis: analysis || ""
  };

  if (index >= 0) {
    songs[index] = song;
  } else {
    songs.push(song);
  }

  try {
    saveJSON(lyricsPath, { songs });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `No se pudo guardar la letra: ${error.message}` });
  }

  res.json({ success: true, song });
});

app.delete("/api/lyrics/:id", requireAdmin, (req, res) => {
  const data = readLyrics();
  const songs = data.songs.filter(song => song.id !== req.params.id);

  try {
    saveJSON(lyricsPath, { songs });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `No se pudo guardar la letra: ${error.message}` });
  }

  res.json({ success: true, songs });
});

/* ------------------------------------------------------------------ *
 * Static client
 * ------------------------------------------------------------------ */

app.use(express.static(DIST_DIR, { index: false }));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const indexFile = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(indexFile)) {
    return res
      .status(503)
      .type("text/plain")
      .send("YUMEIKA: ejecuta `npm run build` para generar el cliente.");
  }
  res.sendFile(indexFile);
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

ensureDataFiles();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`YUMEIKA API running on port ${PORT}`);
});

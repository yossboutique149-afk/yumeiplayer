import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import { buildStudyPrompt, normalizeStudy, isStudyEmpty, STUDY_DISCLAIMER } from "./src/lib/study.js";
import { spotifyImportPayload, summarizeImport } from "./src/lib/spotify.js";
import {
  DEFAULT_ARTIST_ID,
  buildPublicSongs,
  isArtistId,
  parseSpotifyEmbed,
  spotifyArtistEmbedUrl
} from "./src/lib/publicCatalogue.js";
import {
  AI_KEY_VARS,
  aiErrorHint,
  buildAIRequest,
  describeAIProvider,
  readAIResponse,
  resolveAIProvider
} from "./src/lib/aiProviders.js";
import {
  ALLOWED_AUDIO_EXT,
  MAX_AUDIO_BYTES,
  backupFilename,
  isAllowedAudio,
  mimeForName,
  sanitizeFilename
} from "./src/lib/audioFile.js";

dotenv.config();

/**
 * Production server for YUMEIKA — THE MUSIC UNIVERSE.
 *
 * The public client is a Vite build in dist/ and most content is read from
 * Supabase in the browser. This process serves that build and hosts the two
 * privileged integrations that must never run in the browser:
 *
 *   POST /api/spotify/import  — pulls the artist catalogue from Spotify
 *   POST /api/ai/study        — generates lyrics study material with an AI model
 *
 * Both require the studio password (ADMIN_PASSWORD) and their own credentials.
 * Secrets stay in this process; only booleans are exposed by /api/integrations/status.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const HOST = "0.0.0.0";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API = "https://api.spotify.com/v1";


function env(name) {
  return String(process.env[name] || "").trim();
}

function hasSpotify() {
  return Boolean(env("SPOTIFY_CLIENT_ID") && env("SPOTIFY_CLIENT_SECRET"));
}

function spotifyArtistId(body) {
  return String(body?.artistId || env("SPOTIFY_ARTIST_ID") || "4rvqZA6szL4nbRkoN7soB1").trim();
}

function missingEnv(res, error, missing, hint) {
  return res.status(503).json({ error, missing, hint });
}

/** Constant-time comparison of the studio password. */
function adminGate(req, res, next) {
  const expected = env("ADMIN_PASSWORD");
  if (!expected) {
    return missingEnv(
      res,
      "The studio password is not configured on the server.",
      ["ADMIN_PASSWORD"],
      "Add ADMIN_PASSWORD to the hosting environment variables, then restart the app."
    );
  }
  const given = String(req.get("x-admin-password") || "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Wrong studio password." });
  }
  next();
}

async function spotifyToken() {
  const credentials = Buffer.from(
    `${env("SPOTIFY_CLIENT_ID")}:${env("SPOTIFY_CLIENT_SECRET")}`
  ).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Spotify authentication failed (${response.status}). Check the client ID and secret.`);
  }
  const data = await response.json();
  return data.access_token;
}

async function spotifyArtistAlbums(token, artistId) {
  const albums = [];
  let url =
    `${SPOTIFY_API}/artists/${encodeURIComponent(artistId)}/albums` +
    "?include_groups=album,single,compilation&limit=20&market=US";

  for (let page = 0; page < 3 && url; page += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? "Spotify artist not found. Check SPOTIFY_ARTIST_ID."
          : `Spotify catalogue request failed (${response.status}).`
      );
    }
    const data = await response.json();
    albums.push(...(data.items || []));
    url = data.next || "";
  }

  return albums;
}

async function spotifyAlbumTracks(token, albumId) {
  const response = await fetch(
    `${SPOTIFY_API}/albums/${encodeURIComponent(albumId)}/tracks?limit=100`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (data.items || []).map(track => ({
    id: track.id,
    name: track.name,
    track_number: track.track_number,
    duration_ms: track.duration_ms,
    external_urls: track.external_urls
  }));
}

function parseModelJson(content) {
  const raw = String(content || "").trim();
  const withoutFence = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }
    throw new Error("The AI response was not valid JSON.");
  }
}

async function requestStudy({ song, language, notes }) {
  const { system, user } = buildStudyPrompt({ song, language, notes });
  const provider = resolveAIProvider(env);
  if (!provider) throw new Error("No AI provider is configured.");

  const { url, init } = buildAIRequest({ provider, system, user });
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(90000) });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const hint = aiErrorHint(provider, response.status);
    throw new Error(
      `The AI provider rejected the request (${response.status}). ${
        hint || detail.slice(0, 180)
      }`.trim()
    );
  }

  const data = await response.json();
  const content = readAIResponse(provider.kind, data);
  if (!content) {
    throw new Error("The AI provider returned an empty message.");
  }

  return {
    study: normalizeStudy(parseModelJson(content)),
    model: provider.model,
    provider: provider.label
  };
}

export function createApp() {
  const app = express();

  /* Audio uploads and restores carry base64 files, so those routes parse their own body. */
  const smallJson = express.json({ limit: "1mb" });
  const largeBodyRoutes = new Set(["/api/audio", "/api/audio/restore"]);
  app.use((req, res, next) => {
    if (req.method === "POST" && largeBodyRoutes.has(req.path)) return next();
    return smallJson(req, res, next);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "online", service: "YUMEIKA API" });
  });

  /* ---------------------------------------------------------------- *
   * Public artist catalogue — no credentials required
   * ---------------------------------------------------------------- */
  const PUBLIC_CATALOGUE_TTL_MS = 30 * 60 * 1000;
  const publicCatalogueCache = { artistId: "", at: 0, payload: null };
  const publicCatalogueFile = path.join(__dirname, "data/artist-catalogue.json");

  function readPublicCatalogueFile() {
    try {
      return JSON.parse(fs.readFileSync(publicCatalogueFile, "utf8"));
    } catch {
      return null;
    }
  }

  function writePublicCatalogueFile(payload) {
    try {
      fs.mkdirSync(path.dirname(publicCatalogueFile), { recursive: true });
      fs.writeFileSync(publicCatalogueFile, JSON.stringify(payload, null, 2));
    } catch {
      /* A read-only filesystem is fine: the memory cache still serves it. */
    }
  }

  async function fetchPublicArtistCatalogue(artistId) {
    const response = await fetch(spotifyArtistEmbedUrl(artistId), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Spotify public catalogue unavailable (${response.status}).`);
    }

    const artist = parseSpotifyEmbed(await response.text());
    const songs = buildPublicSongs(artist);
    if (!songs.length) throw new Error("Spotify returned no tracks for this artist.");
    return { artist, songs };
  }

  /**
   * GET /api/public/catalogue
   *
   * Public and credential-free: the artist's real titles, artwork and
   * durations come from Spotify's public embed, so the site is never empty
   * just because the studio has no Web API key. Audio is never copied — each
   * track keeps Spotify's official player. Cached in memory and on disk, so
   * the catalogue survives Spotify being briefly unreachable.
   */
  app.get("/api/public/catalogue", async (req, res) => {
    const requested = String(
      req.query.artistId || env("SPOTIFY_ARTIST_ID") || DEFAULT_ARTIST_ID
    ).trim();
    const artistId = isArtistId(requested) ? requested : DEFAULT_ARTIST_ID;
    const now = Date.now();

    if (
      publicCatalogueCache.payload &&
      publicCatalogueCache.artistId === artistId &&
      now - publicCatalogueCache.at < PUBLIC_CATALOGUE_TTL_MS
    ) {
      res.set("Cache-Control", "public, max-age=300");
      return res.json({ ...publicCatalogueCache.payload, cached: true });
    }

    try {
      const { artist, songs } = await fetchPublicArtistCatalogue(artistId);
      const payload = {
        artistId,
        artist,
        songs,
        fetchedAt: new Date().toISOString(),
        source: "spotify-embed"
      };
      publicCatalogueCache.artistId = artistId;
      publicCatalogueCache.at = now;
      publicCatalogueCache.payload = payload;
      writePublicCatalogueFile(payload);
      res.set("Cache-Control", "public, max-age=300");
      return res.json({ ...payload, cached: false });
    } catch (error) {
      const stored = readPublicCatalogueFile();
      if (stored && Array.isArray(stored.songs) && stored.songs.length) {
        res.set("Cache-Control", "public, max-age=60");
        return res.json({ ...stored, cached: true, stale: true, warning: error.message });
      }
      return res.json({
        artistId,
        artist: null,
        songs: [],
        fetchedAt: null,
        source: "unavailable",
        warning: error.message
      });
    }
  });

  /** Public: tells the Studio which integrations exist, never the secrets. */
  app.get("/api/integrations/status", (req, res) => {
    res.json({
      spotify: { configured: hasSpotify(), artistId: env("SPOTIFY_ARTIST_ID") },
      ai: describeAIProvider(resolveAIProvider(env)),
      adminGate: { configured: Boolean(env("ADMIN_PASSWORD")) }
    });
  });

  app.post("/api/spotify/import", adminGate, async (req, res) => {
    if (!hasSpotify()) {
      return missingEnv(
        res,
        "Spotify is not configured on the server.",
        ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
        "Create an app in the Spotify Developer Dashboard and add both values to the hosting environment."
      );
    }

    try {
      const artistId = spotifyArtistId(req.body);
      const token = await spotifyToken();
      const albums = await spotifyArtistAlbums(token, artistId);

      const withTracks = await Promise.all(
        albums.slice(0, 20).map(async album => {
          const items = await spotifyAlbumTracks(token, album.id);
          return { ...album, tracks: { items } };
        })
      );

      const entries = spotifyImportPayload(withTracks);
      res.json({
        ok: true,
        artistId,
        albums: entries,
        summary: summarizeImport(entries),
        importedAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(502).json({ error: error.message || "Spotify import failed." });
    }
  });

  app.post("/api/ai/study", adminGate, async (req, res) => {
    if (!resolveAIProvider(env)) {
      return missingEnv(
        res,
        "The AI writer is not configured on the server.",
        ["AI_API_KEY"],
        `Add any supported provider key to the hosting environment: ${AI_KEY_VARS.join(", ")}. AI_API_KEY means any OpenAI-compatible endpoint (optional AI_MODEL / AI_BASE_URL).`
      );
    }

    const song = req.body?.song || {};
    if (!String(song.title || "").trim()) {
      return res.status(400).json({ error: "A song title is required." });
    }

    try {
      const { study, model, provider } = await requestStudy({
        song,
        language: req.body?.language || "ja",
        notes: req.body?.notes || ""
      });

      if (isStudyEmpty(study)) {
        return res.status(502).json({ error: "The AI returned an empty study. Try again." });
      }

      res.json({
        ok: true,
        model,
        provider,
        study: { ...study, disclaimer: study.disclaimer || STUDY_DISCLAIMER },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(502).json({ error: error.message || "Study generation failed." });
    }
  });

  /* ---------------------------------------------------------------- *
   * Audio library — the app plays its own files
   * ---------------------------------------------------------------- */
  const audioDir = path.join(__dirname, "data/audio");

  function ensureAudioDir() {
    try {
      fs.mkdirSync(audioDir, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  function listAudioFiles() {
    try {
      return fs
        .readdirSync(audioDir)
        .filter(name => isAllowedAudio(name))
        .map(name => {
          const stat = fs.statSync(path.join(audioDir, name));
          return {
            name,
            url: `/audio/${encodeURIComponent(name)}`,
            size: stat.size,
            modified: stat.mtime.toISOString()
          };
        })
        .sort((a, b) => String(b.modified).localeCompare(String(a.modified)));
    } catch {
      return [];
    }
  }

  function decodeAudioPayload(data) {
    const raw = String(data || "");
    if (!raw) return null;
    const base64 = raw.startsWith("data:") ? raw.slice(raw.indexOf(",") + 1) : raw;
    if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) return null;
    const buffer = Buffer.from(base64, "base64");
    return buffer.length ? buffer : null;
  }

  /** Public list of stored files so the Studio can reuse an existing upload. */
  app.get("/api/audio", (req, res) => {
    res.json({
      files: listAudioFiles(),
      maxBytes: MAX_AUDIO_BYTES,
      extensions: ALLOWED_AUDIO_EXT
    });
  });

  /**
   * POST /api/audio
   *
   * Stores an uploaded track on the server and returns the URL the player and
   * the download button use. Admin only: visitors can stream and download, but
   * never add or replace files.
   */
  app.post("/api/audio", adminGate, express.json({ limit: "40mb" }), (req, res) => {
    const name = sanitizeFilename(req.body?.filename || "track.mp3");
    if (!isAllowedAudio(name, req.body?.mime)) {
      return res.status(400).json({
        error: `Unsupported audio type. Allowed: ${ALLOWED_AUDIO_EXT.join(", ")}`
      });
    }

    const buffer = decodeAudioPayload(req.body?.data);
    if (!buffer) {
      return res.status(400).json({ error: "The audio file could not be read." });
    }
    if (buffer.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({
        error: `That file is larger than ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))} MB.`
      });
    }
    if (!ensureAudioDir()) {
      return res.status(503).json({ error: "The server cannot store audio files right now." });
    }

    const stored = `${Date.now()}-${name}`;
    try {
      fs.writeFileSync(path.join(audioDir, stored), buffer);
    } catch (error) {
      return res.status(503).json({ error: error.message || "The audio file could not be saved." });
    }

    return res.status(201).json({
      ok: true,
      name: stored,
      url: `/audio/${encodeURIComponent(stored)}`,
      size: buffer.length
    });
  });

  app.delete("/api/audio/:name", adminGate, (req, res) => {
    const name = sanitizeFilename(req.params.name);
    const target = path.join(audioDir, name);
    if (!target.startsWith(audioDir) || !fs.existsSync(target)) {
      return res.status(404).json({ error: "Audio file not found." });
    }
    try {
      fs.unlinkSync(target);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/audio/backup
   *
   * Admin only. A deployed container is replaced on every redeploy, so the
   * Studio downloads one JSON file with every stored track and can put the
   * whole library back with a single click.
   */
  app.get("/api/audio/backup", adminGate, (req, res) => {
    ensureAudioDir();

    const files = [];
    listAudioFiles().forEach(entry => {
      try {
        const data = fs.readFileSync(path.join(audioDir, entry.name)).toString("base64");
        files.push({ name: entry.name, size: entry.size, mime: mimeForName(entry.name), data });
      } catch {
        /* a file that disappeared while listing is simply left out */
      }
    });

    const createdAt = new Date().toISOString();
    res.set("Content-Disposition", `attachment; filename="${backupFilename(createdAt)}"`);
    res.json({
      app: "yumeika-audio-backup",
      version: 1,
      createdAt,
      totalBytes: files.reduce((sum, file) => sum + file.size, 0),
      files
    });
  });

  /**
   * POST /api/audio/restore
   *
   * Admin only. Writes the tracks of a previous backup back under their
   * original names, so the audio URLs already saved on the songs keep
   * working without editing anything.
   */
  app.post("/api/audio/restore", adminGate, express.json({ limit: "120mb" }), (req, res) => {
    const incoming = Array.isArray(req.body?.files) ? req.body.files : [];
    if (!incoming.length) {
      return res.status(400).json({ error: "That backup file contains no audio." });
    }
    if (!ensureAudioDir()) {
      return res.status(503).json({ error: "The server cannot store audio files right now." });
    }

    const restored = [];
    const skipped = [];

    incoming.slice(0, 300).forEach(entry => {
      const name = sanitizeFilename(String(entry?.name || ""));
      if (!name || !isAllowedAudio(name)) {
        skipped.push({ name: String(entry?.name || ""), reason: "unsupported type" });
        return;
      }
      const buffer = decodeAudioPayload(entry?.data);
      if (!buffer) {
        skipped.push({ name, reason: "unreadable audio data" });
        return;
      }
      if (buffer.length > MAX_AUDIO_BYTES) {
        skipped.push({ name, reason: "larger than the audio limit" });
        return;
      }
      try {
        fs.writeFileSync(path.join(audioDir, name), buffer);
        restored.push({ name, url: `/audio/${encodeURIComponent(name)}`, size: buffer.length });
      } catch (error) {
        skipped.push({ name, reason: error.message || "could not be written" });
      }
    });

    return res.json({ ok: true, restored, skipped, total: restored.length });
  });

  /**
   * GET /audio/:name
   *
   * Streams the stored track. Accept-Ranges lets the browser seek inside a
   * song, and ?download=<filename> turns the same URL into a real download.
   */
  app.get("/audio/:name", (req, res) => {
    const name = sanitizeFilename(req.params.name);
    if (!isAllowedAudio(name)) return res.status(404).send("Not found");
    const target = path.join(audioDir, name);
    if (!target.startsWith(audioDir) || !fs.existsSync(target)) {
      return res.status(404).send("Not found");
    }
    res.type(mimeForName(name));
    res.set("Accept-Ranges", "bytes");
    res.set("Cache-Control", "public, max-age=3600");
    if (req.query.download !== undefined) {
      const label = sanitizeFilename(String(req.query.download || name)) || name;
      res.set("Content-Disposition", `attachment; filename="${label}"`);
    }
    return res.sendFile(target);
  });

  const dist = path.join(__dirname, "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  return app;
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  createApp().listen(PORT, HOST, () => {
    console.log(`YUMEIKA server listening on http://${HOST}:${PORT}`);
  });
}

export default createApp;

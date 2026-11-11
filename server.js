import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import { buildStudyPrompt, normalizeStudy, isStudyEmpty, STUDY_DISCLAIMER } from "./src/lib/study.js";
import { spotifyImportPayload, summarizeImport } from "./src/lib/spotify.js";

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
const AI_DEFAULT_BASE = "https://api.openai.com/v1";
const AI_DEFAULT_MODEL = "gpt-4o-mini";

function env(name) {
  return String(process.env[name] || "").trim();
}

function hasSpotify() {
  return Boolean(env("SPOTIFY_CLIENT_ID") && env("SPOTIFY_CLIENT_SECRET"));
}

function hasAI() {
  return Boolean(env("AI_API_KEY"));
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
  const base = (env("AI_BASE_URL") || AI_DEFAULT_BASE).replace(/\/+$/, "");
  const model = env("AI_MODEL") || AI_DEFAULT_MODEL;

  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("AI_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    }),
    signal: AbortSignal.timeout(90000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `The AI provider rejected the request (${response.status}). ${
        response.status === 401 ? "Check AI_API_KEY." : detail.slice(0, 180)
      }`.trim()
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return { study: normalizeStudy(parseModelJson(content)), model };
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "online", service: "YUMEIKA API" });
  });

  /** Public: tells the Studio which integrations exist, never the secrets. */
  app.get("/api/integrations/status", (req, res) => {
    res.json({
      spotify: { configured: hasSpotify(), artistId: env("SPOTIFY_ARTIST_ID") },
      ai: { configured: hasAI(), model: env("AI_MODEL") || AI_DEFAULT_MODEL },
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
    if (!hasAI()) {
      return missingEnv(
        res,
        "The AI writer is not configured on the server.",
        ["AI_API_KEY"],
        "Add an AI provider key (AI_API_KEY, optionally AI_MODEL / AI_BASE_URL) to the hosting environment."
      );
    }

    const song = req.body?.song || {};
    if (!String(song.title || "").trim()) {
      return res.status(400).json({ error: "A song title is required." });
    }

    try {
      const { study, model } = await requestStudy({
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
        study: { ...study, disclaimer: study.disclaimer || STUDY_DISCLAIMER },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(502).json({ error: error.message || "Study generation failed." });
    }
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

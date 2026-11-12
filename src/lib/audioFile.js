/**
 * Audio file rules shared by the browser and the Node server, so an upload is
 * validated the same way on both sides.
 */

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const ALLOWED_AUDIO_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/flac",
  "audio/x-flac"
];

export const ALLOWED_AUDIO_EXT = [
  ".mp3",
  ".m4a",
  ".aac",
  ".ogg",
  ".oga",
  ".opus",
  ".wav",
  ".webm",
  ".flac"
];

const MIME_BY_EXT = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".flac": "audio/flac"
};

/** Removes directories, unsafe characters and leading dots from a filename. */
export function sanitizeFilename(name) {
  const base = String(name || "audio")
    .split(/[\\/]/)
    .pop()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
    .replace(/[-.]+$/, "");
  const cleaned = base || "audio";
  return cleaned.length > 96 ? cleaned.slice(-96).replace(/^[-.]+/, "") : cleaned;
}

export function extensionOf(name) {
  const match = String(name || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

export function isAllowedAudio(name, mime = "") {
  const ext = extensionOf(name);
  const byExt = ALLOWED_AUDIO_EXT.includes(ext);
  const byMime = ALLOWED_AUDIO_MIME.includes(String(mime || "").toLowerCase());
  return byExt || byMime;
}

export function mimeForName(name) {
  return MIME_BY_EXT[extensionOf(name)] || "application/octet-stream";
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A readable download filename built from the song title, keeping the original
 * extension so players and phones recognise the file.
 */
export function downloadFilename(title, url) {
  const ext = extensionOf(url) || ".mp3";
  const base = String(title || "yumeika-track")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${base || "yumeika-track"}${ext}`;
}

/** True when a song has audio the app can actually play itself. */
export function hasPlayableAudio(song) {
  const url = song?.audio_url;
  if (!url || typeof url !== "string") return false;
  const value = url.trim();
  if (!value) return false;
  return (
    value.startsWith("/") ||
    value.startsWith("data:audio/") ||
    value.startsWith("blob:") ||
    /^https?:\/\//i.test(value)
  );
}

/** Readable filename for the Studio's audio backup download. */
export function backupFilename(date = new Date()) {
  const stamp = new Date(date);
  const iso = Number.isNaN(stamp.getTime()) ? new Date().toISOString() : stamp.toISOString();
  return `yumeika-audio-backup-${iso.slice(0, 10)}.json`;
}

/**
 * Validates a backup produced by GET /api/audio/backup before restoring it, so
 * a wrong or half-written file never touches the library.
 */
export function parseAudioBackup(input) {
  let payload = input;

  if (typeof input === "string") {
    try {
      payload = JSON.parse(input);
    } catch {
      throw new Error("That file is not a YUMEIKA audio backup.");
    }
  }

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.files)) {
    throw new Error("That file is not a YUMEIKA audio backup.");
  }

  const files = payload.files.filter(
    file => file && typeof file.name === "string" && typeof file.data === "string" && file.data
  );

  if (!files.length) {
    throw new Error("The backup contains no audio files.");
  }

  return {
    app: payload.app || "yumeika-audio-backup",
    createdAt: payload.createdAt || "",
    files,
    count: files.length,
    totalBytes: files.reduce((sum, file) => sum + (Number(file.size) || 0), 0)
  };
}

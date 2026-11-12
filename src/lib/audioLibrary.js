import { repo } from "./dataClient.js";
import { supabase, isSupabaseConfigured, STORAGE_BUCKETS } from "./supabase.js";
import { getServerPassword } from "./integrations.js";
import {
  MAX_AUDIO_BYTES,
  backupFilename,
  downloadFilename,
  isAllowedAudio,
  parseAudioBackup
} from "./audioFile.js";

/**
 * Audio library used by the Studio and by the download buttons.
 *
 * With Supabase connected, files go to the public audio bucket (permanent).
 * Without it, the Node server stores them in data/audio and serves them from
 * /audio/<name>, so the player and the download button work with real URLs
 * instead of sending the visitor to Spotify.
 */

const MB = 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.readAsDataURL(file);
  });
}

export function validateAudioFile(file) {
  if (!file) throw new Error("Choose an audio file first.");
  if (!isAllowedAudio(file.name, file.type)) {
    throw new Error("Unsupported audio type. Use MP3, M4A, AAC, OGG, OPUS, WAV, WEBM or FLAC.");
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error(`That file is ${(file.size / MB).toFixed(1)} MB. The limit is ${Math.round(MAX_AUDIO_BYTES / MB)} MB.`);
  }
  return true;
}

export async function uploadAudioFile(file) {
  validateAudioFile(file);

  if (isSupabaseConfigured) {
    const result = await repo.uploadAsset(file, {
      bucket: STORAGE_BUCKETS.audio,
      folder: "audio"
    });
    return { url: result.url, name: file.name, size: file.size, storage: "supabase" };
  }

  const data = await readAsDataUrl(file);
  const response = await fetch("/api/audio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": getServerPassword()
    },
    body: JSON.stringify({ filename: file.name, mime: file.type, data })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.hint || "The audio file could not be uploaded.");
  }
  return { url: payload.url, name: payload.name, size: payload.size, storage: "server" };
}

export async function listAudioFiles() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.audio)
      .list("audio", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    return (data || []).map(file => {
      const { data: published } = supabase.storage
        .from(STORAGE_BUCKETS.audio)
        .getPublicUrl(`audio/${file.name}`);
      return {
        name: file.name,
        url: published?.publicUrl || "",
        size: file.metadata?.size || 0,
        modified: file.updated_at || file.created_at || ""
      };
    });
  }
  const response = await fetch("/api/audio");
  if (!response.ok) return [];
  const payload = await response.json().catch(() => ({}));
  return payload.files || [];
}

export async function deleteAudioFile(name) {
  if (!name) return false;

  /* A Supabase-hosted track is a full URL: delete it from its bucket. */
  if (isSupabaseConfigured && /^https?:\/\//i.test(name)) {
    const path = supabasePathFromUrl(name, STORAGE_BUCKETS.audio);
    if (!path) throw new Error("That audio file is not stored in the YUMEIKA bucket.");
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.audio).remove([path]);
    if (error) throw new Error(error.message);
    return true;
  }

  const response = await fetch(`/api/audio/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "x-admin-password": getServerPassword() }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "The audio file could not be deleted.");
  }
  return true;
}

/** Turns a stored audio URL into a real download URL with a readable filename. */
export function downloadUrlFor(url, title) {
  if (!url) return "";
  if (url.startsWith("/audio/")) {
    return `${url}?download=${encodeURIComponent(downloadFilename(title, url))}`;
  }
  return url;
}

/**
 * Saves the track to the visitor's device. Files served by this app download
 * straight from the response; a cross-origin file that refuses a CORS read
 * falls back to the browser's own download handling.
 */
export async function downloadTrack(song) {
  const url = song?.audio_url;
  if (!url) throw new Error("This song has no audio file yet.");

  const filename = downloadFilename(song.title, url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status}).`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    return filename;
  } catch {
    const anchor = document.createElement("a");
    anchor.href = downloadUrlFor(url, song.title);
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return filename;
  }
}

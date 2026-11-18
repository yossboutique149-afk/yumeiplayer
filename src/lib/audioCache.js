/**
 * Device-side copy of every uploaded track.
 *
 * A deployed container is replaced on each redeploy, so the server's data/audio
 * folder starts empty again. Keeping a copy in the browser (IndexedDB) lets the
 * Studio put the library back on the server by itself, with no account, no API
 * key and no extra step for the administrator.
 */
import { mimeForName } from "./audioFile.js";

const DB_NAME = "yumeika-audio";
const DB_VERSION = 1;
const STORE = "files";

export function isAudioCacheSupported() {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!isAudioCacheSupported()) {
      reject(new Error("This browser cannot keep a local copy of the audio."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "name" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("The local audio copy is unavailable."));
  });
}

/** Runs one request in its own transaction and resolves with its result. */
function withStore(mode, work) {
  return openDatabase().then(
    db =>
      new Promise((resolve, reject) => {
        let transaction;
        let request;
        try {
          transaction = db.transaction(STORE, mode);
          request = work(transaction.objectStore(STORE));
        } catch (error) {
          db.close();
          reject(error);
          return;
        }
        transaction.oncomplete = () => {
          db.close();
          resolve(request ? request.result : undefined);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error || new Error("The local audio copy could not be updated."));
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error || new Error("The local audio copy was cancelled."));
        };
      })
  );
}

export async function saveCachedAudio(name, blob, { mime, savedAt } = {}) {
  const safeName = String(name || "").trim();
  if (!safeName || !blob) return false;
  await withStore("readwrite", store =>
    store.put({
      name: safeName,
      blob,
      size: Number(blob.size) || 0,
      mime: mime || mimeForName(safeName),
      savedAt: savedAt || new Date().toISOString()
    })
  );
  return true;
}

export async function getCachedAudio(name) {
  const key = String(name || "").trim();
  if (!key) return null;
  const record = await withStore("readonly", store => store.get(key));
  return record || null;
}

export async function listCachedAudio() {
  const rows = (await withStore("readonly", store => store.getAll())) || [];
  return rows
    .filter(row => row && typeof row.name === "string")
    .map(row => ({
      name: row.name,
      size: Number(row.size) || 0,
      mime: row.mime || "",
      savedAt: row.savedAt || ""
    }))
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

export async function deleteCachedAudio(name) {
  const key = String(name || "").trim();
  if (!key) return false;
  await withStore("readwrite", store => store.delete(key));
  return true;
}

/** Space used by the local copy, for the Studio's status line. */
export function cachedAudioBytes(files = []) {
  return (Array.isArray(files) ? files : []).reduce(
    (sum, file) => sum + (Number(file?.size) || 0),
    0
  );
}

/**
 * Which cached tracks the server no longer has. Pure on purpose: the rule that
 * decides what to upload again is tested without a browser.
 */
export function planAudioRestore(serverFiles = [], cachedFiles = []) {
  const nameOf = entry => (typeof entry === "string" ? entry : entry?.name);
  const onServer = new Set(
    (Array.isArray(serverFiles) ? serverFiles : [])
      .map(nameOf)
      .filter(Boolean)
      .map(String)
  );
  const cached = (Array.isArray(cachedFiles) ? cachedFiles : [])
    .map(nameOf)
    .filter(Boolean)
    .map(String);

  const missing = [];
  cached.forEach(name => {
    if (!onServer.has(name) && !missing.includes(name)) missing.push(name);
  });

  return { missing, total: cached.length, present: cached.length - missing.length };
}

/** Blob → bare base64, the shape POST /api/audio/restore accepts. */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("The stored audio copy could not be read."));
    reader.readAsDataURL(blob);
  });
}

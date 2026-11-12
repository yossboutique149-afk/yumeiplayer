import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { createApp } from "../server.js";
import { AI_KEY_VARS } from "../src/lib/aiProviders.js";

/**
 * These tests exercise the real Express app without any provider key: they
 * verify the admin gate and that a missing integration is reported with the
 * exact environment variable names, instead of pretending the call worked.
 */

// Every variable the server can read, so a developer machine with real keys
// never changes the outcome of these tests.
const MANAGED = [
  "ADMIN_PASSWORD",
  "AI_MODEL",
  "AI_BASE_URL",
  "AI_PROVIDER",
  ...AI_KEY_VARS,
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_ARTIST_ID"
];

const saved = {};
const app = createApp();
let server;
let base;

before(async () => {
  MANAGED.forEach(key => {
    saved[key] = process.env[key];
    delete process.env[key];
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  MANAGED.forEach(key => {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  });
  server?.close();
});

function post(path, { headers = {}, body } = {}) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body ?? {})
  });
}

test("health endpoint stays public", async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "online", service: "YUMEIKA API" });
});

test("status reports what is configured without leaking secret values", async () => {
  process.env.AI_API_KEY = "sk-test-secret-value";
  const response = await fetch(`${base}/api/integrations/status`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(body.includes("sk-test-secret-value"), false, "the key never leaves the server");
  const data = JSON.parse(body);
  assert.equal(data.ai.configured, true);
  assert.equal(data.spotify.configured, false);
  assert.equal(data.adminGate.configured, false);
  delete process.env.AI_API_KEY;
});

test("status names the detected provider without leaking the key", async () => {
  // No other AI key may survive from an earlier test, or the generic
  // AI_API_KEY would win over the provider-specific one.
  delete process.env.AI_API_KEY;
  process.env.GEMINI_API_KEY = "gemini-test-secret";

  try {
    const response = await fetch(`${base}/api/integrations/status`);
    const body = await response.text();

    assert.equal(body.includes("gemini-test-secret"), false, "the key never leaves the server");
    const data = JSON.parse(body);
    assert.equal(data.ai.configured, true);
    assert.equal(data.ai.provider, "gemini");
    assert.equal(data.ai.keyVar, "GEMINI_API_KEY");
    assert.ok(Array.isArray(data.ai.acceptedKeys) && data.ai.acceptedKeys.length > 5);
  } finally {
    delete process.env.GEMINI_API_KEY;
  }
});

test("the study endpoint refuses to run without an admin password configured", async () => {
  delete process.env.AI_API_KEY;
  const response = await post("/api/ai/study", { body: { song: { title: "Ribbon Noose" } } });
  const data = await response.json();

  assert.equal(response.status, 503);
  assert.deepEqual(data.missing, ["ADMIN_PASSWORD"]);
});

test("the admin gate rejects a wrong password", async () => {
  process.env.ADMIN_PASSWORD = "correct-horse";
  const response = await post("/api/ai/study", {
    headers: { "x-admin-password": "wrong" },
    body: { song: { title: "Ribbon Noose" } }
  });

  assert.equal(response.status, 401);
});

test("a missing AI key is reported with the exact variable name", async () => {
  delete process.env.AI_API_KEY;
  const response = await post("/api/ai/study", {
    headers: { "x-admin-password": "correct-horse" },
    body: { song: { title: "Ribbon Noose" } }
  });
  const data = await response.json();

  assert.equal(response.status, 503);
  assert.deepEqual(data.missing, ["AI_API_KEY"]);
});

test("a song without a title is rejected before any provider call", async () => {
  process.env.AI_API_KEY = "sk-test";
  try {
    const response = await post("/api/ai/study", {
      headers: { "x-admin-password": "correct-horse" },
      body: { song: { title: "   " } }
    });
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.match(data.error, /title/i);
  } finally {
    delete process.env.AI_API_KEY;
  }
});

test("a missing Spotify key is reported with both variable names", async () => {
  const response = await post("/api/spotify/import", {
    headers: { "x-admin-password": "correct-horse" },
    body: {}
  });
  const data = await response.json();

  assert.equal(response.status, 503);
  assert.deepEqual(data.missing, ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"]);
});

test("unknown api routes are not swallowed by the single page app", async () => {
  const response = await fetch(`${base}/api/does-not-exist`);
  assert.equal(response.status, 404);
});

test("the audio backup and restore endpoints require the admin password", async () => {
  process.env.ADMIN_PASSWORD = "correct-horse";

  const backup = await fetch(`${base}/api/audio/backup`);
  assert.equal(backup.status, 401);

  const restore = await post("/api/audio/restore", { body: { files: [] } });
  assert.equal(restore.status, 401);
});

test("restore refuses a backup without audio files", async () => {
  process.env.ADMIN_PASSWORD = "correct-horse";
  const response = await post("/api/audio/restore", {
    headers: { "x-admin-password": "correct-horse" },
    body: { files: [] }
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.error, /no audio/i);
});

test("restore skips entries that are not playable audio", async () => {
  process.env.ADMIN_PASSWORD = "correct-horse";
  const response = await post("/api/audio/restore", {
    headers: { "x-admin-password": "correct-horse" },
    body: { files: [{ name: "notes.txt", data: "aGVsbG8=" }] }
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.total, 0);
  assert.equal(data.skipped.length, 1);
  assert.match(data.skipped[0].reason, /unsupported/i);
});

test("a restored track comes back in the backup and plays again", async () => {
  process.env.ADMIN_PASSWORD = "correct-horse";
  const headers = { "x-admin-password": "correct-horse" };
  const name = `verify-restore-${Date.now()}.mp3`;
  const base64 = Buffer.from("ID3\u0004\u0000\u0000\u0000\u0000\u0000\u0000", "binary").toString(
    "base64"
  );

  try {
    const restore = await post("/api/audio/restore", {
      headers,
      body: { files: [{ name, data: base64 }] }
    });
    const restored = await restore.json();

    assert.equal(restore.status, 200);
    assert.equal(restored.total, 1);
    assert.equal(restored.restored[0].name, name);
    assert.equal(restored.restored[0].url, `/audio/${encodeURIComponent(name)}`);

    const backupResponse = await fetch(`${base}/api/audio/backup`, { headers });
    assert.equal(backupResponse.status, 200);
    assert.match(
      backupResponse.headers.get("content-disposition") || "",
      /yumeika-audio-backup-\d{4}-\d{2}-\d{2}\.json/
    );

    const backup = await backupResponse.json();
    const entry = backup.files.find(file => file.name === name);
    assert.ok(entry, "the restored track is inside the backup");
    assert.equal(entry.mime, "audio/mpeg");
    assert.equal(
      Buffer.from(entry.data, "base64").length,
      Buffer.from(base64, "base64").length,
      "the backup carries the original bytes"
    );

    const audio = await fetch(`${base}/audio/${name}`);
    assert.equal(audio.status, 200);
    assert.match(audio.headers.get("content-type") || "", /audio\/mpeg/);
  } finally {
    await fetch(`${base}/api/audio/${name}`, { method: "DELETE", headers }).catch(() => {});
  }
});

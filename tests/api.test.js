import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { createApp } from "../server.js";

/**
 * These tests exercise the real Express app without any provider key: they
 * verify the admin gate and that a missing integration is reported with the
 * exact environment variable names, instead of pretending the call worked.
 */

const MANAGED = [
  "ADMIN_PASSWORD",
  "AI_API_KEY",
  "AI_MODEL",
  "AI_BASE_URL",
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
  const response = await post("/api/ai/study", {
    headers: { "x-admin-password": "correct-horse" },
    body: { song: { title: "   " } }
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.error, /title/i);
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

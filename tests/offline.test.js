import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildServiceWorker } from "../scripts/build-sw.mjs";
import { serviceWorkerSource } from "../scripts/sw-template.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yumeika-sw-"));
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.mkdirSync(path.join(dir, "sample"), { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><div id=root></div>");
  fs.writeFileSync(path.join(dir, "assets", "index-abc123.js"), "console.log(1)");
  fs.writeFileSync(path.join(dir, "assets", "index-abc123.css"), "body{color:#fff}");
  fs.writeFileSync(path.join(dir, "manifest.webmanifest"), "{}");
  fs.writeFileSync(path.join(dir, "sample", "tone.mp3"), "ID3fake");
  return dir;
}

test("buildServiceWorker precaches the whole built app", () => {
  const dir = fixture();
  const result = buildServiceWorker(dir);
  const sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");

  assert.ok(result.files.includes("/index.html"));
  assert.ok(result.files.includes("/assets/index-abc123.js"));
  assert.ok(result.files.includes("/assets/index-abc123.css"));
  assert.ok(result.files.includes("/sample/tone.mp3"));
  assert.ok(!result.files.includes("/sw.js"), "the worker must not precache itself");
  assert.match(result.version, /^[0-9a-f]{12}$/);
  for (const file of result.files) {
    assert.ok(sw.includes(file), `${file} is missing from the generated worker`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "offline-manifest.json"), "utf8"));
  assert.equal(manifest.version, result.version);
  assert.deepEqual(manifest.files, result.files);
});

test("a changed asset produces a new cache version", () => {
  const dir = fixture();
  const first = buildServiceWorker(dir);
  fs.writeFileSync(path.join(dir, "assets", "index-abc123.js"), "console.log(2)");
  const second = buildServiceWorker(dir);
  assert.notEqual(first.version, second.version);
});

test("buildServiceWorker refuses to run without a build", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yumeika-empty-"));
  assert.throws(() => buildServiceWorker(dir), /vite build/);
});

test("the worker serves the shell offline and keeps audio seekable", () => {
  const source = serviceWorkerSource({ version: "abc123abc123", precache: ["/index.html"] });
  assert.match(source, /request\.mode === "navigate"/);
  assert.match(source, /cachedResponse\("\/index\.html"\)/);
  assert.match(source, /caches\.delete/);
  assert.match(source, /status: 206/);
  assert.match(source, /Content-Range/);
  assert.match(source, /SKIP_WAITING/);
  assert.match(source, /startsWith\("\/api\/"\)/);
});

test("no remote fonts or CDN assets are needed to render", () => {
  const theme = read("src/styles/theme.css");
  assert.ok(!/@import\s+url\(["']?https?:/.test(theme), "theme.css must not import remote fonts");
  assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(theme));
  assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(read("index.html")));
});

test("the manifest is installable and points at real icon files", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");

  const sizes = manifest.icons.map(icon => icon.sizes);
  assert.ok(sizes.includes("192x192"));
  assert.ok(sizes.includes("512x512"));
  assert.ok(manifest.icons.some(icon => icon.purpose === "maskable"));

  for (const icon of manifest.icons) {
    const file = icon.src.replace(/^\//, "");
    assert.ok(fs.existsSync(path.join(ROOT, "public", file)), `${icon.src} does not exist`);
  }
});

test("the offline page, install prompt and worker are wired into the app", () => {
  const main = read("src/main.jsx");
  assert.match(main, /OfflineProvider/);
  assert.match(main, /path="offline"/);

  const layout = read("src/components/Layout.jsx");
  assert.match(layout, /useOffline/);
  assert.match(layout, /InstallPrompt/);
});

test("index.html links the manifest and loads nothing from another origin", () => {
  const html = read("index.html");
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-touch-icon/);
  assert.ok(!/https?:\/\//.test(html), "index.html must not load remote resources");
});

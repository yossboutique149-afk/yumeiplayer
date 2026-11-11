/**
 * Generates dist/sw.js after `vite build`.
 *
 * The precache list is built from the real output files (hashed JS/CSS chunks
 * included) and the cache version is a hash of their contents, so every new
 * build replaces the offline shell instead of serving stale assets.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { serviceWorkerSource } from "./sw-template.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function collectFiles(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      files.push("/" + path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return files.sort();
}

export function buildServiceWorker(distDir = path.join(HERE, "..", "dist")) {
  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("dist/index.html is missing — run `vite build` before generating the service worker.");
  }

  const files = collectFiles(distDir).filter(file => file !== "/sw.js");

  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(distDir, file)));
  }
  const version = hash.digest("hex").slice(0, 12);

  const source = serviceWorkerSource({ version, precache: files });
  const output = path.join(distDir, "sw.js");
  fs.writeFileSync(output, source, "utf8");

  // The page uses this list to show real download progress in "Offline mode".
  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    files
  };
  fs.writeFileSync(
    path.join(distDir, "offline-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  return { version, files, output, manifest, bytes: Buffer.byteLength(source) };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const result = buildServiceWorker();
    console.log(
      `YUMEIKA offline shell: ${result.files.length} files precached, cache version ${result.version}.`
    );
  } catch (error) {
    console.error("Could not generate the service worker:", error.message);
    process.exit(1);
  }
}

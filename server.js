import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

/**
 * Production server for YUMEIKA — THE MUSIC UNIVERSE.
 *
 * The client is a single-page app built by Vite into dist/. Content and
 * authentication are handled by Supabase directly from the browser, so this
 * process only serves the built client plus a small health endpoint.
 */
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = "0.0.0.0";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "dist");
const INDEX_FILE = path.join(DIST_DIR, "index.html");

app.disable("x-powered-by");

app.get("/api/health", (req, res) => {
  res.json({ status: "online", service: "YUMEIKA", time: new Date().toISOString() });
});

app.use(
  express.static(DIST_DIR, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return;
      }
      // The worker and its manifest must always be revalidated, otherwise a new
      // build could keep serving the previous offline shell.
      if (/(sw\.js|offline-manifest\.json|manifest\.webmanifest)$/.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache");
      }
    }
  })
);

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  if (!fs.existsSync(INDEX_FILE)) {
    return res
      .status(503)
      .type("text/plain")
      .send("YUMEIKA: run `npm run build` to generate the client bundle.");
  }
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(INDEX_FILE);
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, HOST, () => {
  console.log(`YUMEIKA running on http://${HOST}:${PORT}`);
});

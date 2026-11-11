import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const schema = read("supabase/schema.sql");

const TABLES = [
  "profiles",
  "albums",
  "songs",
  "audio_sources",
  "lyric_versions",
  "lyric_lines",
  "translations",
  "pronunciation_guides",
  "vocabulary",
  "song_analyses",
  "favorites",
  "playlists",
  "playlist_items"
];

test("every exposed table enables Row Level Security", () => {
  for (const table of TABLES) {
    assert.match(
      schema,
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      `${table} must enable RLS`
    );
  }
});

test("public reads are limited to published rows", () => {
  assert.match(schema, /status = 'published'/i);
  assert.match(schema, /is_staff\(\)/i);
  assert.match(schema, /is_admin\(\)/i);
});

test("storage buckets exist with policies", () => {
  assert.match(schema, /'yumeika-audio'/);
  assert.match(schema, /'yumeika-artwork'/);
  assert.match(schema, /on storage\.objects/i);
});

test("client source never contains privileged credentials", () => {
  const files = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|jsx|html|json)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, "src"));
  walk(path.join(root, "public"));

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /service_role/i, `${file} must not mention the service role key`);
    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE|SERVICE_ROLE_KEY/,
      `${file} must not read privileged env vars`
    );
  }
});

test("the browser only receives the public anon key", () => {
  const supabase = read("src/lib/supabase.js");
  assert.match(supabase, /VITE_SUPABASE_URL/);
  assert.match(supabase, /VITE_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(supabase, /SERVICE/i);
});

test("no committed env file and no real secrets in the repo", () => {
  assert.equal(fs.existsSync(path.join(root, ".env")), false, ".env must not be committed");
  const example = read(".env.example");
  assert.match(example, /VITE_SUPABASE_URL=/);
  assert.doesNotMatch(example, /eyJ[A-Za-z0-9_-]{20,}/, "example must not contain a real JWT");
});

test("external embeds are restricted to Spotify and YouTube hosts", () => {
  const embed = read("src/components/EmbedFrame.jsx");
  assert.match(embed, /open\.spotify\.com/);
  assert.match(embed, /youtube\.com|youtu\.be/);
});

test("sample content is labelled and never claims official lyrics", () => {
  const sample = read("src/data/sample.js");
  assert.match(sample, /is_sample: true/);
  assert.match(sample, /SAMPLE_DISCLAIMER/);
  assert.match(sample, /AI_DISCLAIMER/);
  assert.match(sample, /sample/i);
});

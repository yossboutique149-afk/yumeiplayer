import test from "node:test";
import assert from "node:assert/strict";

import {
  slugify,
  formatDuration,
  formatTimecode,
  parseTimecode,
  matchesQuery,
  pluralize,
  truncate,
  clamp,
  uniqueBy,
  groupBy,
  normalizeText
} from "../src/lib/format.js";

test("slugify produces url-safe slugs", () => {
  assert.equal(slugify("Ribbon Noose"), "ribbon-noose");
  assert.equal(slugify("Calendar Scars"), "calendar-scars");
  assert.equal(slugify("Stage of Split Queens"), "stage-of-split-queens");
  assert.equal(slugify("  Hello,  World!  "), "hello-world");
});

test("formatDuration renders mm:ss", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(42), "0:42");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(605), "10:05");
});

test("timecodes round-trip between ms and mm:ss.mmm", () => {
  assert.equal(formatTimecode(12500), "00:12.500");
  assert.equal(parseTimecode("00:12.500"), 12500);
  assert.equal(parseTimecode("1:02.250"), 62250);
  assert.equal(parseTimecode("12.5"), 12500);
  assert.equal(parseTimecode(""), null);
  assert.equal(parseTimecode("nonsense"), null);
  assert.equal(parseTimecode(null), null);

  for (const ms of [0, 900, 12500, 61000, 3599999]) {
    assert.equal(parseTimecode(formatTimecode(ms)), ms);
  }
});

test("matchesQuery searches several fields case-insensitively", () => {
  const song = { title: "Sample Track", title_ja: "サンプル", description: "Placeholder" };
  assert.equal(matchesQuery("sample", song.title, song.description), true);
  assert.equal(matchesQuery("SAMPL", song.title), true);
  assert.equal(matchesQuery("missing", song.title, song.description), false);
  assert.equal(matchesQuery("", song.title), true);
});

test("normalizeText is accent and width insensitive", () => {
  assert.equal(normalizeText("Café"), "cafe");
  assert.equal(normalizeText("ＹＵＭＥＩＫＡ"), "yumeika");
});

test("small helpers behave predictably", () => {
  assert.equal(truncate("abcdefghij", 5), "abcde…");
  assert.equal(truncate("abc", 5), "abc");
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(pluralize(1, "song"), "1 song");
  assert.equal(pluralize(2, "song"), "2 songs");
  assert.equal(pluralize(2, "entry", "entries"), "2 entries");
  assert.equal(uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], item => item.id).length, 2);
  assert.equal(Object.keys(groupBy([{ k: "a" }, { k: "a" }, { k: "b" }], item => item.k)).length, 2);
});

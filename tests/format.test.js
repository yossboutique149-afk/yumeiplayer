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

test("formatDuration renders m:ss and hides unknown lengths", () => {
  assert.equal(formatDuration(0), "—");
  assert.equal(formatDuration(42), "0:42");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(605), "10:05");
  assert.equal(formatDuration(undefined), "—");
  assert.equal(formatDuration("not a number"), "—");
});

test("timecodes convert between ms and m:ss input", () => {
  assert.equal(formatTimecode(12500), "0:12");
  assert.equal(formatTimecode(65000), "1:05");
  assert.equal(formatTimecode(-5), "0:00");
  assert.equal(parseTimecode("0:12.500"), 12500);
  assert.equal(parseTimecode("1:02.250"), 62250);
  assert.equal(parseTimecode("12.5"), 12500);
  assert.equal(parseTimecode(""), null);
  assert.equal(parseTimecode("nonsense"), null);
  assert.equal(parseTimecode(null), null);

  // Display is second-aligned, so the round-trip holds for whole seconds.
  for (const ms of [0, 1000, 12000, 61000, 3599000]) {
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

test("normalizeText lowercases and trims for search", () => {
  assert.equal(normalizeText("  YUMEIKA "), "yumeika");
  assert.equal(normalizeText("Café"), "café");
  assert.equal(matchesQuery("café", "CAFÉ"), true);
});

test("small helpers behave predictably", () => {
  assert.equal(truncate("abcdefghij", 5), "abcd…");
  assert.equal(truncate("abc", 5), "abc");
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(pluralize(1, "song"), "1 song");
  assert.equal(pluralize(2, "song"), "2 songs");
  assert.equal(pluralize(2, "entry", "entries"), "2 entries");
  assert.equal(uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], item => item.id).length, 2);
  assert.equal(Object.keys(groupBy([{ k: "a" }, { k: "a" }, { k: "b" }], item => item.k)).length, 2);
});

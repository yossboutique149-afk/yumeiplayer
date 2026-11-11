import test from "node:test";
import assert from "node:assert/strict";

import {
  sortLines,
  hasTiming,
  isKaraokeReady,
  findActiveLineIndex,
  nextTimedIndex,
  karaokeProgress
} from "../src/lib/karaoke.js";

const lines = [
  { id: "c", line_index: 2, start_ms: 8000, end_ms: 12000, original: "third" },
  { id: "a", line_index: 0, start_ms: 0, end_ms: 4000, original: "first" },
  { id: "b", line_index: 1, start_ms: 4000, end_ms: 8000, original: "second" }
];

test("sortLines orders by line_index without mutating the input", () => {
  const sorted = sortLines(lines);
  assert.deepEqual(sorted.map(line => line.id), ["a", "b", "c"]);
  assert.equal(lines[0].id, "c");
});

test("hasTiming requires both start and end on every line", () => {
  assert.equal(hasTiming(lines), true);
  assert.equal(hasTiming([{ start_ms: 0, end_ms: 100 }]), true);
  assert.equal(hasTiming([{ start_ms: 0, end_ms: null }]), false);
  assert.equal(hasTiming([{ start_ms: 0 }]), false);
  assert.equal(hasTiming([]), false);
  assert.equal(hasTiming(null), false);
});

test("karaoke is only ready for an uploaded audio file with timed lines", () => {
  const uploaded = { audio_url: "/sample/sample-tone.mp3" };
  assert.equal(isKaraokeReady(uploaded, lines), true);
  assert.equal(isKaraokeReady({ audio_url: "" }, lines), false);
  assert.equal(isKaraokeReady({}, lines), false);
  assert.equal(isKaraokeReady(uploaded, [{ start_ms: 0 }]), false);
});

test("findActiveLineIndex follows playback time", () => {
  const sorted = sortLines(lines);
  assert.equal(findActiveLineIndex(sorted, 0), 0);
  assert.equal(findActiveLineIndex(sorted, 3999), 0);
  assert.equal(findActiveLineIndex(sorted, 4000), 1);
  assert.equal(findActiveLineIndex(sorted, 9000), 2);
  assert.equal(findActiveLineIndex(sorted, 99999), -1);
  assert.equal(findActiveLineIndex([], 1000), -1);
});

test("nextTimedIndex advances to the next timed line", () => {
  const sorted = sortLines(lines);
  assert.equal(nextTimedIndex(sorted, 0), 1);
  assert.equal(nextTimedIndex(sorted, 2), -1);
});

test("karaokeProgress reports a bounded 0..1 ratio", () => {
  assert.equal(karaokeProgress(lines[1], 2000), 0.5);
  assert.equal(karaokeProgress(lines[1], 0), 0);
  assert.equal(karaokeProgress(lines[1], 99999), 1);
});

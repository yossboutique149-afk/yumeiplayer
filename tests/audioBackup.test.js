import test from "node:test";
import assert from "node:assert/strict";

import { backupFilename, parseAudioBackup } from "../src/lib/audioFile.js";

test("backupFilename uses the ISO day of the backup", () => {
  assert.equal(
    backupFilename("2026-11-12T09:31:00.000Z"),
    "yumeika-audio-backup-2026-11-12.json"
  );
  assert.match(backupFilename(), /^yumeika-audio-backup-\d{4}-\d{2}-\d{2}\.json$/);
});

test("backupFilename survives an invalid date", () => {
  assert.match(backupFilename("not a date"), /^yumeika-audio-backup-\d{4}-\d{2}-\d{2}\.json$/);
});

test("parseAudioBackup accepts a real backup payload", () => {
  const parsed = parseAudioBackup({
    app: "yumeika-audio-backup",
    createdAt: "2026-11-12T09:31:00.000Z",
    files: [
      { name: "1700000000000-song.mp3", size: 2048, data: "QUJD" },
      { name: "1700000000001-other.m4a", size: 1024, data: "REVG" }
    ]
  });

  assert.equal(parsed.count, 2);
  assert.equal(parsed.totalBytes, 3072);
  assert.equal(parsed.createdAt, "2026-11-12T09:31:00.000Z");
  assert.deepEqual(parsed.files.map(file => file.name), [
    "1700000000000-song.mp3",
    "1700000000001-other.m4a"
  ]);
});

test("parseAudioBackup reads a JSON string", () => {
  const parsed = parseAudioBackup(
    JSON.stringify({ files: [{ name: "track.mp3", data: "QUJD" }] })
  );
  assert.equal(parsed.count, 1);
  assert.equal(parsed.app, "yumeika-audio-backup");
});

test("parseAudioBackup drops entries without usable audio data", () => {
  const parsed = parseAudioBackup({
    files: [
      { name: "good.mp3", data: "QUJD" },
      { name: "empty.mp3", data: "" },
      { data: "QUJD" },
      null
    ]
  });
  assert.equal(parsed.count, 1);
  assert.equal(parsed.files[0].name, "good.mp3");
});

test("parseAudioBackup rejects files that are not a YUMEIKA backup", () => {
  assert.throws(() => parseAudioBackup("{not json"), /not a YUMEIKA audio backup/);
  assert.throws(() => parseAudioBackup({ hello: "world" }), /not a YUMEIKA audio backup/);
  assert.throws(() => parseAudioBackup(null), /not a YUMEIKA audio backup/);
  assert.throws(() => parseAudioBackup({ files: [] }), /contains no audio files/);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_AUDIO_EXT,
  MAX_AUDIO_BYTES,
  downloadFilename,
  extensionOf,
  formatBytes,
  hasPlayableAudio,
  isAllowedAudio,
  mimeForName,
  sanitizeFilename
} from "../src/lib/audioFile.js";

test("sanitizeFilename strips paths and unsafe characters", () => {
  assert.equal(sanitizeFilename("../../etc/passwd.mp3"), "passwd.mp3");
  assert.equal(sanitizeFilename("C:\\Users\\Yumei\\Track 01.mp3"), "track-01.mp3");
  assert.equal(sanitizeFilename("  ...hidden.mp3  "), "hidden.mp3");
  assert.equal(sanitizeFilename(""), "audio");
  assert.equal(sanitizeFilename(null), "audio");
});

test("sanitizeFilename keeps a bounded name", () => {
  const long = `${"a".repeat(300)}.mp3`;
  assert.ok(sanitizeFilename(long).length <= 96);
  assert.ok(sanitizeFilename(long).endsWith(".mp3"));
});

test("extensionOf reads the real extension", () => {
  assert.equal(extensionOf("track.MP3"), ".mp3");
  assert.equal(extensionOf("track.m4a"), ".m4a");
  assert.equal(extensionOf("no-extension"), "");
  assert.equal(extensionOf("weird.name.flac"), ".flac");
});

test("isAllowedAudio accepts audio by extension or mime", () => {
  assert.equal(isAllowedAudio("song.mp3"), true);
  assert.equal(isAllowedAudio("song.ogg"), true);
  assert.equal(isAllowedAudio("recording", "audio/webm"), true);
  assert.equal(isAllowedAudio("song.mp3", "audio/mpeg"), true);
});

test("isAllowedAudio rejects non-audio files", () => {
  assert.equal(isAllowedAudio("cover.png"), false);
  assert.equal(isAllowedAudio("song.exe", "application/octet-stream"), false);
  assert.equal(isAllowedAudio("lyrics.txt", "text/plain"), false);
  assert.equal(isAllowedAudio(""), false);
});

test("every allowed extension resolves to an audio mime type", () => {
  ALLOWED_AUDIO_EXT.forEach(ext => {
    assert.match(mimeForName(`track${ext}`), /^audio\//);
  });
  assert.equal(mimeForName("unknown.bin"), "application/octet-stream");
});

test("downloadFilename builds a readable name with the original extension", () => {
  assert.equal(downloadFilename("Typing… Deleting…", "/audio/typing.mp3"), "Typing… Deleting….mp3");
  assert.equal(downloadFilename("Bad/Name: Here?", "/audio/x.flac"), "BadName Here.flac");
  assert.equal(downloadFilename("", "/audio/x.m4a"), "yumeika-track.m4a");
  assert.equal(downloadFilename("No Ext", "/audio/file"), "No Ext.mp3");
});

test("formatBytes describes sizes for the upload hint", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2 KB");
  assert.equal(formatBytes(MAX_AUDIO_BYTES), "25.0 MB");
});

test("hasPlayableAudio only accepts real, playable sources", () => {
  assert.equal(hasPlayableAudio({ audio_url: "/audio/song.mp3" }), true);
  assert.equal(hasPlayableAudio({ audio_url: "https://cdn.example.com/song.mp3" }), true);
  assert.equal(hasPlayableAudio({ audio_url: "blob:https://app/123" }), true);
  assert.equal(hasPlayableAudio({ audio_url: "data:audio/mpeg;base64,AAA" }), true);
});

test("hasPlayableAudio rejects empty or unusable values", () => {
  assert.equal(hasPlayableAudio({ audio_url: "" }), false);
  assert.equal(hasPlayableAudio({ audio_url: "   " }), false);
  assert.equal(hasPlayableAudio({ audio_url: null }), false);
  assert.equal(hasPlayableAudio({}), false);
  assert.equal(hasPlayableAudio(null), false);
  assert.equal(hasPlayableAudio({ audio_url: 42 }), false);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  STUDY_ANALYSIS_FIELDS,
  STUDY_DISCLAIMER,
  buildStudyPrompt,
  distributeTimings,
  isStudyEmpty,
  normalizeStudy,
  studyStats
} from "../src/lib/study.js";
import {
  slugifyTitle,
  spotifyAlbumRecord,
  spotifyImportPayload,
  spotifySongRecords,
  summarizeImport
} from "../src/lib/spotify.js";

const analysis = Object.fromEntries(STUDY_ANALYSIS_FIELDS.map(field => [field, `${field} text`]));

test("normalizeStudy keeps the ten analysis sections and drops unknown keys", () => {
  const study = normalizeStudy({
    lyrics_source: "ai_generated",
    lines: [
      { original: "夜のステージ", romanization: "yoru no sutēji", pronunciation: "YO-ru", translation: "night stage" }
    ],
    vocabulary: [{ term: "銀河", reading: "ぎんが", romaji: "ginga", meaning: "galaxy", notes: "n", line_index: 0 }],
    analysis: { ...analysis, chart_position: "should be dropped" }
  });

  assert.equal(study.lines.length, 1);
  assert.equal(study.lines[0].original, "夜のステージ");
  assert.equal(study.lyricsSource, "ai_generated");
  assert.deepEqual(Object.keys(study.analysis).sort(), [...STUDY_ANALYSIS_FIELDS].sort());
  assert.equal(study.analysis.chart_position, undefined);
  assert.equal(study.analysis.meaning, "meaning text");
  assert.equal(study.disclaimer, STUDY_DISCLAIMER);
});

test("normalizeStudy accepts a wrapped payload and removes empty rows", () => {
  const study = normalizeStudy({
    study: {
      lines: [{ original: "", translation: "" }, { original: "それでも声は", translation: "even so, my voice" }],
      vocabulary: [{ term: "" }, { term: "声", meaning: "voice" }]
    }
  });

  assert.equal(study.lines.length, 1);
  assert.equal(study.vocabulary.length, 1);
  assert.equal(study.vocabulary[0].line_index, 1, "missing line_index falls back to the row index");
});

test("normalizeStudy caps a runaway response", () => {
  const lines = Array.from({ length: 260 }, (_, index) => ({ original: `line ${index}` }));
  const study = normalizeStudy({ lines });
  assert.equal(study.lines.length, 200);
});

test("normalizeStudy reports when the model supplied no lyrics", () => {
  const study = normalizeStudy({ lines: [], analysis: { meaning: "about a stage" } });
  assert.equal(study.lyricsSource, "not_provided");
  assert.equal(studyStats(study).sections, 1);
  assert.equal(isStudyEmpty(study), false);
});

test("isStudyEmpty is true only when there are no lines and no analysis", () => {
  assert.equal(isStudyEmpty(normalizeStudy({})), true);
  assert.equal(isStudyEmpty(normalizeStudy({ lines: [{ original: "x" }] })), false);
});

test("buildStudyPrompt forbids presenting invented words as official lyrics", () => {
  const { system, user } = buildStudyPrompt({
    song: { title: "Sample Track 01", album: "Ribbon Noose", release_type: "album_track" },
    notes: "keep it gentle"
  });

  assert.match(system, /never state that generated words are official lyrics/i);
  assert.match(system, /not_provided/);
  assert.match(system, /Do not paraphrase the lyrics line by line/i);
  assert.match(user, /Sample Track 01/);
  assert.match(user, /Ribbon Noose/);
  assert.match(user, /keep it gentle/);
  STUDY_ANALYSIS_FIELDS.forEach(field => assert.ok(user.includes(field), `prompt asks for ${field}`));
});

test("distributeTimings spreads lines across the uploaded audio", () => {
  const lines = [{ original: "a" }, { original: "b" }, { original: "c" }, { original: "d" }];
  const timed = distributeTimings(lines, 40);

  assert.equal(timed.length, 4);
  timed.forEach((line, index) => {
    assert.ok(line.start_ms >= 0 && line.start_ms < 40000);
    assert.ok(line.end_ms > line.start_ms);
    assert.ok(line.end_ms <= 40000);
    if (index > 0) assert.ok(line.start_ms > timed[index - 1].start_ms, "timings move forward");
  });
});

test("distributeTimings leaves timings empty without audio", () => {
  const timed = distributeTimings([{ original: "a" }], 0);
  assert.equal(timed[0].start_ms, null);
  assert.equal(timed[0].end_ms, null);
});

test("slugifyTitle keeps Japanese titles readable and url-safe", () => {
  assert.equal(slugifyTitle("Kanojo wa Watashi no Ginga Datta"), "kanojo-wa-watashi-no-ginga-datta");
  assert.equal(slugifyTitle("彼女は私の銀河だった"), "彼女は私の銀河だった");
  assert.equal(slugifyTitle("  Stage of Split Queens!! "), "stage-of-split-queens");
  assert.equal(slugifyTitle(""), "release");
});

const spotifyAlbum = {
  id: "album1",
  name: "Ribbon Noose",
  album_type: "album",
  release_date: "2025-04-11",
  images: [{ url: "https://i.scdn.co/image/abc" }],
  external_urls: { spotify: "https://open.spotify.com/album/album1" },
  tracks: {
    items: [
      {
        id: "track1",
        name: "Ribbon Noose",
        track_number: 1,
        duration_ms: 183500,
        external_urls: { spotify: "https://open.spotify.com/track/track1" }
      },
      { id: null, name: "unavailable" }
    ]
  }
};

test("spotifyAlbumRecord creates a draft album with only schema columns", () => {
  const album = spotifyAlbumRecord(spotifyAlbum);

  assert.equal(album.status, "draft");
  assert.equal(album.is_sample, false);
  assert.equal(album.title, "Ribbon Noose");
  assert.equal(album.release_year, "2025");
  assert.equal(album.cover_url, "https://i.scdn.co/image/abc");
  assert.equal(album.spotify_album_id, undefined, "no column outside the schema");
  assert.match(album.description, /Imported from Spotify/);
});

test("spotifyAlbumRecord rejects non-https covers", () => {
  const album = spotifyAlbumRecord({ ...spotifyAlbum, images: [{ url: "http://insecure/x.jpg" }] });
  assert.equal(album.cover_url, "");
});

test("spotifySongRecords builds draft tracks with official embed links", () => {
  const songs = spotifySongRecords(spotifyAlbum);

  assert.equal(songs.length, 1, "tracks without an id are skipped");
  const [song] = songs;
  assert.equal(song.title, "Ribbon Noose");
  assert.equal(song.track_number, 1);
  assert.equal(song.duration_seconds, 184);
  assert.equal(song.status, "draft");
  assert.equal(song.audio_url, "");
  assert.equal(song.spotify_embed_url, "https://open.spotify.com/embed/track/track1");
  assert.equal(song.release_type, "album_track");
  assert.equal(song.external_links[0].url, "https://open.spotify.com/track/track1");
});

test("spotifyImportPayload and summarizeImport describe the import", () => {
  const entries = spotifyImportPayload([spotifyAlbum, { name: "no id" }]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].spotify_id, "album1");
  assert.deepEqual(summarizeImport(entries), { albums: 1, songs: 1 });
  assert.deepEqual(summarizeImport(null), { albums: 0, songs: 0 });
});

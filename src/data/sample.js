/**
 * Sample placeholder content.
 *
 * IMPORTANT: nothing here is an official lyric, translation or artist
 * statement. Albums carry their real titles because they were supplied by the
 * site owner; every song, line, vocabulary entry and analysis below is an
 * explicit placeholder that the administrator must replace in Admin Studio.
 */
const NOW = "2026-01-01T00:00:00.000Z";

export const SAMPLE_DISCLAIMER =
  "Sample placeholder content — not an official lyric, translation or artist statement. Replace it in Admin Studio.";

export const AI_DISCLAIMER =
  "AI interpretation. This analysis is generated/edited with AI assistance and is not an official statement by the artist.";

export const sampleAlbums = [
  {
    id: "album-ribbon-noose",
    slug: "ribbon-noose",
    title: "Ribbon Noose",
    title_ja: "",
    romanized_title: "",
    release_year: "—",
    cover_url: "",
    cover_glyph: "R",
    description:
      "Album entry supplied by the site owner. Cover artwork, release date and track list are pending administrator input.",
    status: "published",
    is_sample: true,
    created_at: NOW
  },
  {
    id: "album-calendar-scars",
    slug: "calendar-scars",
    title: "Calendar Scars",
    title_ja: "",
    romanized_title: "",
    release_year: "—",
    cover_url: "",
    cover_glyph: "C",
    description:
      "Album entry supplied by the site owner. Cover artwork, release date and track list are pending administrator input.",
    status: "published",
    is_sample: true,
    created_at: NOW
  },
  {
    id: "album-stage-of-split-queens",
    slug: "stage-of-split-queens",
    title: "Stage of Split Queens",
    title_ja: "",
    romanized_title: "",
    release_year: "—",
    cover_url: "",
    cover_glyph: "S",
    description:
      "Album entry supplied by the site owner. Cover artwork, release date and track list are pending administrator input.",
    status: "published",
    is_sample: true,
    created_at: NOW
  },
  {
    id: "album-kanojo-wa-watashi-no-ginga-datta",
    slug: "kanojo-wa-watashi-no-ginga-datta",
    title: "彼女は私の銀河だった",
    title_ja: "彼女は私の銀河だった",
    romanized_title: "Kanojo wa Watashi no Ginga Datta",
    release_year: "—",
    cover_url: "",
    cover_glyph: "銀",
    description:
      "Album entry supplied by the site owner. Cover artwork, release date and track list are pending administrator input.",
    status: "published",
    is_sample: true,
    created_at: NOW
  }
];

export const sampleSongs = [
  {
    id: "song-sample-01",
    slug: "sample-track-01",
    title: "Sample Track 01",
    title_ja: "",
    album_id: "album-ribbon-noose",
    track_number: 1,
    duration_seconds: 42,
    audio_url: "/sample/sample-tone.mp3",
    spotify_embed_url: "",
    youtube_embed_url: "",
    external_links: [],
    cover_url: "",
    credits: "",
    description:
      "Placeholder track used to demonstrate the player, karaoke timing and decode layout. It is a short generated tone, not music by the artist.",
    status: "published",
    is_sample: true,
    created_at: NOW
  },
  {
    id: "song-sample-02",
    slug: "sample-track-02",
    title: "Sample Track 02 (no media yet)",
    title_ja: "",
    album_id: "album-kanojo-wa-watashi-no-ginga-datta",
    track_number: 1,
    duration_seconds: 0,
    audio_url: "",
    spotify_embed_url: "",
    youtube_embed_url: "",
    external_links: [],
    cover_url: "",
    credits: "",
    description:
      "Placeholder entry showing how a song looks before the administrator adds audio, embeds and lyrics.",
    status: "published",
    is_sample: true,
    created_at: NOW
  }
];

const sampleLine = (index, start, end) => ({
  id: `line-sample-01-${index}`,
  song_id: "song-sample-01",
  line_index: index,
  original: `プレースホルダー行 ${index + 1}`,
  romanization: `purēsuborudā gyō ${index + 1}`,
  translation: `Placeholder line ${index + 1}`,
  pronunciation: `puh-REH-soo-boh-roo-dah gyoh ${index + 1}`,
  start_ms: start,
  end_ms: end
});

export const sampleLyricLines = [
  sampleLine(0, 2000, 6000),
  sampleLine(1, 6000, 10000),
  sampleLine(2, 10000, 14000),
  sampleLine(3, 14000, 18000),
  sampleLine(4, 18000, 22000),
  sampleLine(5, 22000, 26000)
];

export const sampleVocabulary = [
  {
    id: "vocab-sample-1",
    song_id: "song-sample-01",
    term: "銀河",
    reading: "ぎんが",
    romaji: "ginga",
    meaning: "galaxy",
    notes: "Sample vocabulary entry.",
    line_index: 0
  },
  {
    id: "vocab-sample-2",
    song_id: "song-sample-01",
    term: "彼女",
    reading: "かのじょ",
    romaji: "kanojo",
    meaning: "she / girlfriend",
    notes: "Sample vocabulary entry.",
    line_index: 1
  },
  {
    id: "vocab-sample-3",
    song_id: "song-sample-01",
    term: "夢",
    reading: "ゆめ",
    romaji: "yume",
    meaning: "dream",
    notes: "Sample vocabulary entry.",
    line_index: 2
  }
];

const sampleAnalysisText =
  "Sample placeholder. The administrator has not supplied an approved interpretation for this field yet, so nothing is asserted here.";

export const sampleAnalyses = [
  {
    song_id: "song-sample-01",
    story: sampleAnalysisText,
    verses: sampleAnalysisText,
    metaphors: sampleAnalysisText,
    symbolism: sampleAnalysisText,
    emotions: sampleAnalysisText,
    production: sampleAnalysisText,
    themes: sampleAnalysisText,
    connections: sampleAnalysisText,
    is_ai_generated: true,
    disclaimer: AI_DISCLAIMER,
    updated_at: NOW
  }
];

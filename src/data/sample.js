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
    release_type: "album_track",
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
    release_type: "single",
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

const SAMPLE_LINES = [
  {
    original: "夜のステージに 光がともる",
    romanization: "yoru no sutēji ni hikari ga tomoru",
    pronunciation: "YO-ru no SU-TEH-ji ni hi-KA-ri ga to-MO-ru",
    translation: "Lights come on across the night stage"
  },
  {
    original: "リボンはほどけて 息が止まる",
    romanization: "ribon wa hodokete iki ga tomaru",
    pronunciation: "RI-bon wa ho-DO-ke-te I-ki ga to-MA-ru",
    translation: "The ribbon comes undone and my breath stops"
  },
  {
    original: "数えきれない傷を 抱いて歌う",
    romanization: "kazoekirenai kizu o daite utau",
    pronunciation: "ka-ZO-e-ki-re-NA-i KI-zu o DA-i-te u-TA-u",
    translation: "I sing while holding wounds I cannot count"
  },
  {
    original: "それでも声は まだ消えない",
    romanization: "soredemo koe wa mada kienai",
    pronunciation: "so-RE-de-mo KO-e wa ma-DA ki-e-NA-i",
    translation: "Even so, my voice has not disappeared"
  },
  {
    original: "わたしの銀河は ここにある",
    romanization: "watashi no ginga wa koko ni aru",
    pronunciation: "wa-TA-shi no GIN-ga wa KO-ko ni A-ru",
    translation: "My galaxy is right here"
  },
  {
    original: "幕が上がる わたしはわたしでいい",
    romanization: "maku ga agaru watashi wa watashi de ii",
    pronunciation: "MA-ku ga a-GA-ru wa-TA-shi wa wa-TA-shi de I-i",
    translation: "The curtain rises: being myself is enough"
  }
];

/** Sample timings so the karaoke view has something to follow. */
export const sampleLyricLines = SAMPLE_LINES.map((line, index) => ({
  id: `line-sample-01-${index}`,
  song_id: "song-sample-01",
  line_index: index,
  original: line.original,
  romanization: line.romanization,
  translation: line.translation,
  pronunciation: line.pronunciation,
  start_ms: 2000 + index * 4000,
  end_ms: 6000 + index * 4000
}));

export const sampleVocabulary = [
  {
    id: "vocab-sample-1",
    song_id: "song-sample-01",
    term: "銀河",
    reading: "ぎんが",
    romaji: "ginga",
    meaning: "galaxy",
    notes: "Sample entry: the image the chorus builds the whole song around.",
    line_index: 4
  },
  {
    id: "vocab-sample-2",
    song_id: "song-sample-01",
    term: "傷",
    reading: "きず",
    romaji: "kizu",
    meaning: "wound / scar",
    notes: "Sample entry: literally a wound, often used for emotional damage.",
    line_index: 2
  },
  {
    id: "vocab-sample-3",
    song_id: "song-sample-01",
    term: "声",
    reading: "こえ",
    romaji: "koe",
    meaning: "voice",
    notes: "Sample entry: sung 'koe', not 'sei' — the singing voice.",
    line_index: 3
  },
  {
    id: "vocab-sample-4",
    song_id: "song-sample-01",
    term: "幕",
    reading: "まく",
    romaji: "maku",
    meaning: "curtain (of a stage)",
    notes: "Sample entry: stage vocabulary that ties the song to a performance.",
    line_index: 5
  },
  {
    id: "vocab-sample-5",
    song_id: "song-sample-01",
    term: "ほどける",
    reading: "ほどける",
    romaji: "hodokeru",
    meaning: "to come untied / to come loose",
    notes: "Sample entry: an intransitive verb, so the ribbon unties itself.",
    line_index: 1
  },
  {
    id: "vocab-sample-6",
    song_id: "song-sample-01",
    term: "ともる",
    reading: "ともる",
    romaji: "tomoru",
    meaning: "to be lit (of a light)",
    notes: "Sample entry: used for lights and lanterns, softer than 'tsuku'.",
    line_index: 0
  }
];

export const sampleAnalyses = [
  {
    song_id: "song-sample-01",
    meaning:
      "AI-written sample: the song reads as a small stage ritual about being seen without armour — a performer steps into the light, loses the ribbon that keeps her composed, and decides that the version of herself that is still standing is enough.",
    story:
      "AI-written sample: three movements. The lights come up on an empty stage; the middle verses strip the performance away (the ribbon loosens, breath stops); the last lines turn the stage into a galaxy, so the room the song started in becomes the whole world it was afraid of.",
    verses:
      "AI-written sample, verse by verse. Lines 1-2 set the scene and break it in the same breath: light arrives, but the ribbon — composure — gives way. Lines 3-4 hold the wound and the voice together, refusing to choose between damage and song. Lines 5-6 resolve by enlarging the frame: the galaxy is not elsewhere, and the curtain rising is permission rather than exposure.",
    metaphors:
      "AI-written sample: the ribbon stands for the tidy self that is performed for an audience; the stopped breath is stage fright made physical; the galaxy inside the singer turns an intimate feeling into a cosmic scale, which is how the song avoids sounding like a complaint.",
    symbolism:
      "AI-written sample: the stage is a place where identity is tested in public; the rising curtain is both exposure and beginning; the light is attention, which is what the narrator both fears and asks for.",
    emotions:
      "AI-written sample: anxiety in the first half, held rather than released; defiance from line 3 onward; a quiet, unspectacular relief at the end. The emotional arc moves from breathless to breathing.",
    production:
      "AI-written sample: the lyric is built for a slow build — a sparse opening that leaves space around the voice, a fuller middle where the wounds are counted, and a wide final line that invites a lifted arrangement. Nothing here is a claim about the real recording.",
    themes:
      "AI-written sample: performance versus self, scars as evidence rather than shame, belonging, and the choice to keep singing.",
    connections:
      "AI-written sample: it shares its stage imagery with 'Stage of Split Queens', its scar language with 'Calendar Scars', and its galaxy image with 'Kanojo wa Watashi no Ginga Datta' — which is exactly the kind of link a real decode should verify against the actual songs.",
    pronunciation_guide:
      "AI-written sample: keep vowels short and even; 'sutēji' holds a long ē (SU-TEH-ji), and 'ginga' keeps a hard g in both syllables. The capitalized syllables above are the beats to land on. Japanese is mora-timed, so give each syllable roughly the same length instead of stressing words as in English.",
    is_ai_generated: true,
    disclaimer: AI_DISCLAIMER,
    updated_at: NOW
  }
];

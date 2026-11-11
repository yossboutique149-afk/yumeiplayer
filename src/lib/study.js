/**
 * Study helpers shared by the Express endpoints and the Admin Studio.
 *
 * Everything here is pure so the AI contract can be unit tested without a
 * provider key: the prompt is built here, and whatever the model returns is
 * normalised here before it ever reaches the database.
 */

export const STUDY_DISCLAIMER =
  "AI interpretation. Generated with AI assistance from the song metadata — not an official lyric, translation or artist statement.";

export const STUDY_ANALYSIS_FIELDS = [
  "meaning",
  "story",
  "verses",
  "metaphors",
  "symbolism",
  "emotions",
  "production",
  "themes",
  "connections",
  "pronunciation_guide"
];

const MAX_LINE_CHARS = 600;
const MAX_ANALYSIS_CHARS = 6000;
const MAX_LINES = 200;
const MAX_VOCABULARY = 80;

function text(value, limit) {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "string" ? value : String(value);
  return raw.replace(/\r\n/g, "\n").trim().slice(0, limit);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Normalises a model response into the shape the Studio saves:
 * `{ lines, vocabulary, analysis, disclaimer, lyricsSource }`.
 * Unknown keys are dropped and empty rows are removed so a sloppy response can
 * never corrupt the published lyrics.
 */
export function normalizeStudy(raw) {
  const source = raw && typeof raw === "object" ? raw.study || raw : {};

  const lines = list(source.lines)
    .map(line => ({
      original: text(line?.original, MAX_LINE_CHARS),
      romanization: text(line?.romanization, MAX_LINE_CHARS),
      pronunciation: text(line?.pronunciation, MAX_LINE_CHARS),
      translation: text(line?.translation, MAX_LINE_CHARS)
    }))
    .filter(line => line.original || line.translation)
    .slice(0, MAX_LINES);

  const vocabulary = list(source.vocabulary)
    .map((entry, index) => ({
      term: text(entry?.term, 120),
      reading: text(entry?.reading, 120),
      romaji: text(entry?.romaji, 120),
      meaning: text(entry?.meaning, 300),
      notes: text(entry?.notes, 400),
      line_index: Number.isFinite(Number(entry?.line_index)) ? Number(entry.line_index) : index
    }))
    .filter(entry => entry.term)
    .slice(0, MAX_VOCABULARY);

  const analysisSource = source.analysis && typeof source.analysis === "object" ? source.analysis : {};
  const analysis = {};
  STUDY_ANALYSIS_FIELDS.forEach(field => {
    analysis[field] = text(analysisSource[field], MAX_ANALYSIS_CHARS);
  });

  const lyricsSource =
    text(source.lyrics_source, 40) || (lines.length ? "ai_generated" : "not_provided");

  return {
    lines,
    vocabulary,
    analysis,
    lyricsSource,
    disclaimer: text(source.disclaimer, 400) || STUDY_DISCLAIMER
  };
}

export function studyStats(study) {
  const value = study || {};
  const lines = list(value.lines).length;
  const vocabulary = list(value.vocabulary).length;
  const analysis = value.analysis || {};
  const sections = STUDY_ANALYSIS_FIELDS.filter(field => text(analysis[field], MAX_ANALYSIS_CHARS)).length;
  return { lines, vocabulary, sections };
}

export function isStudyEmpty(study) {
  const stats = studyStats(study);
  return stats.lines === 0 && stats.sections === 0;
}

/**
 * Prompt used by POST /api/ai/study.
 *
 * The copyright rule is explicit: for a real published song the model must not
 * reproduce the lyrics, it only returns vocabulary and analysis. That keeps the
 * platform from presenting invented words as someone else's official lyrics.
 */
export function buildStudyPrompt({ song = {}, language = "ja", notes = "" } = {}) {
  const album = song.album || song.albumTitle || "standalone release";
  const system = [
    "You write study material for a music fan platform.",
    "Answer with a single JSON object and nothing else.",
    "Never claim to be the artist and never state that generated words are official lyrics.",
    "If the song is a real published work whose lyrics you do not have authorisation to reproduce,",
    "set \"lyrics_source\" to \"not_provided\", return an empty \"lines\" array and put all your value",
    "into vocabulary, pronunciation guidance and the analysis. Do not paraphrase the lyrics line by line.",
    "If the song is original, fictional or supplied by the platform owner, you may write sample lines",
    "and set \"lyrics_source\" to \"ai_generated\".",
    "Write all prose in Spanish, keep Japanese terms in Japanese script with romaji."
  ].join(" ");

  const user = [
    `Song title: ${text(song.title, 200) || "Untitled"}`,
    song.title_ja ? `Japanese title: ${text(song.title_ja, 200)}` : "",
    `Album: ${text(album, 200)}`,
    `Release type: ${text(song.release_type, 40) || "album_track"}`,
    `Primary lyric language: ${text(language, 20) || "ja"}`,
    song.description ? `Owner notes: ${text(song.description, 600)}` : "",
    notes ? `Extra instructions: ${text(notes, 600)}` : "",
    "",
    "Return exactly this JSON shape:",
    JSON.stringify(
      {
        lyrics_source: "ai_generated | not_provided",
        lines: [{ original: "", romanization: "", pronunciation: "", translation: "" }],
        vocabulary: [{ term: "", reading: "", romaji: "", meaning: "", notes: "", line_index: 0 }],
        analysis: {
          meaning: "what the song is about, in one paragraph",
          story: "narrative and setting",
          verses: "how the song develops, section by section",
          metaphors: "images and what they stand for",
          symbolism: "recurring symbols",
          emotions: "emotional arc",
          production: "sound, arrangement, vocal delivery",
          themes: "central themes",
          connections: "links to other songs of the project",
          pronunciation_guide: "how to sing the Japanese lines: readings, rhythm, tricky sounds"
        }
      },
      null,
      2
    ),
    "Keep the analysis concrete and specific to this title; never invent chart positions, awards or quotes."
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

/**
 * Spreads lines evenly across the uploaded audio so karaoke works immediately
 * after a study is generated. Timings stay null when there is no audio.
 */
export function distributeTimings(lines = [], durationSeconds = 0) {
  const rows = list(lines);
  const duration = Number(durationSeconds);
  if (!rows.length || !Number.isFinite(duration) || duration <= 0) {
    return rows.map(line => ({ ...line, start_ms: null, end_ms: null }));
  }
  const total = duration * 1000;
  const slot = total / rows.length;
  return rows.map((line, index) => {
    const start = Math.round(index * slot);
    const end = Math.round((index + 1) * slot) - 200;
    return {
      ...line,
      start_ms: start,
      end_ms: Math.max(start + 400, Math.min(end, Math.round(total)))
    };
  });
}

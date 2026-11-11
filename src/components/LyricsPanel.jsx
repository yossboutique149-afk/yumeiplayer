import { useState } from "react";
import { Languages, Music4, Type } from "lucide-react";
import { formatTimecode } from "../lib/format.js";
import { hasTiming } from "../lib/karaoke.js";

/**
 * Static lyric reader. Lines come only from the administrator; nothing is
 * generated here. Timed lines expose a seek button when audio exists.
 */
export default function LyricsPanel({ lines = [], onSeek = null, activeIndex = -1 }) {
  const [showTranslation, setShowTranslation] = useState(true);
  const [showRomaji, setShowRomaji] = useState(true);
  const [showPronunciation, setShowPronunciation] = useState(false);

  if (!lines.length) {
    return (
      <div className="lyric-empty">
        <Music4 size={20} />
        <p>
          No lyrics have been published for this song yet. Lyrics are only shown when
          the administrator supplies them — nothing is generated or guessed.
        </p>
      </div>
    );
  }

  return (
    <div className="lyrics-panel">
      <div className="toolbar">
        <button
          type="button"
          className={`chip${showTranslation ? " is-active" : ""}`}
          onClick={() => setShowTranslation(value => !value)}
          aria-pressed={showTranslation}
        >
          <Languages size={14} /> Translation
        </button>
        <button
          type="button"
          className={`chip${showRomaji ? " is-active" : ""}`}
          onClick={() => setShowRomaji(value => !value)}
          aria-pressed={showRomaji}
        >
          <Type size={14} /> Romaji
        </button>
        <button
          type="button"
          className={`chip${showPronunciation ? " is-active" : ""}`}
          onClick={() => setShowPronunciation(value => !value)}
          aria-pressed={showPronunciation}
        >
          <Music4 size={14} /> Pronunciation
        </button>
      </div>

      <div className="lyric-lines">
        {lines.map((line, index) => (
          <div
            key={line.id || index}
            className={`lyric-line${index === activeIndex ? " is-active" : ""}`}
          >
            {hasTiming(line) && (
              <button
                type="button"
                className="lyric-time"
                onClick={() => onSeek?.(Number(line.start_ms))}
                disabled={!onSeek}
                aria-label={`Seek to ${formatTimecode(line.start_ms)}`}
              >
                {formatTimecode(line.start_ms)}
              </button>
            )}

            <p className="lyric-original jp">{line.original || "—"}</p>
            {showRomaji && line.romanization && (
              <p className="lyric-romaji">{line.romanization}</p>
            )}
            {showTranslation && line.translation && (
              <p className="lyric-translation">{line.translation}</p>
            )}
            {showPronunciation && line.pronunciation && (
              <p className="lyric-pronunciation">{line.pronunciation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

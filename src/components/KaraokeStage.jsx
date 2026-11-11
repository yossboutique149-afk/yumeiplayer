import { useEffect, useMemo, useRef } from "react";
import { AlertCircle, Mic2 } from "lucide-react";
import { findActiveLineIndex, isKaraokeReady, karaokeProgress, sortLines } from "../lib/karaoke.js";
import { formatTimecode } from "../lib/format.js";

/**
 * Karaoke view. It only synchronises lyrics against audio uploaded through the
 * studio: songs without an uploaded file (or without timings) get an honest
 * explanation instead of fake highlighting.
 */
export default function KaraokeStage({ song, lines = [], timeMs = 0, playing = false, onSeek = null }) {
  const containerRef = useRef(null);
  const activeRef = useRef(null);
  const ordered = useMemo(() => sortLines(lines), [lines]);
  const ready = isKaraokeReady(song, ordered);
  const activeIndex = ready ? findActiveLineIndex(ordered, timeMs) : -1;

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeIndex]);

  if (!ready) {
    const reason = !song?.audio_url
      ? "Karaoke needs an audio file uploaded by the administrator. This song has no uploaded audio, so nothing is synchronised."
      : "Karaoke needs timing for every line. Some lines do not have start and end times yet.";

    return (
      <div className="lyric-empty">
        <AlertCircle size={20} />
        <p>{reason}</p>
      </div>
    );
  }

  return (
    <div className="karaoke-stage" ref={containerRef} aria-live="polite">
      <div className="toolbar">
        <span className="badge badge-published">
          <Mic2 size={13} /> Synced to uploaded audio
        </span>
        <span className="tiny faint">
          {playing ? "Playing" : "Paused"} · {formatTimecode(timeMs)}
        </span>
      </div>

      {ordered.map((line, index) => {
        const isActive = index === activeIndex;
        const progress = isActive ? karaokeProgress(line, timeMs) : 0;
        return (
          <button
            key={line.id || index}
            type="button"
            ref={isActive ? activeRef : null}
            className={`karaoke-line${isActive ? " is-active" : ""}`}
            onClick={() => onSeek?.(Number(line.start_ms))}
          >
            <span className="karaoke-original jp">{line.original}</span>
            {line.romanization && <span className="karaoke-romaji">{line.romanization}</span>}
            {line.translation && <span className="karaoke-translation">{line.translation}</span>}
            {isActive && (
              <span className="karaoke-progress" aria-hidden="true">
                <span style={{ width: `${progress * 100}%` }} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

import { Link } from "react-router-dom";
import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import CoverArt from "./CoverArt.jsx";
import { usePlayer } from "../contexts/PlayerContext.jsx";
import { formatTimecode } from "../lib/format.js";

export default function PlayerBar() {
  const {
    current,
    playing,
    timeMs,
    durationMs,
    toggle,
    seek,
    next,
    previous,
    stop
  } = usePlayer();

  if (!current) return null;

  const total = durationMs || (current.duration_seconds || 0) * 1000;
  const progress = total > 0 ? Math.min((timeMs / total) * 100, 100) : 0;

  return (
    <div className="mini-player" role="region" aria-label="Audio player">
      <CoverArt item={current} className="mini-cover" />

      <div className="mini-meta">
        <Link className="mini-title" to={`/songs/${current.slug}`}>
          {current.title}
        </Link>
        <span className="mini-sub">
          {formatTimecode(timeMs)} / {total ? formatTimecode(total) : "—"}
        </span>
        <div className="mini-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="audio-controls">
        <button type="button" className="btn btn-icon btn-quiet" onClick={previous} aria-label="Previous track">
          <SkipBack size={16} />
        </button>
        <button
          type="button"
          className="btn btn-icon btn-primary"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" className="btn btn-icon btn-quiet" onClick={next} aria-label="Next track">
          <SkipForward size={16} />
        </button>
        <button
          type="button"
          className="btn btn-icon btn-quiet"
          onClick={() => seek(Math.max(0, timeMs - 5000))}
          aria-label="Rewind five seconds"
        >
          −5s
        </button>
        <button
          type="button"
          className="btn btn-icon btn-quiet"
          onClick={() => seek(Math.min(total, timeMs + 5000))}
          aria-label="Forward five seconds"
        >
          +5s
        </button>
        <button type="button" className="btn btn-icon btn-quiet" onClick={stop} aria-label="Close player">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

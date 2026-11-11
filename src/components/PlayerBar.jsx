import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import CoverArt from "./CoverArt.jsx";
import { usePlayer } from "../contexts/PlayerContext.jsx";
import { formatTimecode } from "../lib/format.js";
import { downloadTrack } from "../lib/audioLibrary.js";

export default function PlayerBar() {
  const {
    current,
    playing,
    loading,
    timeMs,
    durationMs,
    volume,
    muted,
    toggle,
    seek,
    setVolume,
    toggleMute,
    next,
    previous,
    stop
  } = usePlayer();
  const [downloadState, setDownloadState] = useState("");

  if (!current) return null;

  const total = durationMs || (current.duration_seconds || 0) * 1000;
  const progress = total > 0 ? Math.min((timeMs / total) * 100, 100) : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  async function handleDownload() {
    setDownloadState("working");
    try {
      await downloadTrack(current);
      setDownloadState("done");
      setTimeout(() => setDownloadState(""), 2500);
    } catch {
      setDownloadState("");
    }
  }

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
        <input
          className="mini-seek"
          type="range"
          min="0"
          max={total || 1}
          step="500"
          value={Math.min(timeMs, total || 1)}
          onChange={event => seek(Number(event.target.value))}
          aria-label="Seek within the track"
          style={{ "--progress": `${progress}%` }}
        />
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
          {loading ? <Loader2 size={16} className="spin" /> : playing ? <Pause size={16} /> : <Play size={16} />}
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

        <button
          type="button"
          className="btn btn-icon btn-quiet"
          onClick={handleDownload}
          aria-label={`Download ${current.title}`}
          title="Download this track"
        >
          <Download size={16} />
        </button>

        <button
          type="button"
          className="btn btn-icon btn-quiet volume-button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          <VolumeIcon size={16} />
        </button>
        <input
          className="mini-volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          onChange={event => setVolume(Number(event.target.value))}
          aria-label="Volume"
        />

        <button type="button" className="btn btn-icon btn-quiet" onClick={stop} aria-label="Close player">
          <X size={16} />
        </button>
      </div>

      {downloadState === "done" && <span className="mini-download-note">Saved</span>}
    </div>
  );
}

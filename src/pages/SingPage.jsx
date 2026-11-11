import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mic2, Pause, Play, RotateCcw } from "lucide-react";
import { repo } from "../lib/dataClient.js";
import { useContent } from "../contexts/ContentContext.jsx";
import { usePlayer } from "../contexts/PlayerContext.jsx";
import KaraokeStage from "../components/KaraokeStage.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { isKaraokeReady } from "../lib/karaoke.js";
import { formatDuration } from "../lib/format.js";

export default function SingPage() {
  const { songs, loading } = useContent();
  const { current, playing, timeMs, play, toggle, seek } = usePlayer();
  const [ready, setReady] = useState([]);
  const [checking, setChecking] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let active = true;
    const candidates = songs.filter(song => song.audio_url);
    setChecking(true);
    Promise.all(
      candidates.map(song =>
        repo
          .getSongBundle(song)
          .then(bundle => ({ song, lines: bundle.lines }))
          .catch(() => null)
      )
    ).then(rows => {
      if (!active) return;
      const usable = rows.filter(row => row && isKaraokeReady(row.song, row.lines));
      setReady(usable);
      setSelectedId(prev => (prev && usable.some(row => row.song.id === prev) ? prev : usable[0]?.song.id || null));
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [songs]);

  const selected = useMemo(
    () => ready.find(row => row.song.id === selectedId) || null,
    [ready, selectedId]
  );

  const isCurrent = selected && current?.id === selected.song.id;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Sing along</span>
          <h1>Sing with Yumei</h1>
          <p className="muted small">
            Karaoke synchronisation works only for songs with uploaded audio and timing on every
            line. Nothing is guessed: if a line has no timings, this page says so instead of
            faking a highlight.
          </p>
        </div>
      </div>

      {loading || checking ? (
        <div className="skeleton" style={{ height: 260 }} />
      ) : !ready.length ? (
        <EmptyState title="No karaoke-ready songs yet">
          A song becomes singable when the administrator uploads its audio file and gives every
          lyric line a start and end time in Admin Studio → Lyrics.{" "}
          <Link to="/music">Browse the music library</Link> in the meantime.
        </EmptyState>
      ) : (
        <div className="sing-layout">
          <aside className="panel stack side-stack">
            <h2 className="row">
              <Mic2 size={18} /> Ready to sing
            </h2>
            <p className="tiny faint">{ready.length} song(s) with timed lyrics</p>

            <div className="stack">
              {ready.map(row => (
                <button
                  key={row.song.id}
                  type="button"
                  className={`chip${row.song.id === selectedId ? " is-active" : ""}`}
                  onClick={() => setSelectedId(row.song.id)}
                >
                  {row.song.title}
                  {row.song.duration_seconds ? ` · ${formatDuration(row.song.duration_seconds)}` : ""}
                </button>
              ))}
            </div>
          </aside>

          <section className="panel stack">
            {selected && (
              <>
                <div className="section-head">
                  <div>
                    <h2>{selected.song.title}</h2>
                    <p className="tiny faint">
                      {selected.lines.length} timed lines · uploaded audio
                    </p>
                  </div>
                  <Link className="btn btn-quiet btn-sm" to={`/songs/${selected.song.slug}`}>
                    Song page
                  </Link>
                </div>

                <div className="sing-controls">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => (isCurrent ? toggle() : play(selected.song, ready.map(row => row.song)))}
                  >
                    {isCurrent && playing ? <Pause size={16} /> : <Play size={16} />}
                    {isCurrent && playing ? "Pause" : "Start singing"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => seek(0)}
                    disabled={!isCurrent}
                  >
                    <RotateCcw size={15} /> Restart
                  </button>
                </div>

                <KaraokeStage
                  song={selected.song}
                  lines={selected.lines}
                  timeMs={isCurrent ? timeMs : 0}
                  playing={Boolean(isCurrent && playing)}
                  onSeek={ms => (isCurrent ? seek(ms) : play(selected.song, ready.map(row => row.song)))}
                />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

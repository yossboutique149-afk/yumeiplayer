import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ExternalLink,
  Heart,
  Music4,
  Pause,
  Pencil,
  Play,
  Sparkles
} from "lucide-react";
import { repo } from "../lib/dataClient.js";
import { useContent } from "../contexts/ContentContext.jsx";
import { usePlayer } from "../contexts/PlayerContext.jsx";
import { useFavorites } from "../contexts/FavoritesContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import CoverArt from "../components/CoverArt.jsx";
import LyricsPanel from "../components/LyricsPanel.jsx";
import KaraokeStage from "../components/KaraokeStage.jsx";
import EmbedFrame from "../components/EmbedFrame.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { AiBadge, SampleBadge, StatusBadge } from "../components/Badges.jsx";
import { formatDuration, formatTimecode } from "../lib/format.js";
import { findActiveLineIndex, isKaraokeReady } from "../lib/karaoke.js";

const TABS = [
  ["lyrics", "Lyrics"],
  ["karaoke", "Karaoke"],
  ["decode", "Song Decode"],
  ["vocabulary", "Vocabulary"],
  ["media", "Audio & Links"]
];

const ANALYSIS_FIELDS = [
  ["meaning", "What it means"],
  ["story", "Story"],
  ["verses", "Verse by verse"],
  ["metaphors", "Metaphors"],
  ["symbolism", "Symbolism"],
  ["emotions", "Emotions"],
  ["production", "Production"],
  ["themes", "Themes"],
  ["connections", "Connections to other songs"],
  ["pronunciation_guide", "How to sing it"]
];

function safeLink(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export default function SongDetailPage() {
  const { slug } = useParams();
  const { songs, albums, albumById, loading, refresh } = useContent();
  const { current, playing, timeMs, durationMs, play, toggle, seek } = usePlayer();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { isStaff } = useAuth();

  const [tab, setTab] = useState("lyrics");
  const [bundle, setBundle] = useState({ lines: [], vocabulary: [], analysis: null });
  const [bundleLoading, setBundleLoading] = useState(true);

  const song = useMemo(() => songs.find(item => item.slug === slug) || null, [songs, slug]);
  const album = song?.album_id ? albumById(song.album_id) : null;
  const albumSongs = useMemo(
    () =>
      song?.album_id
        ? songs
            .filter(item => item.album_id === song.album_id)
            .sort((a, b) => Number(a.track_number || 0) - Number(b.track_number || 0))
        : [song],
    [songs, song]
  );

  useEffect(() => {
    let active = true;
    if (!song) {
      setBundleLoading(false);
      return undefined;
    }
    setBundleLoading(true);
    repo
      .getSongBundle(song, { includeDrafts: isStaff })
      .then(result => {
        if (active) setBundle(result);
      })
      .catch(() => {
        if (active) setBundle({ lines: [], vocabulary: [], analysis: null });
      })
      .finally(() => {
        if (active) setBundleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [song?.id, isStaff]);

  if (loading) {
    return (
      <div className="page">
        <div className="panel center stack">
          <span className="spinner" aria-hidden="true" />
          <p className="muted small">Loading song…</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="page page-narrow">
        <EmptyState title="Song not found">
          This song may be unpublished or removed.{" "}
          <Link to="/music">Back to the music library</Link>.
        </EmptyState>
      </div>
    );
  }

  const isCurrent = current?.id === song.id;
  const favorite = isFavorite(song.id);
  const totalMs = (song.duration_seconds || 0) * 1000 || (isCurrent ? durationMs : 0);
  const activeLine = isCurrent ? findActiveLineIndex(bundle.lines, timeMs) : -1;
  const karaokeReady = isKaraokeReady(song, bundle.lines);
  const analysis = bundle.analysis;
  const links = (song.external_links || []).map(link => ({
    label: link.label || link.url,
    url: safeLink(link.url)
  }));

  const handlePlay = () => {
    if (!song.audio_url) return;
    if (isCurrent) toggle();
    else play(song, albumSongs);
  };

  return (
    <div className="page">
      <section className="song-hero">
        <CoverArt item={song} className="album-cover" />

        <div className="song-hero-copy">
          <div className="row">
            <StatusBadge status={song.status} />
            <SampleBadge show={song.is_sample} />
            {song.release_type === "single" && <span className="badge">Single</span>}
          </div>

          <h1 className="song-hero-title">{song.title}</h1>
          {song.title_ja && <p className="song-hero-jp jp">{song.title_ja}</p>}

          <p className="song-hero-meta small muted">
            {album ? (
              <Link to={`/albums/${album.slug}`}>{album.title}</Link>
            ) : (
              "Standalone release"
            )}
            {song.track_number ? ` · Track ${song.track_number}` : ""}
            {song.duration_seconds ? ` · ${formatDuration(song.duration_seconds)}` : ""}
          </p>

          {song.description && <p className="small muted pre-line">{song.description}</p>}

          <div className="song-hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePlay}
              disabled={!song.audio_url}
              title={song.audio_url ? "Play audio" : "No audio uploaded for this song"}
            >
              {isCurrent && playing ? <Pause size={16} /> : <Play size={16} />}
              {isCurrent && playing ? "Pause" : "Play audio"}
            </button>

            <button
              type="button"
              className={`btn btn-ghost${favorite ? " is-active" : ""}`}
              onClick={() => toggleFavorite(song.id)}
              aria-pressed={favorite}
            >
              <Heart size={16} fill={favorite ? "currentColor" : "none"} />
              {favorite ? "Saved" : "Add to favorites"}
            </button>

            {isStaff && (
              <Link className="btn btn-quiet" to={`/studio/songs?edit=${song.id}`}>
                <Pencil size={15} /> Edit
              </Link>
            )}
          </div>

          {!song.audio_url && (
            <p className="field-hint">
              No audio file has been uploaded for this song, so the player stays disabled and
              karaoke cannot synchronise.
            </p>
          )}
        </div>
      </section>

      <section className="panel stack">
        <div className="audio-player">
          <button
            type="button"
            className="btn btn-icon btn-primary audio-play"
            onClick={handlePlay}
            disabled={!song.audio_url}
            aria-label={isCurrent && playing ? "Pause audio" : "Play audio"}
          >
            {isCurrent && playing ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <input
            className="audio-seek"
            type="range"
            min="0"
            max={totalMs || 1000}
            value={isCurrent ? Math.min(timeMs, totalMs || 1000) : 0}
            onChange={event => seek(Number(event.target.value))}
            disabled={!song.audio_url}
            aria-label="Seek audio"
          />

          <div className="audio-times">
            {formatTimecode(isCurrent ? timeMs : 0)} / {totalMs ? formatTimecode(totalMs) : "—"}
          </div>
        </div>
        <p className="tiny faint">
          Original audio is played from the file the administrator uploaded to YUMEIKA storage.
        </p>
      </section>

      <div className="tabs" role="tablist" aria-label="Song sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`tab${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "lyrics" && (
        <section className="panel stack">
          <h2>Lyrics</h2>
          <p className="tiny faint">
            Lines, translations, romaji and pronunciation are published by the administrator.
            Nothing here is generated automatically.
          </p>
          {bundleLoading ? (
            <div className="skeleton" style={{ height: 120 }} />
          ) : (
            <LyricsPanel
              lines={bundle.lines}
              activeIndex={activeLine}
              onSeek={song.audio_url ? ms => (isCurrent ? seek(ms) : play(song, albumSongs)) : null}
            />
          )}
        </section>
      )}

      {tab === "karaoke" && (
        <section className="panel stack">
          <h2>Karaoke</h2>
          <div className="sing-controls">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (isCurrent ? toggle() : play(song, albumSongs))}
              disabled={!karaokeReady}
            >
              {isCurrent && playing ? <Pause size={16} /> : <Play size={16} />}
              {isCurrent && playing ? "Pause" : "Start karaoke"}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => seek(0)}
              disabled={!isCurrent}
            >
              Restart
            </button>
            <span className="tiny faint">
              {karaokeReady
                ? "Timings come from the uploaded audio file."
                : "Requires uploaded audio plus start/end times on every line."}
            </span>
          </div>

          <KaraokeStage
            song={song}
            lines={bundle.lines}
            timeMs={isCurrent ? timeMs : 0}
            playing={isCurrent && playing}
            onSeek={ms => (isCurrent ? seek(ms) : play(song, albumSongs))}
          />
        </section>
      )}

      {tab === "decode" && (
        <section className="panel stack">
          <div className="row between">
            <h2>Song Decode</h2>
            {analysis?.is_ai_generated && <AiBadge />}
          </div>

          {!analysis ? (
            <EmptyState title="No analysis published yet">
              The administrator has not written an analysis for this song. No interpretation is
              invented on the fan platform.
            </EmptyState>
          ) : (
            <>
              {analysis.is_ai_generated && (
                <div className="notice">
                  <strong>AI interpretation.</strong>{" "}
                  {analysis.disclaimer ||
                    "This analysis was produced with AI assistance and is not an official artist statement."}
                </div>
              )}

              {ANALYSIS_FIELDS.map(([key, label]) => (
                <article className="analysis-section" key={key}>
                  <h3>{label}</h3>
                  <p className="pre-line muted">
                    {analysis[key] || "Not provided by the administrator."}
                  </p>
                </article>
              ))}
            </>
          )}
        </section>
      )}

      {tab === "vocabulary" && (
        <section className="panel stack">
          <h2>Vocabulary</h2>
          {bundle.vocabulary.length ? (
            <div className="vocab-list">
              {bundle.vocabulary.map(entry => (
                <div className="vocab-item" key={entry.id || entry.term}>
                  <div className="row between">
                    <span className="vocab-term jp">{entry.term}</span>
                    {entry.romaji && <span className="badge">{entry.romaji}</span>}
                  </div>
                  {entry.reading && <div className="tiny faint jp">{entry.reading}</div>}
                  <p className="vocab-meaning">{entry.meaning}</p>
                  {entry.notes && <p className="tiny faint">{entry.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No vocabulary yet">
              Vocabulary entries are added by the administrator alongside the lyrics.
            </EmptyState>
          )}
        </section>
      )}

      {tab === "media" && (
        <section className="panel stack">
          <h2>Audio &amp; official links</h2>

          {song.audio_url ? (
            <div className="stack">
              <h3>Uploaded audio</h3>
              <audio controls preload="none" src={song.audio_url} className="audio-native">
                Your browser does not support audio playback.
              </audio>
              <a className="tiny faint" href={song.audio_url} target="_blank" rel="noreferrer noopener">
                Open the audio file directly
              </a>
            </div>
          ) : (
            <div className="notice">
              <Music4 size={15} /> No audio file uploaded. The administrator can add one in the
              Admin Studio under Songs → Audio.
            </div>
          )}

          {song.spotify_embed_url && (
            <div className="stack">
              <h3>Spotify</h3>
              <EmbedFrame url={song.spotify_embed_url} title={`${song.title} on Spotify`} />
            </div>
          )}

          {song.youtube_embed_url && (
            <div className="stack">
              <h3>YouTube</h3>
              <EmbedFrame url={song.youtube_embed_url} title={`${song.title} on YouTube`} />
            </div>
          )}

          {links.length > 0 && (
            <div className="stack">
              <h3>External links</h3>
              <div className="link-grid">
                {links.map((link, index) =>
                  link.url ? (
                    <a
                      className="link-card"
                      key={`${link.url}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {link.label} <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span className="link-card" key={`${link.label}-${index}`}>
                      {link.label} — invalid link
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {!song.audio_url && !song.spotify_embed_url && !song.youtube_embed_url && !links.length && (
            <EmptyState title="No media configured">
              No audio, embed or external link has been added for this song yet.
            </EmptyState>
          )}

          <div className="divider" />

          <dl className="meta-list">
            <div className="meta-row">
              <dt>Track</dt>
              <dd>{song.track_number || "—"}</dd>
            </div>
            <div className="meta-row">
              <dt>Duration</dt>
              <dd>{song.duration_seconds ? formatDuration(song.duration_seconds) : "—"}</dd>
            </div>
            <div className="meta-row">
              <dt>Album</dt>
              <dd>{album ? album.title : "Standalone release"}</dd>
            </div>
            <div className="meta-row">
              <dt>Credits</dt>
              <dd>{song.credits || "Not provided by the administrator."}</dd>
            </div>
          </dl>
        </section>
      )}

      {isStaff && (
        <div className="notice">
          <Sparkles size={15} /> You are signed in to the studio.{" "}
          <Link to={`/studio/lyrics?song=${song.id}`}>Edit lyrics</Link> ·{" "}
          <Link to={`/studio/decode?song=${song.id}`}>Edit decode</Link> ·{" "}
          <button type="button" className="btn btn-quiet btn-sm" onClick={refresh}>
            Refresh catalogue
          </button>
        </div>
      )}

      {albums.length === 0 && (
        <p className="tiny faint">No albums are published yet.</p>
      )}
    </div>
  );
}

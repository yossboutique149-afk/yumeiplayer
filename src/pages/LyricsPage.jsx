import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Search } from "lucide-react";
import { repo } from "../lib/dataClient.js";
import { useContent } from "../contexts/ContentContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { SampleBadge } from "../components/Badges.jsx";
import { matchesQuery, pluralize } from "../lib/format.js";

const MAX_INDEXED = 80;

export default function LyricsPage() {
  const { songs, loading } = useContent();
  const { isStaff } = useAuth();
  const [bundles, setBundles] = useState({});
  const [indexing, setIndexing] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    setIndexing(true);
    Promise.all(
      songs.slice(0, MAX_INDEXED).map(song =>
        repo
          .getSongBundle(song, { includeDrafts: isStaff })
          .then(bundle => [song.id, bundle])
          .catch(() => [song.id, null])
      )
    ).then(pairs => {
      if (!active) return;
      setBundles(Object.fromEntries(pairs));
      setIndexing(false);
    });
    return () => {
      active = false;
    };
  }, [songs, isStaff]);

  const entries = useMemo(
    () =>
      songs
        .map(song => ({ song, bundle: bundles[song.id] }))
        .filter(entry => entry.bundle && entry.bundle.lines.length > 0)
        .filter(entry =>
          matchesQuery(
            query,
            entry.song.title,
            entry.song.title_ja,
            ...entry.bundle.lines.flatMap(line => [line.original, line.translation, line.romanization])
          )
        ),
    [songs, bundles, query]
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Words &amp; meanings</span>
          <h1>Lyrics</h1>
          <p className="muted small">
            Every line here was supplied by the administrator: original text, line-by-line
            translation, Japanese romanisation and pronunciation. Nothing is generated on the
            fan platform.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search a word, a line or a song title…"
            aria-label="Search lyrics"
          />
        </label>
        <span className="tiny faint">
          {indexing ? "Indexing published lyrics…" : pluralize(entries.length, "song")}
        </span>
      </div>

      {loading || indexing ? (
        <div className="stack">
          {[0, 1, 2].map(key => (
            <div className="skeleton" key={key} style={{ height: 76 }} />
          ))}
        </div>
      ) : entries.length ? (
        <div className="stack">
          {entries.map(({ song, bundle }) => {
            const preview = bundle.lines.find(line => line.original) || bundle.lines[0];
            return (
              <Link className="admin-card lyrics-index-card" key={song.id} to={`/songs/${song.slug}`}>
                <div className="row between">
                  <h3 className="row">
                    <BookOpen size={16} /> {song.title}
                    <SampleBadge show={song.is_sample} />
                  </h3>
                  <span className="tiny faint">{pluralize(bundle.lines.length, "line")}</span>
                </div>
                {song.title_ja && <div className="jp tiny faint">{song.title_ja}</div>}
                <p className="jp small muted">{preview?.original}</p>
                {preview?.translation && (
                  <p className="small faint">{preview.translation}</p>
                )}
                <span className="tiny">Open lyrics →</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No published lyrics found">
          {query
            ? "No lyric line matches that search."
            : "Lyrics appear once the administrator publishes them in the Admin Studio."}
        </EmptyState>
      )}
    </div>
  );
}

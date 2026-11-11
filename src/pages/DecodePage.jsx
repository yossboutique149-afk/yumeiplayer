import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { repo } from "../lib/dataClient.js";
import { useContent } from "../contexts/ContentContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { AiBadge } from "../components/Badges.jsx";
import { pluralize } from "../lib/format.js";

const SECTIONS = [
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

export default function DecodePage() {
  const { songs, loading } = useContent();
  const [entries, setEntries] = useState([]);
  const [decoding, setDecoding] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let active = true;
    setDecoding(true);
    Promise.all(
      songs.map(song =>
        repo
          .getSongBundle(song)
          .then(bundle => ({ song, analysis: bundle.analysis }))
          .catch(() => null)
      )
    ).then(rows => {
      if (!active) return;
      const usable = rows.filter(row => row && row.analysis);
      setEntries(usable);
      setSelectedId(prev => (prev && usable.some(row => row.song.id === prev) ? prev : usable[0]?.song.id || null));
      setDecoding(false);
    });
    return () => {
      active = false;
    };
  }, [songs]);

  const selected = useMemo(
    () => entries.find(entry => entry.song.id === selectedId) || null,
    [entries, selectedId]
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Words &amp; meanings</span>
          <h1>Song Decode</h1>
          <p className="muted small">
            Story, verses, metaphors, symbolism, emotions, production, themes and connections.
            Interpretations written with AI assistance are labelled and never presented as
            official artist statements.
          </p>
        </div>
      </div>

      {loading || decoding ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : !entries.length ? (
        <EmptyState title="No song decode published yet">
          The administrator writes each analysis in Admin Studio → Song Decode. Nothing is
          generated automatically here.
        </EmptyState>
      ) : (
        <div className="detail-grid">
          <aside className="panel stack side-stack">
            <h2 className="row">
              <Sparkles size={18} /> Analysed songs
            </h2>
            <p className="tiny faint">{pluralize(entries.length, "song")}</p>
            <div className="stack">
              {entries.map(entry => (
                <button
                  key={entry.song.id}
                  type="button"
                  className={`chip${entry.song.id === selectedId ? " is-active" : ""}`}
                  onClick={() => setSelectedId(entry.song.id)}
                >
                  {entry.song.title}
                </button>
              ))}
            </div>
          </aside>

          {selected && (
            <section className="panel stack">
              <div className="section-head">
                <div>
                  <h2>{selected.song.title}</h2>
                  <div className="row">
                    {selected.analysis.is_ai_generated && <AiBadge />}
                    <Link className="tiny" to={`/songs/${selected.song.slug}`}>
                      Open song page →
                    </Link>
                  </div>
                </div>
              </div>

              {selected.analysis.is_ai_generated && (
                <div className="notice">
                  <strong>AI interpretation.</strong>{" "}
                  {selected.analysis.disclaimer ||
                    "This analysis was produced with AI assistance and is not an official artist statement."}
                </div>
              )}

              {SECTIONS.map(([key, label]) => (
                <article className="analysis-section" key={key}>
                  <h3>{label}</h3>
                  <p className="pre-line muted">
                    {selected.analysis[key] || "Not provided by the administrator."}
                  </p>
                </article>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

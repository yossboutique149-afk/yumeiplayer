import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Compass, Dices, Disc3, Music2, Sparkles } from "lucide-react";
import { repo } from "../lib/dataClient.js";
import { useContent } from "../contexts/ContentContext.jsx";
import AlbumCard from "../components/AlbumCard.jsx";
import CoverArt from "../components/CoverArt.jsx";
import { SampleBadge } from "../components/Badges.jsx";

export default function ExplorePage() {
  const { albums, songs, songsForAlbum, loading } = useContent();
  const navigate = useNavigate();
  const [themes, setThemes] = useState([]);
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all(
      songs.map(song =>
        repo
          .getSongBundle(song)
          .then(bundle => bundle)
          .catch(() => null)
      )
    ).then(bundles => {
      if (!active) return;
      const themeSet = new Set();
      const termSet = new Map();
      bundles.filter(Boolean).forEach(bundle => {
        const raw = bundle.analysis?.themes || "";
        raw
          .split(/[,;\n]/)
          .map(value => value.trim())
          .filter(value => value.length > 1 && value.length < 40)
          .forEach(value => themeSet.add(value));
        (bundle.vocabulary || []).forEach(entry => {
          if (entry.term) termSet.set(entry.term, entry.meaning || "");
        });
      });
      setThemes(Array.from(themeSet).slice(0, 18));
      setTerms(Array.from(termSet.entries()).slice(0, 18));
    });
    return () => {
      active = false;
    };
  }, [songs]);

  const random = useMemo(() => {
    if (!songs.length) return null;
    return songs[Math.floor(Math.random() * songs.length)];
  }, [songs]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Wander</span>
          <h1>Explore</h1>
          <p className="muted small">
            Themes, vocabulary and albums drawn from what the administrator actually published —
            no invented categories.
          </p>
        </div>
        {random && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/songs/${random.slug}`)}
          >
            <Dices size={16} /> Surprise me
          </button>
        )}
      </div>

      <div className="explore-grid">
        <section className="panel stack">
          <h2 className="row">
            <Sparkles size={18} /> Themes in the catalogue
          </h2>
          {themes.length ? (
            <div className="tag-cloud">
              {themes.map(theme => (
                <span className="badge" key={theme}>
                  {theme}
                </span>
              ))}
            </div>
          ) : (
            <p className="small muted">
              Themes appear once an administrator publishes song analyses. Nothing is inferred
              here.
            </p>
          )}
        </section>

        <section className="panel stack">
          <h2 className="row">
            <Music2 size={18} /> Vocabulary highlights
          </h2>
          {terms.length ? (
            <div className="vocab-list">
              {terms.map(([term, meaning]) => (
                <div className="vocab-item" key={term}>
                  <span className="vocab-term jp">{term}</span>
                  <p className="vocab-meaning small">{meaning || "—"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted">
              Vocabulary entries are added by the administrator alongside the lyrics.
            </p>
          )}
        </section>
      </div>

      {random && (
        <section className="panel stack">
          <h2 className="row">
            <Compass size={18} /> Start somewhere
          </h2>
          <Link className="row" to={`/songs/${random.slug}`} style={{ gap: "1rem" }}>
            <CoverArt item={random} className="song-thumb" />
            <span>
              <span className="song-row-title">{random.title}</span>
              <span className="row">
                <SampleBadge show={random.is_sample} />
                <span className="tiny faint">
                  {random.audio_url ? "Audio available" : "No audio yet"}
                </span>
              </span>
            </span>
          </Link>
        </section>
      )}

      <section className="stack">
        <div className="section-head">
          <h2 className="row">
            <Disc3 size={18} /> Album library
          </h2>
          <Link className="btn btn-quiet btn-sm" to="/albums">
            All albums
          </Link>
        </div>

        {loading ? (
          <div className="album-grid">
            {[0, 1].map(key => (
              <div className="skeleton" key={key} style={{ height: 300 }} />
            ))}
          </div>
        ) : (
          <div className="album-grid">
            {albums.map(album => (
              <AlbumCard key={album.id} album={album} songCount={songsForAlbum(album.id).length} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

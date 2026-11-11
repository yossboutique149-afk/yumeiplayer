import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Compass, Disc3, Heart, Mic2, Sparkles } from "lucide-react";
import { useContent } from "../contexts/ContentContext.jsx";
import AlbumCard from "../components/AlbumCard.jsx";
import SongCard from "../components/SongCard.jsx";
import { isLocalMode } from "../lib/dataClient.js";

export default function HomePage() {
  const { albums, songs, songsForAlbum, loading } = useContent();
  const latest = songs.slice(0, 4);
  const featured = albums.slice(0, 4);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Welcome to the universe</span>
          <h1 className="hero-title">
            Music is another
            <br />
            <em>universe.</em>
          </h1>
          <p className="hero-lead">
            A dreamlike home for Yumei (ka)Waii: albums, lyrics the administrator has
            published, translations, pronunciation, song decode and a sing-along mode that
            follows the real uploaded audio.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" to="/music">
              Explore the music <ArrowRight size={17} />
            </Link>
            <Link className="btn btn-ghost btn-lg" to="/albums">
              <Disc3 size={17} /> Album library
            </Link>
          </div>
          <div className="hero-meta">
            <span className="badge">{albums.length} albums</span>
            <span className="badge">{songs.length} published tracks</span>
            <span className="badge">Fan platform</span>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-glyph">Y</div>
          <span className="hero-orbit-dot" />
          <span className="hero-orbit-dot" />
          <span className="hero-orbit-dot" />
        </div>
      </section>

      {isLocalMode && (
        <div className="notice">
          <strong>Demo mode.</strong> Supabase is not configured yet, so the catalogue lives in
          this browser and every entry is marked as sample. Add{" "}
          <code className="code-inline">VITE_SUPABASE_URL</code> and{" "}
          <code className="code-inline">VITE_SUPABASE_ANON_KEY</code> to connect the real
          database and studio.
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Discover</span>
            <h2>Inside YUMEIKA</h2>
          </div>
          <Link className="btn btn-quiet btn-sm" to="/explore">
            Explore all <ArrowRight size={15} />
          </Link>
        </div>

        <div className="feature-grid">
          <Link className="feature-card" to="/music">
            <Disc3 size={20} />
            <h3>Music universe</h3>
            <p className="small muted">Every published track with its own detail page.</p>
          </Link>
          <Link className="feature-card" to="/lyrics">
            <BookOpen size={20} />
            <h3>Lyrics archive</h3>
            <p className="small muted">
              Original lines, translations, romaji and pronunciation — only what the
              administrator published.
            </p>
          </Link>
          <Link className="feature-card" to="/sing">
            <Mic2 size={20} />
            <h3>Sing with Yumei</h3>
            <p className="small muted">
              Karaoke that follows uploaded audio, never a simulated waveform.
            </p>
          </Link>
          <Link className="feature-card" to="/decode">
            <Sparkles size={20} />
            <h3>Song decode</h3>
            <p className="small muted">
              Story, metaphors, symbolism and production — AI interpretations are labelled.
            </p>
          </Link>
          <Link className="feature-card" to="/favorites">
            <Heart size={20} />
            <h3>Favorites</h3>
            <p className="small muted">Keep the songs you love on this device.</p>
          </Link>
          <Link className="feature-card" to="/artist">
            <Compass size={20} />
            <h3>Artist profile</h3>
            <p className="small muted">
              Official links and the identity behind the universe.
            </p>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Latest</span>
            <h2>Recent releases</h2>
          </div>
          <Link className="btn btn-quiet btn-sm" to="/music">
            All music <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <div className="song-grid">
            {[0, 1, 2, 3].map(key => (
              <div className="skeleton" key={key} style={{ height: 210 }} />
            ))}
          </div>
        ) : latest.length ? (
          <div className="song-grid">
            {latest.map(song => (
              <SongCard key={song.id} song={song} list={latest} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No tracks published yet</h3>
            <p className="small muted">
              The administrator can publish songs from the Admin Studio.
            </p>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Discography</span>
            <h2>Albums</h2>
          </div>
          <Link className="btn btn-quiet btn-sm" to="/albums">
            Album library <ArrowRight size={15} />
          </Link>
        </div>

        <div className="album-grid">
          {featured.map(album => (
            <AlbumCard key={album.id} album={album} songCount={songsForAlbum(album.id).length} />
          ))}
        </div>
      </section>

      <div className="notice">
        YUMEIKA is a fan-facing universe for a virtual artist. No official lyrics,
        translations or artist statements are invented here: everything comes from the
        administrator, and AI-assisted analysis is always labelled.
      </div>
    </div>
  );
}

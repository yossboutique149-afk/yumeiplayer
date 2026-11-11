import { ExternalLink, Headphones, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "../contexts/ContentContext.jsx";
import { pluralize } from "../lib/format.js";

const SPOTIFY_ARTIST = "https://open.spotify.com/artist/4rvqZA6szL4nbRkoN7soB1";
const YOUTUBE_CHANNEL = "https://www.youtube.com/channel/UCx9lIvfBGqOQjy--SpFHnsA";

export default function ArtistPage() {
  const { albums, songs } = useContent();

  return (
    <div className="page">
      <section className="artist-hero">
        <div className="artist-portrait" aria-hidden="true">
          Y
        </div>
        <div className="stack">
          <span className="eyebrow">Artist profile</span>
          <h1>Yumei (ka)Waii</h1>
          <p className="muted">
            Yumei (ka)Waii is the virtual artist identity behind YUMEIKA — The Music Universe, a
            world built around music, visual storytelling and emotional exploration.
          </p>
          <p className="small faint">
            This profile is written by the site administrator. YUMEIKA never invents official
            statements, biographies or quotes on the artist&apos;s behalf; anything pending review
            is marked as sample content.
          </p>

          <div className="hero-meta">
            <span className="badge">{pluralize(albums.length, "album")}</span>
            <span className="badge">{pluralize(songs.length, "published track")}</span>
            <span className="badge">Virtual artist</span>
          </div>

          <div className="hero-actions">
            <a className="btn btn-primary" href={SPOTIFY_ARTIST} target="_blank" rel="noreferrer noopener">
              <Headphones size={16} /> Official Spotify <ExternalLink size={14} />
            </a>
            <a className="btn btn-ghost" href={YOUTUBE_CHANNEL} target="_blank" rel="noreferrer noopener">
              <Play size={16} /> Official YouTube <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      <section className="panel stack">
        <h2>Inside the universe</h2>
        <div className="feature-grid">
          <Link className="feature-card" to="/music">
            <Headphones size={18} />
            <h3>Music library</h3>
            <p className="small muted">Every published track and its detail page.</p>
          </Link>
          <Link className="feature-card" to="/lyrics">
            <Sparkles size={18} />
            <h3>Lyrics &amp; decode</h3>
            <p className="small muted">
              Administrator-supplied lyrics, translations and labelled interpretations.
            </p>
          </Link>
          <Link className="feature-card" to="/sing">
            <Play size={18} />
            <h3>Sing with Yumei</h3>
            <p className="small muted">Karaoke synced to uploaded audio only.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Disc3,
  Music2,
  BookOpen,
  UserRound,
  Settings,
  Play,
  RefreshCw,
  ExternalLink,
  Headphones,
  Heart,
  Lock,
  Search,
  X,
  Trash2,
  AlertTriangle
} from "lucide-react";
import "./style.css";

const SPOTIFY_ARTIST = "https://open.spotify.com/artist/4rvqZA6szL4nbRkoN7soB1";
const YOUTUBE_CHANNEL =
  "https://www.youtube.com/channel/UCx9lIvfBGqQOjy--SpFHnsA";
const SPOTIFY_ARTIST_EMBED =
  "https://open.spotify.com/embed/artist/4rvqZA6szL4nbRkoN7soB1?utm_source=generator&theme=0";

const EMPTY_FORM = {
  id: "",
  title: "",
  album: "",
  original: "",
  translation: "",
  romanization: "",
  analysis: ""
};

/* ------------------------------------------------------------------ *
 * Navigation
 * ------------------------------------------------------------------ */

function Navigation({ page, onNavigate }) {
  const links = [
    ["home", "Home", Home],
    ["music", "Music", Music2],
    ["albums", "Albums", Disc3],
    ["lyrics", "Lyrics & Decode", BookOpen],
    ["artist", "Artist", UserRound]
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-symbol">Y</span>
        <div>
          <h2>YUMEIKA</h2>
          <small>THE MUSIC UNIVERSE</small>
        </div>
      </div>

      <nav>
        {links.map(([id, label, Icon]) => (
          <button
            key={id}
            className={page === id ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate(id)}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          className={page === "admin" ? "nav-link active" : "nav-link"}
          onClick={() => onNavigate("admin")}
        >
          <Settings size={19} />
          Administration
        </button>
        <p>© YUMEIKA Universe</p>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ *
 * Player modal
 * ------------------------------------------------------------------ */

function Player({ item, onClose }) {
  if (!item) return null;

  const externalUrl = item.spotifyUrl || item.youtubeUrl || "";

  return (
    <div
      className="player-modal"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <button className="close" onClick={onClose} aria-label="Cerrar">
          <X />
        </button>

        <h2>{item.name}</h2>

        {item.image && (
          <img className="modal-cover" src={item.image} alt={item.name} />
        )}

        {item.embedUrl && (
          <iframe
            title={item.name}
            src={item.embedUrl}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        )}

        {externalUrl && (
          <a href={externalUrl} target="_blank" rel="noreferrer">
            Open official platform <ExternalLink size={15} />
          </a>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Pages
 * ------------------------------------------------------------------ */

function HomePage({ onNavigate }) {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">WELCOME TO THE UNIVERSE</span>
          <h1>
            Music is another
            <br />
            <em>universe.</em>
          </h1>
          <p>
            Explore the music, stories, lyrics and creative world of Yumei
            (ka)Waii.
          </p>
          <button className="primary" onClick={() => onNavigate("music")}>
            Explore music <Headphones size={17} />
          </button>
        </div>
        <div className="hero-orbit">Y</div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DISCOVER</span>
            <h2>Inside YUMEIKA</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate("albums")}>
            View catalog →
          </button>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <Disc3 />
            <h3>Music universe</h3>
            <p>Albums, singles and official releases.</p>
          </article>

          <article className="feature-card">
            <BookOpen />
            <h3>Lyrics archive</h3>
            <p>Original lyrics, translations and interpretations.</p>
          </article>

          <article className="feature-card">
            <Heart />
            <h3>Artist universe</h3>
            <p>Discover the identity and creative vision of Yumei.</p>
          </article>
        </div>
      </section>
    </>
  );
}

function MusicPage({ songs, search, onSearch, onSelect }) {
  const filteredSongs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return songs;
    return songs.filter(item =>
      String(item.name || "")
        .toLowerCase()
        .includes(term)
    );
  }, [songs, search]);

  return (
    <section className="section">
      <span className="eyebrow">OFFICIAL CATALOG</span>
      <h1>Music Library</h1>

      <div className="search-box">
        <Search size={18} />
        <input
          value={search}
          onChange={event => onSearch(event.target.value)}
          placeholder="Search songs, albums and videos..."
          aria-label="Buscar en el catálogo"
        />
      </div>

      <div className="music-grid">
        {filteredSongs.map(item => (
          <article className="music-card" key={`${item.kind}-${item.id}`}>
            {item.image && <img src={item.image} alt={item.name} />}
            <div>
              <h3>{item.name}</h3>
              <small>
                {item.kind === "youtube" ? "YouTube" : "Spotify"}
                {item.releaseDate ? ` · ${item.releaseDate}` : ""}
              </small>
              <button onClick={() => onSelect(item)}>
                <Play size={15} /> Play
              </button>
            </div>
          </article>
        ))}
      </div>

      {!filteredSongs.length && (
        <>
          <p className="empty">
            No releases found. Synchronize the official catalog or check back
            when new releases are published.
          </p>

          <div className="official-embed">
            <span className="eyebrow">OFFICIAL PLAYER</span>
            <iframe
              title="Spotify — Yumei (ka)Waii"
              src={SPOTIFY_ARTIST_EMBED}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
            <a href={YOUTUBE_CHANNEL} target="_blank" rel="noreferrer">
              <Play size={15} /> Open official YouTube channel
            </a>
          </div>
        </>
      )}
    </section>
  );
}

function AlbumsPage({ albums, onSelect }) {
  return (
    <section className="section">
      <span className="eyebrow">DISCOGRAPHY</span>
      <h1>Albums &amp; Singles</h1>

      <div className="album-grid">
        {albums.map(album => (
          <article className="album-card" key={album.id}>
            {album.image && <img src={album.image} alt={album.name} />}
            <h3>{album.name}</h3>
            {album.releaseDate && <p>{album.releaseDate}</p>}
            {album.totalTracks ? <p>{album.totalTracks} tracks</p> : null}
            <button onClick={() => onSelect(album)}>Listen now</button>
          </article>
        ))}
      </div>

      {!albums.length && (
        <p className="empty">
          The official album catalog will appear here after synchronization.
        </p>
      )}
    </section>
  );
}

function LyricsPage({ lyrics, onSelect }) {
  return (
    <section className="section">
      <span className="eyebrow">WORDS &amp; MEANINGS</span>
      <h1>Lyrics &amp; Song Decode</h1>

      <div className="lyrics-list">
        {lyrics.map(song => (
          <article
            className="lyrics-card"
            key={song.id}
            onClick={() => onSelect(song)}
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") onSelect(song);
            }}
          >
            <BookOpen />
            <div>
              <h3>{song.title}</h3>
              <small>{song.album}</small>
            </div>
          </article>
        ))}
      </div>

      {!lyrics.length && (
        <p className="empty">No lyrics have been added yet.</p>
      )}
    </section>
  );
}

function LyricsDetail({ song, onClose }) {
  if (!song) return null;

  const blocks = [
    ["Original lyrics", song.original],
    ["Translation", song.translation],
    ["Romanization / Pronunciation", song.romanization],
    ["Song analysis", song.analysis]
  ].filter(([, content]) => content);

  return (
    <div
      className="player-modal"
      role="dialog"
      aria-modal="true"
      aria-label={song.title}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-card lyrics-modal">
        <button className="close" onClick={onClose} aria-label="Cerrar">
          <X />
        </button>
        <span className="eyebrow">SONG DECODE</span>
        <h2>{song.title}</h2>
        {song.album && <p className="lyrics-album">{song.album}</p>}

        {blocks.map(([label, content]) => (
          <div key={label} className="lyrics-block">
            <h3>{label}</h3>
            <pre>{content}</pre>
          </div>
        ))}

        {!blocks.length && <p className="empty">No lyrics content yet.</p>}
      </div>
    </div>
  );
}

function ArtistPage() {
  return (
    <section className="section artist-page">
      <span className="eyebrow">ARTIST PROFILE</span>
      <h1>Yumei (ka)Waii</h1>
      <p>
        Yumei (ka)Waii is the creative musical identity behind YUMEIKA — The
        Music Universe, a world dedicated to music, artistic expression, visual
        storytelling and emotional exploration.
      </p>

      <div className="social-grid">
        <a href={SPOTIFY_ARTIST} target="_blank" rel="noreferrer">
          <Headphones /> Official Spotify <ExternalLink size={15} />
        </a>

        <a href={YOUTUBE_CHANNEL} target="_blank" rel="noreferrer">
          <Play /> Official YouTube <ExternalLink size={15} />
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

function AdminPage({ onRefresh }) {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const headers = useCallback(
    extra => ({ "x-admin-password": password, ...extra }),
    [password]
  );

  async function login(event) {
    event?.preventDefault();
    if (!password) {
      setMessage("Introduce la contraseña de administración.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: headers()
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Unauthorized");

      setAuthorized(true);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "No se pudo validar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  async function synchronize() {
    setBusy(true);
    setWarnings([]);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: headers()
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Error de sincronización.");

      setWarnings(data.warnings || []);
      setMessage("Catálogo sincronizado correctamente.");
      onRefresh();
    } catch (error) {
      setMessage(error.message || "Error de sincronización.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLyrics(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/lyrics", {
        method: "POST",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "No se pudo guardar.");

      setMessage("Letra guardada correctamente.");
      setForm(EMPTY_FORM);
      onRefresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeSong(id) {
    setBusy(true);
    try {
      const response = await fetch(`/api/lyrics/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: headers()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo eliminar.");
      setMessage("Letra eliminada.");
      onRefresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function editSong(song) {
    setForm({ ...EMPTY_FORM, ...song });
    setMessage(`Editando «${song.title}».`);
  }

  return (
    <section className="section">
      <span className="eyebrow">PRIVATE CONTROL CENTER</span>
      <h1>Administration</h1>

      {!authorized ? (
        <form className="admin-login" onSubmit={login}>
          <Lock size={28} />
          <h2>Administrator access</h2>
          <input
            type="password"
            placeholder="Admin password"
            aria-label="Contraseña de administración"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Verificando..." : "Enter panel"}
          </button>
        </form>
      ) : (
        <div className="admin-panel">
          <div className="admin-actions">
            <button className="primary" onClick={synchronize} disabled={busy}>
              <RefreshCw size={16} /> Sync official catalog
            </button>
            <button
              className="secondary"
              onClick={() => {
                setAuthorized(false);
                setPassword("");
                setMessage("");
                setWarnings([]);
              }}
            >
              Log out
            </button>
          </div>

          <h2>Add or edit song lyrics</h2>

          <form onSubmit={saveLyrics}>
            {[
              ["id", "Unique song ID"],
              ["title", "Song title"],
              ["album", "Album"]
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required={key !== "album"}
                  value={form[key]}
                  onChange={event =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              </label>
            ))}

            {[
              ["original", "Original lyrics"],
              ["translation", "Translation"],
              ["romanization", "Romanization / pronunciation"],
              ["analysis", "Detailed song analysis"]
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  rows="6"
                  value={form[key]}
                  onChange={event =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              </label>
            ))}

            <div className="admin-actions">
              <button className="primary" type="submit" disabled={busy}>
                Save lyrics
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => setForm(EMPTY_FORM)}
              >
                Clear form
              </button>
            </div>
          </form>

          <AdminSongList onEdit={editSong} onDelete={removeSong} busy={busy} />
        </div>
      )}

      {message && <p className="message">{message}</p>}

      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map(warning => (
            <li key={warning}>
              <AlertTriangle size={15} /> {warning}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AdminSongList({ onEdit, onDelete, busy }) {
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    let active = true;
    fetch("/api/lyrics")
      .then(response => (response.ok ? response.json() : { songs: [] }))
      .then(data => {
        if (active) setSongs(data.songs || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [busy]);

  if (!songs.length) return null;

  return (
    <div className="admin-songs">
      <h2>Stored songs ({songs.length})</h2>
      {songs.map(song => (
        <div className="admin-song" key={song.id}>
          <div>
            <strong>{song.title}</strong>
            <small>{song.album}</small>
          </div>
          <div className="admin-song-actions">
            <button className="text-button" onClick={() => onEdit(song)}>
              Edit
            </button>
            <button
              className="text-button danger"
              onClick={() => onDelete(song.id)}
              aria-label={`Eliminar ${song.title}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * App shell
 * ------------------------------------------------------------------ */

function App() {
  const [page, setPage] = useState("home");
  const [catalog, setCatalog] = useState({
    albums: [],
    youtube: [],
    lastSync: null
  });
  const [lyrics, setLyrics] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedLyrics, setSelectedLyrics] = useState(null);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [catalogResponse, lyricsResponse] = await Promise.all([
        fetch("/api/catalog"),
        fetch("/api/lyrics")
      ]);

      if (catalogResponse.ok) {
        const data = await catalogResponse.json();
        setCatalog({
          albums: Array.isArray(data.albums) ? data.albums : [],
          youtube: Array.isArray(data.youtube) ? data.youtube : [],
          lastSync: data.lastSync || null
        });
      }

      if (lyricsResponse.ok) {
        const data = await lyricsResponse.json();
        setLyrics(Array.isArray(data.songs) ? data.songs : []);
      }
    } catch {
      setMessage("No se pudo conectar con el servidor.");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") {
        setSelected(null);
        setSelectedLyrics(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const songs = useMemo(
    () => [...catalog.albums, ...catalog.youtube],
    [catalog]
  );

  function navigate(next) {
    setPage(next);
    setSelected(null);
    setSelectedLyrics(null);
  }

  return (
    <div className="app">
      <Navigation page={page} onNavigate={navigate} />

      <main className="main-content">
        <header className="topbar">
          <span>YUMEIKA / THE MUSIC UNIVERSE</span>
          <span className="online-indicator">● UNIVERSE ONLINE</span>
        </header>

        {page === "home" && <HomePage onNavigate={navigate} />}
        {page === "music" && (
          <MusicPage
            songs={songs}
            search={search}
            onSearch={setSearch}
            onSelect={setSelected}
          />
        )}
        {page === "albums" && (
          <AlbumsPage albums={catalog.albums} onSelect={setSelected} />
        )}
        {page === "lyrics" && (
          <LyricsPage lyrics={lyrics} onSelect={setSelectedLyrics} />
        )}
        {page === "artist" && <ArtistPage />}
        {page === "admin" && <AdminPage onRefresh={loadData} />}

        {message && page !== "admin" && <p className="message">{message}</p>}
      </main>

      <Player item={selected} onClose={() => setSelected(null)} />
      <LyricsDetail
        song={selectedLyrics}
        onClose={() => setSelectedLyrics(null)}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

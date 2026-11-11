/**
 * Spotify catalogue normalisation.
 *
 * Spotify is the source of truth for titles, covers, durations and official
 * links; nothing is downloaded or re-hosted. Records produced here only use
 * columns that already exist in the YUMEIKA schema.
 */

const MAX_TRACKS = 100;

function text(value, limit = 300) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, limit);
}

export function slugifyTitle(value) {
  return text(value, 200)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "release";
}

function https(value) {
  const raw = text(value, 500);
  return raw.startsWith("https://") ? raw : "";
}

export function spotifyAlbumRecord(album = {}) {
  const id = text(album.id, 60);
  const title = text(album.name, 200) || "Untitled release";
  return {
    slug: slugifyTitle(title),
    title,
    title_ja: "",
    romanized_title: "",
    release_year: text(album.release_date, 4) || "—",
    cover_url: https(album.images?.[0]?.url),
    cover_glyph: (title[0] || "Y").toUpperCase(),
    description: `Imported from Spotify (${text(album.album_type, 20) || "release"}). Official links point to the platform; audio is never copied.`,
    status: "draft",
    is_sample: false
  };
}

export function spotifySongRecords(album = {}) {
  const tracks = Array.isArray(album.tracks?.items) ? album.tracks.items.slice(0, MAX_TRACKS) : [];
  const cover = https(album.images?.[0]?.url);
  const albumTitle = text(album.name, 200);
  const albumUrl = https(album.external_urls?.spotify);
  const releaseType = text(album.album_type, 20) === "single" ? "single" : "album_track";

  return tracks
    .filter(track => track && track.id)
    .map((track, index) => {
      const title = text(track.name, 200) || `Track ${index + 1}`;
      return {
        slug: slugifyTitle(`${albumTitle}-${title}`),
        title,
        title_ja: "",
        track_number: Number(track.track_number) || index + 1,
        duration_seconds: Math.round((Number(track.duration_ms) || 0) / 1000),
        release_type: releaseType,
        status: "draft",
        is_sample: false,
        cover_url: cover,
        audio_url: "",
        spotify_embed_url: track.id ? `https://open.spotify.com/embed/track/${track.id}` : "",
        youtube_embed_url: "",
        description: `Imported from Spotify — ${albumTitle}. Lyrics, study and audio are added by the administrator.`,
        credits: "",
        external_links: [
          track.external_urls?.spotify ? { label: "Spotify", url: https(track.external_urls.spotify) } : null,
          albumUrl ? { label: "Album on Spotify", url: albumUrl } : null
        ].filter(link => link && link.url)
      };
    });
}

/** Turns the Spotify artist-albums payload into the Studio import preview. */
export function spotifyImportPayload(albums = []) {
  return (Array.isArray(albums) ? albums : [])
    .filter(album => album && album.id)
    .map(album => ({
      album: spotifyAlbumRecord(album),
      songs: spotifySongRecords(album),
      spotify_id: text(album.id, 60)
    }));
}

export function summarizeImport(entries = []) {
  const albums = Array.isArray(entries) ? entries : [];
  const songs = albums.reduce((total, entry) => total + (entry.songs?.length || 0), 0);
  return { albums: albums.length, songs };
}

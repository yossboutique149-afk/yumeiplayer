/**
 * Public artist catalogue — no credentials required.
 *
 * The Spotify Web API needs a client ID and secret, so a visitor (or a studio
 * without keys) would otherwise see an empty app. Spotify's public artist
 * embed is server-rendered with a __NEXT_DATA__ payload that lists the artist
 * name, artwork and top tracks, so the deployed app can show the real
 * catalogue without any secret. Audio is never copied: every track keeps the
 * official Spotify player and links.
 */

export const DEFAULT_ARTIST_ID = "4rvqZA6szL4nbRkoN7soB1";

export const SPOTIFY_WEB = "https://open.spotify.com";

export function spotifyArtistUrl(artistId) {
  return `${SPOTIFY_WEB}/artist/${encodeURIComponent(artistId)}`;
}

export function spotifyArtistEmbedUrl(artistId) {
  return `${SPOTIFY_WEB}/embed/artist/${encodeURIComponent(artistId)}`;
}

export function isArtistId(value) {
  return /^[A-Za-z0-9]{10,40}$/.test(String(value || ""));
}

function text(value, limit = 300) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, limit);
}

function https(value) {
  const raw = text(value, 600);
  return raw.startsWith("https://") ? raw : "";
}

const JAPANESE = /[\u3040-\u30ff\u4e00-\u9faf]/;

export function slugifyTrack(value) {
  const raw = text(value, 200).toLowerCase();
  const base = JAPANESE.test(raw)
    ? raw.normalize("NFC")
    : raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return (
    base
      .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "track"
  );
}

function pickCover(entity) {
  const images = entity?.visualIdentity?.image;
  const list = Array.isArray(images) ? images : images ? [images] : [];

  // Validate the scheme first: an insecure or malformed entry must never win
  // over a usable https cover just because it claims a larger width.
  const usable = list
    .map(image => ({ url: https(image?.url), width: Number(image?.width) || 0 }))
    .filter(image => image.url);

  if (!usable.length) return "";
  return usable.sort((a, b) => b.width - a.width)[0].url;
}

/**
 * Reads the artist entity out of the embed page.
 * Throws when Spotify changed the page shape, so the caller can fall back to
 * its cache instead of publishing an empty catalogue.
 */
export function parseSpotifyEmbed(html) {
  const match = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(
    String(html || "")
  );
  if (!match) throw new Error("Spotify embed payload not found.");

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    throw new Error("Spotify embed payload is not valid JSON.");
  }

  const entity = data?.props?.pageProps?.state?.data?.entity;
  if (!entity || entity.type !== "artist") throw new Error("Spotify embed has no artist entity.");

  const id = text(entity.id || String(entity.uri || "").replace(/^spotify:artist:/, ""), 60);
  const name = text(entity.name || entity.title, 200) || "Unknown artist";
  const cover = pickCover(entity);

  const tracks = (Array.isArray(entity.trackList) ? entity.trackList : [])
    .map((track, index) => {
      const uri = text(track?.uri, 120);
      const trackId = uri.startsWith("spotify:track:") ? uri.slice("spotify:track:".length) : "";
      const title = text(track?.title || track?.name, 200);
      if (!trackId || !title) return null;
      return {
        id: trackId,
        title,
        durationMs: Math.max(0, Math.round(Number(track?.duration) || 0)),
        playable: track?.isPlayable !== false,
        position: index + 1
      };
    })
    .filter(Boolean);

  return { id, name, cover, url: spotifyArtistUrl(id), tracks };
}

/**
 * Turns the parsed artist into song records that match the public schema, so
 * existing cards, routing and detail pages render them unchanged.
 */
export function buildPublicSongs(artist, { now = new Date().toISOString() } = {}) {
  if (!artist || !Array.isArray(artist.tracks)) return [];
  const used = new Set();

  return artist.tracks.map((track, index) => {
    let slug = slugifyTrack(track.title);
    if (used.has(slug)) slug = `${slug}-${track.id.slice(0, 6).toLowerCase()}`;
    used.add(slug);

    const durationSeconds = Math.round((Number(track.durationMs) || 0) / 1000);

    return {
      id: `spotify-${track.id}`,
      slug,
      title: track.title,
      title_ja: "",
      romanized_title: "",
      album_id: null,
      track_number: index + 1,
      duration_seconds: durationSeconds,
      release_type: "track",
      status: "published",
      is_sample: false,
      source: "spotify",
      cover_url: artist.cover || "",
      cover_glyph: (track.title[0] || "Y").toUpperCase(),
      audio_url: "",
      spotify_embed_url: `${SPOTIFY_WEB}/embed/track/${track.id}`,
      youtube_embed_url: "",
      description:
        `From the official Spotify catalogue of ${artist.name}. ` +
        "Lyrics, translation and study are added by the studio; nothing is invented here.",
      credits: "",
      external_links: [
        { label: "Spotify", url: `${SPOTIFY_WEB}/track/${track.id}` },
        { label: `${artist.name} on Spotify`, url: artist.url }
      ],
      created_at: now,
      updated_at: now
    };
  });
}

const normalize = value =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Appends the public Spotify tracks that are not already stored, matching on
 * slug and on the normalised title so an imported song is never duplicated.
 */
export function mergePublicSongs(existing = [], extra = []) {
  const rows = Array.isArray(existing) ? existing : [];
  const incoming = Array.isArray(extra) ? extra : [];
  const slugs = new Set(rows.map(row => row.slug));
  const titles = new Set(rows.map(row => normalize(row.title)));
  const added = [];

  incoming.forEach(song => {
    if (!song || !song.slug) return;
    if (slugs.has(song.slug) || titles.has(normalize(song.title))) return;
    slugs.add(song.slug);
    titles.add(normalize(song.title));
    added.push(song);
  });

  return [...rows, ...added];
}

/** Public-safe summary of the fetched catalogue. */
export function summarizePublicCatalogue(artist, songs) {
  return {
    artist: artist ? { id: artist.id, name: artist.name, cover: artist.cover, url: artist.url } : null,
    songs: Array.isArray(songs) ? songs.length : 0
  };
}

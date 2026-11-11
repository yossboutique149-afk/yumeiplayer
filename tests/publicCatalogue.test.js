import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_ARTIST_ID,
  buildPublicSongs,
  isArtistId,
  mergePublicSongs,
  parseSpotifyEmbed,
  slugifyTrack,
  spotifyArtistEmbedUrl,
  spotifyArtistUrl
} from "../src/lib/publicCatalogue.js";

const entity = {
  type: "artist",
  name: "Yumei (ka)waii",
  uri: "spotify:artist:4rvqZA6szL4nbRkoN7soB1",
  id: "4rvqZA6szL4nbRkoN7soB1",
  visualIdentity: {
    image: [
      { url: "https://i.scdn.co/image/small", width: 160 },
      { url: "https://i.scdn.co/image/large", width: 640 },
      { url: "http://insecure.example/cover", width: 999 }
    ]
  },
  trackList: [
    {
      uri: "spotify:track:3XLRvl2aTvXfO9J4fJPLib",
      title: "Typing… Deleting…",
      duration: 287840,
      isPlayable: true
    },
    {
      uri: "spotify:track:2lPsp3suHWbIszH3iDyTuQ",
      title: "終わらない呼吸」",
      duration: 309320,
      isPlayable: true
    },
    { uri: "spotify:track:6RGLvdUhPwNjamndPuIq6h", title: "Typing… Deleting…", duration: 479960 },
    { uri: "", title: "No uri", duration: 1000 },
    { uri: "spotify:track:abc", title: "", duration: 1000 }
  ]
};

const embedHtml = payload =>
  `<html><head></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    payload
  )}</script></body></html>`;

const pageWith = entityValue =>
  embedHtml({ props: { pageProps: { state: { data: { entity: entityValue } } } } });

test("parseSpotifyEmbed reads the artist, the largest https cover and its tracks", () => {
  const artist = parseSpotifyEmbed(pageWith(entity));
  assert.equal(artist.id, "4rvqZA6szL4nbRkoN7soB1");
  assert.equal(artist.name, "Yumei (ka)waii");
  assert.equal(artist.cover, "https://i.scdn.co/image/large");
  assert.equal(artist.tracks.length, 3);
  assert.deepEqual(
    artist.tracks.map(track => track.id),
    ["3XLRvl2aTvXfO9J4fJPLib", "2lPsp3suHWbIszH3iDyTuQ", "6RGLvdUhPwNjamndPuIq6h"]
  );
  assert.equal(artist.tracks[0].durationMs, 287840);
});

test("parseSpotifyEmbed rejects a page without the embed payload", () => {
  assert.throws(() => parseSpotifyEmbed("<html>nothing</html>"), /payload not found/i);
});

test("parseSpotifyEmbed rejects a non-artist entity", () => {
  assert.throws(
    () => parseSpotifyEmbed(pageWith({ ...entity, type: "album" })),
    /no artist entity/i
  );
});

test("buildPublicSongs creates published, credential-free song records", () => {
  const artist = parseSpotifyEmbed(pageWith(entity));
  const songs = buildPublicSongs(artist);

  assert.equal(songs.length, 3);
  const [first] = songs;
  assert.equal(first.id, "spotify-3XLRvl2aTvXfO9J4fJPLib");
  assert.equal(first.status, "published");
  assert.equal(first.source, "spotify");
  assert.equal(first.is_sample, false);
  assert.equal(first.audio_url, "");
  assert.equal(first.duration_seconds, 288);
  assert.equal(first.cover_url, "https://i.scdn.co/image/large");
  assert.equal(
    first.spotify_embed_url,
    "https://open.spotify.com/embed/track/3XLRvl2aTvXfO9J4fJPLib"
  );
  assert.ok(first.external_links.some(link => link.url.includes("/track/3XLRvl2aTvXfO9J4fJPLib")));
  assert.ok(first.external_links.some(link => link.url === spotifyArtistUrl(artist.id)));
});

test("duplicate titles get distinct slugs so routing stays unique", () => {
  const artist = parseSpotifyEmbed(pageWith(entity));
  const slugs = buildPublicSongs(artist).map(song => song.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("Japanese titles keep a readable slug", () => {
  assert.equal(slugifyTrack("終わらない呼吸」"), "終わらない呼吸");
});

test("mergePublicSongs never duplicates a song already stored", () => {
  const artist = parseSpotifyEmbed(pageWith(entity));
  const incoming = buildPublicSongs(artist);
  const existing = [
    { id: "song-1", slug: incoming[0].slug, title: "Something else" },
    { id: "song-2", slug: "different-slug", title: "  typing… deleting… " }
  ];

  const merged = mergePublicSongs(existing, incoming);
  assert.equal(merged.length, existing.length + 1);
  assert.equal(merged[0].id, "song-1");
  assert.equal(merged.at(-1).title, "終わらない呼吸」");
});

test("mergePublicSongs tolerates empty input", () => {
  assert.deepEqual(mergePublicSongs([], []), []);
  assert.deepEqual(mergePublicSongs(undefined, undefined), []);
});

test("artist ids are validated before being used in a URL", () => {
  assert.equal(isArtistId(DEFAULT_ARTIST_ID), true);
  assert.equal(isArtistId("../../etc/passwd"), false);
  assert.equal(isArtistId(""), false);
  assert.equal(spotifyArtistEmbedUrl(DEFAULT_ARTIST_ID), `https://open.spotify.com/embed/artist/${DEFAULT_ARTIST_ID}`);
});

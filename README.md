# YUMEIKA — THE MUSIC UNIVERSE

Public fan platform + private Admin Studio for the virtual artist **Yumei (ka)Waii**.
Dreamy lavender / pastel-pink / deep-purple aesthetic, dark mode, responsive from mobile
to desktop, installable as a PWA on Android.

> Nothing is published automatically, and no lyrics, translations or artist statements are
> invented. Everything that ships as placeholder is badged **SAMPLE**, and every analysis
> produced with AI help is badged **AI interpretation** with a disclaimer.

---

## 1. Run locally

```bash
npm install
npm run dev        # Vite on http://localhost:5173 + API on :3001
npm run build      # production bundle in dist/
npm start          # Express serves dist/ + API on $PORT (default 3001)
npm test           # node --test: format, karaoke timing, schema/credential safety
```

`npm run dev` starts the Vite dev server and `server.js` together.

## 2. Two areas

**Public fan platform** — `/`

| Route | Section |
| --- | --- |
| `/` | Home |
| `/music` | Music library with search |
| `/albums`, `/albums/:slug` | Albums and album detail |
| `/singles` | Singles |
| `/lyrics` | Lyrics index |
| `/songs/:slug` | Song detail: player, embeds, lyrics, translation, romaji, pronunciation, vocabulary, karaoke, decode |
| `/sing`, `/decode`, `/explore`, `/favorites`, `/artist` | Sing With Yumei, Song Decode, Explore, Favorites, Artist Profile |

**Private Admin Studio** — `/studio` (redirects to `/studio/login` when signed out)

Overview statistics, Albums, Songs, Lyrics & vocabulary, Song decode, Media, Settings.
Draft/published status, uploads, embed URL fields, previews, search and destructive-action
confirmation are all wired to real mutations — no decorative buttons.

## 3. Data layer

`src/lib/dataClient.js` exposes a single `repo`. It has two interchangeable adapters:

* **Supabase** — used automatically when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  are present. Row Level Security decides what each visitor may read or write.
* **Local demo** — used when those variables are absent, so the whole interface stays
  clickable offline. Data lives in `localStorage` and is clearly demo-only.

## 4. Supabase setup (requires your action)

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → paste and run `supabase/schema.sql`. It creates profiles, roles, albums,
   songs, audio sources, lyric versions, lyric lines, translations, pronunciation guides,
   vocabulary, song analyses, favorites, playlists, playlist items — with **RLS enabled on
   every table**, staff-only writes, published-only public reads, storage buckets
   `yumeika-audio` / `yumeika-artwork` and their policies, plus the profile/role trigger.
3. Authentication → Users → create your own account (email + password).
4. Promote it once, in the SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

5. Add the build-time variables in **Settings → Environment variables** (never commit them):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | `anon` public key |

   The `service_role` key is **never** used by the client and must never be exposed.
6. Rebuild. `Settings → Data source` in the Studio confirms the active mode.

## 5. Roles

| Role | Can do |
| --- | --- |
| `visitor` | Read published content only |
| `editor` | Create/edit/publish albums, songs, lyrics, analysis, media |
| `admin` | Everything, plus role management |

Roles are enforced in the database (RLS + trigger), not only in the UI.

## 6. Content rules baked into the app

* Karaoke unlocks only for an **uploaded audio file** with per-line start/end timings.
* External playback uses official Spotify/YouTube embeds and links only; `EmbedFrame`
  rejects any other host. No audio is downloaded or re-hosted.
* Sample content is flagged `is_sample` and badged everywhere it appears.
* Analyses carry `is_ai_generated` + a disclaimer; they are never presented as artist
  statements.
* Credentials live in environment variables. `tests/security.test.js` fails the build if a
  service-role key or a committed `.env` appears.

## 7. Offline app (installable)

YUMEIKA is offline-first: after the first visit everything a fan needs lives on the device.

* `scripts/build-sw.mjs` runs after every `vite build` and generates `dist/sw.js` plus
  `dist/offline-manifest.json`. The precache list is read from the real build output and the
  cache version is a hash of those files, so a new build replaces the old shell instead of
  serving stale assets.
* `scripts/sw-template.js` holds the worker: shell precache, navigation fallback to the cached
  `index.html`, audio served from cache with HTTP Range support (seeking keeps working offline),
  old-cache cleanup and `SKIP_WAITING` updates. `/api/*` and third-party players are never cached.
* Fonts are local system stacks: `src/styles/theme.css` has no remote `@import`, so typography
  renders with no connection.
* `public/manifest.webmanifest` with 192/512/maskable PNG icons makes the app installable on
  Android; on iPhone/iPad use Share → Add to Home Screen. `/offline` shows connection status,
  storage usage, a "save all files" control with real progress and an update button.
* `npm run build` must run before `npm start`, because the worker is generated from `dist/`.

`tests/offline.test.js` checks the generated worker, the manifest and the absence of remote
assets; `tests/service-worker.test.js` runs the worker itself against a simulated cache and
network to prove the app shell, static assets and audio still respond with the network off.

## 8. What still needs you

1. Supabase project + `schema.sql` + your admin account (section 4).
2. The two `VITE_*` environment variables, then a rebuild.
4. Real album artwork, audio files and lyrics you are authorised to publish.
5. Install it on your phone: open the site in Chrome → menu → *Install app*, or on iPhone
   Safari → Share → *Add to Home Screen*. Then open `/offline` and tap *Save all files*.

Not built here: payments, streaming licensing, native Android packaging (the PWA is the
install path), and any scraping of official platforms.

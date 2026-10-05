# Groovio

React Native music player using Expo SDK 57, TypeScript, and Expo Router. Android is the first target. Deezer provides ranked song discovery, MusicBrainz enriches matching recordings, and the sibling music service prepares audio for the offline library.

## Run

Start the service in WSL from `../music-service`:

```sh
bash scripts/dev.sh
```

Then run the app from this folder:

```sh
npm install
npm start
```

Use a matching Expo Go version or an Android development build. `npm run android` opens an available emulator. `npm run web` supports search, song downloads, and playback. Downloaded audio and cover art stay in IndexedDB and remain playable after reloading without contacting the music service. Local file imports still require a native device. Browser storage belongs to the preview's origin (including its port) and can be cleared by browser settings or storage eviction.

The default service address is `http://10.0.2.2:8090` for the Android emulator. Set `EXPO_PUBLIC_MUSIC_SERVICE_URL` in `.env.local`, or use Music service in Search to save another address. A physical phone needs a reachable LAN or HTTPS service address. WSL networking may require forwarding or using the WSL IP; the app does not assume Windows localhost forwarding is configured.

## Appearance

Matte charcoal is the only available appearance for now. Its sculpted charcoal surfaces and ember-orange controls follow the reference design. Settings → Appearance shows the active theme with a play-button preview. Previous theme selections migrate to Matte charcoal.

All visual tokens live in `src/theme.ts`: colors, gradients, shadows, typography, spacing, radii, sizes, and interaction opacity. Pages fill the screen directly on the theme background, without a surrounding panel, border, or width cap. Content uses 16-pixel insets; the mini player has an 8-pixel outer margin. The menu touches the screen sides and bottom, with only a top border and rounded top corners. Both controls share the theme's dock radius. Safe-area padding stays inside the menu background. Sheets and inset settings cards share the content padding. Add a complete `Theme` to the `themes` array to make it available in the picker. Components use `useTheme` and memoized `useThemeStyles`; avoid fixed palettes or module-level styles in new UI. Shared matte panels, recessed surfaces, and round controls live in `src/components/Matte.tsx`.

Home, Search, Library, and Settings share a compact rounded gradient navigation bar with outlined icons, an accent-colored selected tab, and a separate, contrasting mini player above it. The dock floats over the page with a transparent surrounding area, letting content scroll behind both controls. Its measured height supplies scroll-content bottom padding so the last item can clear the dock, including safe-area insets. Skip buttons are plain icons; the mini player has no timeline or timestamps. Tap a song or the mini player to open Now Playing, where the dock is hidden. Closing the song screen keeps playback running through the shared PlaybackProvider. The vertical-dots song menu opens song actions and can refresh lyrics.

Now Playing includes shuffle, previous, play/pause, next, and off/all/one repeat modes. Previous restarts the current song after three seconds, otherwise follows listening history. Gray waveform bars animate from the playing audio's sampled energy. Pausing restores the resting waveform, using stored track.waveform peaks when provided and a decorative pattern otherwise. A separate orange progress line beneath the timestamps moves smoothly between playback updates. Android output sampling requires audio permission and a development build with the updated config; denied or unsupported sampling keeps the resting waveform. No microphone audio is recorded.

Timed lyrics use embedded track.syncedLyrics (LRC) first, then an exact title/artist/album/duration lookup through LRCLIB. Three lines slide with the playback clock, including when seeking backward. Tapping the snippet opens large lyrics over a blurred player; timed lines follow playback and can be tapped to seek. The view also displays plain lyrics when the provider supplies them. Results cache locally for offline playback; missing, untimed, instrumental, and failed lookups show explicit states. Imports with an unknown artist cannot be matched until embedded-tag reading or metadata editing is added.

## Home and collections

Home shows the GROOVIO header, available device storage on native platforms, Recently Played, Recently Added, and Pinned Playlists. Empty sections retain their cover/card placeholders with an explanatory overlay and a relevant action. The web preview labels storage as Device storage because browser storage quotas do not describe free phone space. Listening history is saved locally and starts when a song actually plays.

Library has Playlists, Artists, Albums, Songs, and Downloads views, with local filtering and recent/alphabetical sorting. Song rows include play/pause and an options menu. Create playlists, add songs, and pin them to Home; playlists are stored locally. Playlist playback follows the selected collection’s song order. Artist and album groups use the library’s existing metadata.

Settings contains Appearance, Equalizer, Sleep timer, and About. Equalizer is a preview with saved presets and editable bands; it does not yet process audio. Sleep timer pauses playback after the selected duration or when the current song ends, ahead of repeat/queue advancement. Timers last for the current app session and check overdue deadlines when the app returns to the foreground.

## Library

Import multiple audio files with the system picker. Files are copied into app document storage and indexed locally across restarts. Playback includes play/pause, seeking, previous/next, and automatic advancement.

Downloaded tracks keep their title, artist, album, optional cover art, Deezer track ID, and MusicBrainz recording/release IDs and ISRC where available. Album artwork is copied locally when available so it remains accessible offline. Imported files use filenames and an unknown artist until embedded-tag reading is added.

Each track records `origin: local` or `origin: service`, its metadata source, and file availability. MusicBrainz references describe metadata provenance separately from the downloaded audio. Uninstalling the app removes its stored library files.

## Search and Downloads

Search places Downloads beside Back, with a badge for pending preparation and file transfers. It opens a bottom drawer containing the queue, saved songs, and retry actions. The search icon sits at the right of the input, with a clear button immediately before it when a query is present.

Search automatically sends a debounced song/artist query to `GET /api/search` after two characters. Deezer's ranking puts popular artist recordings first, including NF's mainstream tracks. All/Songs results combine matching available local songs with catalog tracks; Artists and Albums group those results, and Playlists searches local playlists. Artist/album catalog pages show the matching recordings returned by the service. Additional search pages load on demand. Song options offer download, play, playlist selection for saved songs, artist/album pages, and sharing. Catalog Play now downloads before playback; playback starts after saving on native platforms.

Download submits the Deezer track ID to the service; legacy MusicBrainz requests remain supported. The service persists the request immediately, retrieves authoritative Deezer metadata, and optionally enriches it through an ISRC or verified title/artist MusicBrainz match. A missing enrichment match keeps the Deezer metadata. The worker prepares audio and embeds available catalog IDs. Downloads, accessible from Library or Search, displays queued, resolving, preparing, failed, and saved states.

The app persists job IDs and the service address associated with each job. It checks progress every five seconds while running, saves completed audio into the offline library on native and web platforms, and resumes unfinished transfers when reopened. Failed jobs and device transfers can be retried. Browser song rows keep stable file keys; temporary playback URLs are recreated from stored audio after a refresh. Saving files currently requires the app to be running; this is not a background-transfer implementation.

Public catalog search needs no Deezer OAuth or MusicBrainz credentials. The service caches and limits Deezer traffic separately from MusicBrainz enrichment. MusicBrainz requests identify the app using the public FlyDoodle profile and share a serialized limiter.

## Local database

Native builds use Expo SQLite with Drizzle ORM in `groovio.db`; the web preview uses IndexedDB with the same repository interface. Schema and migrations live in `src/database`. Songs, file states, playlists and ordered song links, listening events, download jobs, and preferences all persist locally. Personal library data and listening statistics are not synced to a cloud account. The music service retains its own durable preparation queue and output files.

Existing AsyncStorage data migrates once, keeping the original keys as recovery copies. Migration completion is marked only after every write succeeds, so an interrupted migration can retry. Listening sessions save heard time and completion idempotently; pauses, seeks, and buffering do not inflate listening minutes. Migrated recent-history entries remain visible without inventing historical play counts or listening time. About displays actual local song, play, and listening totals.

On startup and foreground return, native builds reconcile the app-owned music folder with its song index. Unindexed audio is discovered, and missing or empty files are marked unavailable while their playlist links and history remain intact. Missing service downloads can be downloaded again; imported songs can be restored through the system file picker from their options menu. Owned filenames are resolved against the current document directory to tolerate sandbox path changes. Device-wide media scanning remains separate future work.

## Remaining device work

Android media-library scanning, reading embedded tags in imports, background audio, lock-screen controls, and physical-device playback/transfer validation remain to be added. Audio matching still depends on the service's yt-dlp search and is not guaranteed to select the exact recording.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
```

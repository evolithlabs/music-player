<template>
  <QPage class="text-white pb-footer pt-4 h-full flex flex-col">
    <div class="flex flex-col gap-2 mb-2">
      <h1 class="text-3xl flex items-center gap-2 font-bold mx-4">
        <QIcon name="bi-music-note-beamed" class="text-4xl" />
        Your Library

        <QBtn dense round flat class="ml-auto p-0 m-0" @click="rescanTracks">
          <QCircularProgress
            show-value
            :value="scanProgress"
            :thickness="scanProgress ? 0.1 : 0"
            animation-speed="1000"
            track-color="grey-9"
            class="text-4xl !p-0 !m-0"
          >
            <QIcon
              name="bi-arrow-clockwise"
              size="sm"
              class="!p-0 !m-0"
              :class="{ 'animate-spin': scanProgress }"
            />
          </QCircularProgress>
        </QBtn>
      </h1>
    </div>

    <LibrarySearchAndFilter
      v-model:query="searchQuery"
      v-model:tab="tab"
      :tracks="tracks"
      :artists="artists"
      :albums="albums"
      type="local"
      @load-tracks="onLoadMoreTracks"
      @load-artists="onLoadMoreArtists"
      @load-albums="onLoadMoreAlbums"
    ></LibrarySearchAndFilter>
  </QPage>
</template>

<script setup lang="ts">
import { QBtn, QCircularProgress, QIcon, QPage, useQuasar } from 'quasar';
import LibrarySearchAndFilter from 'src/components/LibrarySearchAndFilter.vue';
import { useLocalDB } from 'src/composables/local-db';
import { useMediaLibraryStore } from 'src/stores/media-library';
import type { Album, Artist, Track } from 'src/types/data';
import type { LibraryTab } from 'src/types/library';
import { nextTick, onMounted, ref, watch } from 'vue';

const $q = useQuasar();
const mediaLibraryStore = useMediaLibraryStore();
const localDb = useLocalDB();

const searchQuery = ref<string>('');
const tab = ref<LibraryTab>('tracks');

const PAGE_SIZE = 15;
onMounted(async () => {
  if (mediaLibraryStore.scanningTracks) {
    scanProgress.value = 25;
  } else if (mediaLibraryStore.syncingTracksToDb) {
    scanProgress.value = 66;
  }

  // Get tracks count
  await fetchTracksCount();
  await fetchTracks(0);
});

const tracksCount = ref(0);
const fetchTracksCount = async () => {
  try {
    tracksCount.value = Number(await localDb.getTracksCount());
  } catch (error) {
    $q.notify({
      message: `Oops - Failed to fetch tracks`,
      type: 'negative',
      caption: (error as Error).message,
    });
  }
};

const tracks = ref<Track[]>([]);
const tracksPage = ref(0);
const fetchingTracks = ref(false);
const fetchTracks = async (page: number) => {
  tracksPage.value = page;

  try {
    fetchingTracks.value = true;
    const databaseTracks = await localDb.fetchTracks(PAGE_SIZE, page * PAGE_SIZE);
    if (page == 0) tracks.value = [];

    const newTracks: Track[] = [];
    databaseTracks.forEach((dbTrack) => {
      const artistsStr = dbTrack.artists.map((dbArtist) => dbArtist.name).join(', ');
      const track: Track = {
        id: dbTrack.id?.toString() ?? '-1',
        spotify_id: dbTrack.spotify_id,
        name: dbTrack.name ?? 'Unknown Title',
        artist: artistsStr.length ? artistsStr : 'Unknown',
        album: dbTrack.album?.name ?? 'Unknown Album',
        duration: dbTrack.duration ?? 0,
        coverPath: dbTrack.cover_path,
        year: dbTrack.year,
        path: dbTrack.path ?? '',
      };

      newTracks.push(track);
    });

    tracks.value.push(...newTracks);
  } catch (error) {
    $q.notify({
      message: `Oops - Failed to fetch tracks`,
      type: 'negative',
      caption: (error as Error).message,
    });
  }

  fetchingTracks.value = false;
};

const onLoadMoreTracks = async () => {
  if (tracks.value.length >= tracksCount.value || fetchingTracks.value) return;

  await fetchTracks(tracksPage.value + 1);
};

const artistsCount = ref(10);
// TODO: Get artists count

const artists = ref<Artist[]>([]);
const artistsPage = ref(0);
const fetchingArtists = ref(false);
const fetchArtists = async (page: number) => {
  artistsPage.value = page;

  try {
    fetchingArtists.value = true;
    const databaseArtists = await localDb.fetchArtists(PAGE_SIZE, page * PAGE_SIZE);
    if (page == 0) artists.value = [];

    databaseArtists.forEach((dbArtist) => {
      const artist: Artist = {
        id: dbArtist.id?.toString() ?? '-1',
        name: dbArtist.name ?? 'Unknown Title',
        tracksCount: Number(dbArtist.tracks?.count) || 0,
        albumsCount: Number(dbArtist.albums?.count) || 0,
      };

      artists.value.push(artist);
    });
  } catch (error) {
    $q.notify({
      message: `Oops - Failed to fetch artists`,
      type: 'negative',
      caption: (error as Error).message,
    });
  }

  fetchingArtists.value = false;
};

const onLoadMoreArtists = async () => {
  if (artists.value.length >= artistsCount.value || fetchingArtists.value) return;

  await fetchArtists(artistsPage.value + 1);
};

const albumsCount = ref(10);
// TODO: Get albums count

const albums = ref<Album[]>([]);
const albumsPage = ref(0);
const fetchingAlbums = ref(false);
const fetchAlbums = async (page: number) => {
  albumsPage.value = page;

  try {
    fetchingAlbums.value = true;
    const databaseAlbums = await localDb.fetchAlbums(PAGE_SIZE, page * PAGE_SIZE);
    if (page == 0) albums.value = [];

    databaseAlbums.forEach((dbAlbum) => {
      const album: Album = {
        id: dbAlbum.id?.toString() ?? '-1',
        name: dbAlbum.name ?? 'Unknown Title',
        coverPath: dbAlbum.cover_path,
        artist: dbAlbum.artists.map((a) => a.name).join(', ') || 'Unknown artist',
        tracksCount: Number(dbAlbum.tracks?.count) || 0,
      };

      albums.value.push(album);
    });
  } catch (error) {
    $q.notify({
      message: `Oops - Failed to fetch albums`,
      type: 'negative',
      caption: (error as Error).message,
    });
  }

  fetchingAlbums.value = false;
};

const onLoadMoreAlbums = async () => {
  if (albums.value.length >= albumsCount.value || fetchingAlbums.value) return;

  await fetchAlbums(albumsPage.value + 1);
};

const scanProgress = ref(0);
const rescanTracks = async () => {
  scanProgress.value = 0;

  await nextTick();
  scanProgress.value = 25;

  await mediaLibraryStore.scanTracks();
  scanProgress.value = 66;

  await mediaLibraryStore.syncTracksToDB();
  scanProgress.value = 100;

  setTimeout(() => {
    scanProgress.value = 0;
  }, 1000);
};

// Watchers for updating ui for scanning tracks (if coming to page in the middle of a rescan)
watch(
  () => mediaLibraryStore.scanningTracks,
  (newValue) => {
    if (!newValue) {
      scanProgress.value = 66;
    }
  },
);

watch(
  () => mediaLibraryStore.syncingTracksToDb,
  (newValue) => {
    if (!newValue) {
      scanProgress.value = 100;
      setTimeout(() => {
        scanProgress.value = 0;
      }, 1000);
    }
  },
);

watch(tab, async (newTab, oldTab) => {
  // await new Promise((r) => setTimeout(r, 1000));
  switch (newTab) {
    case 'tracks':
      await fetchTracks(0);
      break;
    case 'artists':
      await fetchArtists(0);
      break;
    case 'albums':
      await fetchAlbums(0);
      break;
    default:
      break;
  }

  // Performance fix - remove all data and re-fetch when user re-enters the tab
  if (oldTab == 'tracks') {
    tracks.value = tracks.value.slice(0, Math.min(tracks.value.length, PAGE_SIZE));
  } else if (oldTab == 'artists') {
    artists.value = artists.value.slice(0, Math.min(artists.value.length, PAGE_SIZE));
  } else if (oldTab == 'albums') {
    albums.value = albums.value.slice(0, Math.min(albums.value.length, PAGE_SIZE));
  }
});
</script>

<style scoped></style>

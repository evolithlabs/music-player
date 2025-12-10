<template>
  <div>
    <router-view v-show="initializeProgress == 1" />
    <div
      v-if="initizalizing"
      class="h-dvh w-dvw absolute top-0 left-0 right-0 bottom-0 z-[9999] flex gap-4 bg-black !rounded-none text-white p-4 pt-32 opacity-100 transition-all duration-1000"
      :class="{ '!opacity-0': initializeProgress == 1 }"
    >
      <div
        class="absolute top-0 bottom-16 left-0 right-0 flex flex-col justify-center items-center gap-4"
      >
        <QBtn :icon="biHeadphones" dense class="text-5xl animate-wiggle pointer-events-none" />
        <h2 class="text-3xl">Tuning your library</h2>

        <div class="flex flex-col gap-2 items-start border border-white rounded-md p-4 text-xl">
          <span
            v-for="(text, i) in [
              'Scanning music folders',
              'Initializing music database',
              'Syncing music database',
              'Preparing media player',
            ]"
            :key="text"
            class="flex items-center gap-2"
          >
            <QIcon v-if="initializeProgress == i * 0.25" name="bi-record-circle" />
            <QIcon v-else-if="initializeProgress < (i + 1) * 0.25" name="bi-circle" />
            <QIcon v-else name="bi-check-circle" />
            {{ text }}
          </span>
        </div>

        <p class="text-xs text-center px-6">
          Don’t worry, this setup only runs the first time you launch the app. Future launches will
          skip this step.
        </p>
      </div>

      <QLinearProgress
        :value="initializeProgress"
        :animation-speed="1000"
        class="bg-zinc-700 text-white rounded-full h-4 self-end"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMediaControlsStore } from './stores/media-controls';
import { useMediaLibraryStore } from './stores/media-library';
import { useMediaPlayerStore } from './stores/media-player';
import { migrateUp } from './db/migrations/migrator';
import { QBtn, QIcon, QLinearProgress, useQuasar } from 'quasar';
import { getDbInstance } from './db';
import { biHeadphones } from '@quasar/extras/bootstrap-icons';
import { useLocalDB } from './composables/local-db';

const $q = useQuasar();
const localDb = useLocalDB();

const mediaLibraryStore = useMediaLibraryStore();
const mediaControlsStore = useMediaControlsStore();
const mediaPlayerStore = useMediaPlayerStore();

const initizalizing = ref(true);
const initializeProgress = ref(0);
onMounted(async () => {
  initizalizing.value = true;
  try {
    await mediaLibraryStore.scanTracks();
    initializeProgress.value = 0.25;

    await migrateDb();
    initializeProgress.value = 0.5;

    await syncTracksToDB();
    initializeProgress.value = 0.75;

    await initMediaPlayer();
    initializeProgress.value = 1;
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Oops - App Init error',
      caption: (error as Error).message,
    });
  }

  setTimeout(() => {
    initizalizing.value = false;
  }, 1000);
});

const migrateDb = async () => {
  $q.notify({
    message: 'migrating db',
  });

  const db = await getDbInstance();

  // await migrateDown(db, $q);
  await migrateUp(db, $q);
};

const syncTracksToDB = async () => {
  $q.notify({
    message: 'Syncing trakcs to db',
  });

  const db = await getDbInstance();

  const d = db.getExecutor().adapter;
  $q.notify({
    type: 'info',
    message: `version ${JSON.stringify(d)}`,
  });
  // Scan for tracks in the media library
  for (let i = 0; i < mediaLibraryStore.tracks.length; i++) {
    const track = mediaLibraryStore.tracks[i];
    if (track) await localDb.syncTrackData(track);
  }
};

const initMediaPlayer = async () => {
  // Initialize media controls with the current track info
  await mediaControlsStore.init({
    track: mediaPlayerStore.currentTrack?.name ?? 'Unknown Track',
    artist: mediaPlayerStore.currentTrack?.artist ?? 'Unknown Artist',
    album: mediaPlayerStore.currentTrack?.album ?? 'Unknown Album',
    cover:
      mediaPlayerStore.currentTrack?.coverPath ??
      document.location.origin + '/images/background-cover.jpg',
    duration: mediaPlayerStore.currentTrack?.duration ?? 0,
    elapsed: 0,
    dismissable: false,
    isPlaying: false,
  });

  // Init media player
  if (mediaPlayerStore.currentTrack) {
    mediaPlayerStore.loadAudio();
  }
};
</script>

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
              'Updating database',
              'Scanning music folders',
              'Preparing media player',
            ]"
            :key="text"
            class="flex items-center gap-2"
          >
            <QIcon :name="initializeProgress < (i + 1) * 0.33 ? 'bi-circle' : 'bi-check-circle'" />
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
import { migrateDown, migrateUp } from './db/migrations/migrator';
import { QBtn, QIcon, QLinearProgress, useQuasar } from 'quasar';
import { getDbInstance } from './db';
import { biHeadphones } from '@quasar/extras/bootstrap-icons';

const $q = useQuasar();

const mediaLibraryStore = useMediaLibraryStore();
const mediaControlsStore = useMediaControlsStore();
const mediaPlayerStore = useMediaPlayerStore();

const initizalizing = ref(true);
const initializeProgress = ref(0);
onMounted(async () => {
  const db = await getDbInstance();

  initizalizing.value = true;
  try {
    await migrateDown(db, $q);

    initializeProgress.value = 0.16;
    await migrateUp(db, $q);

    initializeProgress.value = 0.33;
    await syncLocalTracks();

    initializeProgress.value = 0.66;
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

const initMediaPlayer = async () => {
  // Initialize media controls with the current track info
  await mediaControlsStore.init({
    track: mediaPlayerStore.currentTrack?.title ?? 'Unknown Track',
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

const syncLocalTracks = async () => {
  // Scan for tracks in the media library
  await mediaLibraryStore.scanTracks();
};
</script>

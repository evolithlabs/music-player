<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useMediaControlsStore } from './stores/media-controls';
import { useMediaLibraryStore } from './stores/media-library';
import { useMediaPlayerStore } from './stores/media-player';
import { migrate } from './db/migrations/migrator';
import { db } from 'src/boot/db';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const mediaLibraryStore = useMediaLibraryStore();
const mediaControlsStore = useMediaControlsStore();
const mediaPlayerStore = useMediaPlayerStore();

onMounted(async () => {
  try {
    await initMediaPlayer();
    await runDbMigrations();
    await syncLocalTracks();
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Oops - App Init error',
      caption: (error as Error).message,
    });
  }
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
const runDbMigrations = async () => {
  await migrate(db);
};

const syncLocalTracks = async () => {
  // Scan for tracks in the media library
  await mediaLibraryStore.scanTracks();
};
</script>

<template>
  <q-page class="row items-center justify-evenly">
    <div v-for="track in mediaLibraryStore.tracks" :key="track.path" class="column items-center">
      <h6>{{ track.title }}</h6>
      <pre>{{ Object.keys(track) }}</pre>
      <button @click="playAudio(track)">Play</button>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useMediaLibraryStore } from 'src/stores/media-library';
import { useMediaControlsStore } from 'src/stores/media-controls';
import { useMediaPlayerStore } from 'src/stores/media-player';
import type { Track } from 'src/types/tracks';

const mediaLibraryStore = useMediaLibraryStore();
const mediaControlsStore = useMediaControlsStore();
const mediaPlayerStore = useMediaPlayerStore();

onMounted(async () => {
  // Scan for tracks in the media library
  await mediaLibraryStore.scanTracks();

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
});

const playAudio = async (track: Track) => {
  mediaPlayerStore.load(track);
  await mediaPlayerStore.play();
  await mediaControlsStore.updateMetadata({
    track: track.title,
    artist: track.artist,
    album: track.album,
    cover: track.coverPath,
    duration: track.duration,
    isPlaying: true,
  });
};
</script>

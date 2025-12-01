<script setup lang="ts">
import { QBtn, QImg } from 'quasar';
import { useMediaControlsStore } from 'src/stores/media-controls';
import { useMediaPlayerStore } from 'src/stores/media-player';
import type { Track } from 'src/types/tracks';
import { CapacitorMusicControls } from 'capacitor-music-controls-plugin';
import { Capacitor } from '@capacitor/core';

const props = defineProps<Track>();

const mediaPlayerStore = useMediaPlayerStore();
const mediaControlsStore = useMediaControlsStore();

const playPauseTrack = async () => {
  if (mediaPlayerStore.currentTrack?.id == props.id) {
    // toggle play/pause
    await mediaPlayerStore.toggle();
    CapacitorMusicControls.updateElapsed({
      elapsed: (mediaPlayerStore.audio.currentTime ?? 0) * 1000,
      isPlaying: mediaPlayerStore.isPlaying,
    });
  } else {
    // play a new track
    mediaPlayerStore.load(props);
    await mediaPlayerStore.play();
    await mediaControlsStore.updateMetadata({
      track: props.title,
      artist: props.artist,
      album: props.album,
      cover: props.coverPath,
      duration: props.duration,
      isPlaying: true,
    });
  }
};
</script>

<template>
  <div class="row no-wrap items-center">
    <QAvatar rounded class="q-mr-md">
      <QImg
        :src="Capacitor.convertFileSrc(coverPath) ?? '/images/background-cover.jpg'"
        width="64px"
      />
    </QAvatar>
    <div class="column">
      <h6
        class="q-ma-none text-body1 text-weight-bold"
        style="
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
        "
      >
        {{ title }}
      </h6>
      <span class="text-body2">{{ artist }}</span>
    </div>
    <div class="row q-ml-auto q-gutter-x-sm" style="flex-shrink: 0">
      <QBtn icon="download" fab-mini />
      <QBtn
        :icon="
          mediaPlayerStore.currentTrack?.id == id && mediaPlayerStore.isPlaying
            ? 'pause'
            : 'play_arrow'
        "
        fab-mini
        @click="playPauseTrack"
      />
    </div>
  </div>
</template>

<style scoped></style>

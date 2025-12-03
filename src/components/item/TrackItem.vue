<script setup lang="ts">
import { QBtn, QImg } from 'quasar';
import { useMediaControlsStore } from 'src/stores/media-controls';
import { useMediaPlayerStore } from 'src/stores/media-player';
import type { Track } from 'src/types/tracks';
import { Capacitor } from '@capacitor/core';

const props = defineProps<Track>();

const mediaPlayerStore = useMediaPlayerStore();
const mediaControlsStore = useMediaControlsStore();

const playPauseTrack = async () => {
  if (mediaPlayerStore.currentTrack?.id == props.id) {
    // toggle play/pause
    await mediaControlsStore.executeAction({
      message: 'music-controls-toggle-play-pause',
      position: 0,
    });
  } else {
    await mediaPlayerStore.loadAndPlayTracks(props, [props], {
      type: 'misc',
    });

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
  <div class="flex flex-nowrap items-center grow text-white rounded-md">
    <QAvatar rounded class="mr-3">
      <QImg
        :src="coverPath ? Capacitor.convertFileSrc(coverPath) : '/images/background-cover.jpg'"
        width="48px"
        position="cover"
        ratio="1"
        class="rounded-md"
      />
    </QAvatar>
    <div class="flex flex-col mr-4">
      <h6 class="font-bold line-clamp-1 text-sm">
        {{ title }}
      </h6>
      <div class="flex items-center gap-1">
        <span class="text-xs line-clamp-1">{{ artist }}</span>
        <span>•</span>
        <span class="text-xs">3:31</span>
      </div>
    </div>
    <div class="flex items-baseline ml-auto gap-2 shrink-0">
      <QBtn icon="download" round color="white" flat class="text-xs" />
      <QBtn
        :icon="
          mediaPlayerStore.currentTrack?.id == id && mediaPlayerStore.isPlaying
            ? 'pause'
            : 'play_arrow'
        "
        round
        color="white"
        glossy
        flat
        class="text-xs"
        @click="playPauseTrack"
      />
    </div>
  </div>
</template>

<style scoped></style>

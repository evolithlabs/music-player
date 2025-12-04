<script setup lang="ts">
import { QAvatar, QBtn, QImg, useQuasar } from 'quasar';
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

const $q = useQuasar();
const showTrackOptions = () => {
  $q.bottomSheet({
    title: `${props.artist} - ${props.title}`,
    grid: false,
    dark: true,
    class: 'bg-zinc-900 text-white border-t z-50',
    actions: [
      {
        icon: 'play_arrow',
        label: 'Play song',
        value: 'play',
      },
      {
        icon: 'visibility',
        label: 'More details',
        value: 'details',
      },
      {
        icon: 'person_2',
        label: 'Go to artist',
        value: 'artist',
      },
      {
        icon: 'album',
        label: 'Go to album',
        value: 'album',
      },
      {
        icon: 'download',
        label: 'Download now',
        value: 'download',
      },
      {
        icon: 'library_add',
        label: 'Add to library',
        value: 'library',
      },
    ],
  }).onOk((value) => {
    console.log('Option selected:', value);
  });
};
</script>

<template>
  <div class="flex flex-nowrap items-center grow text-white rounded-md">
    <QAvatar rounded class="mr-3 relative">
      <QImg
        :src="coverPath ? Capacitor.convertFileSrc(coverPath) : '/images/background-cover.jpg'"
        width="48px"
        position="cover"
        ratio="1"
      />
      <QBtn
        :icon="
          mediaPlayerStore.currentTrack?.id == id && mediaPlayerStore.isPlaying
            ? 'pause'
            : 'play_arrow'
        "
        flat
        class="text-xs absolute top-0 left-0 right-0 bottom-0"
        @click="playPauseTrack"
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
    <div class="flex items-baseline ml-auto shrink-0">
      <QBtn icon="download" round color="white" flat class="text-xs" />
      <QBtn icon="more_vert" round color="white" flat class="text-xs" @click="showTrackOptions" />
    </div>
  </div>
</template>

<style scoped></style>

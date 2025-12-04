<script setup lang="ts">
import { QBtn, QBtnDropdown, QImg, QItem, QList } from 'quasar';
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
    <QAvatar rounded class="mr-3 relative">
      <QImg
        :src="coverPath ? Capacitor.convertFileSrc(coverPath) : '/images/background-cover.jpg'"
        width="48px"
        position="cover"
        ratio="1"
        class="rounded-md"
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
      <QBtnDropdown dropdown-icon="more_vert" no-icon-animation round flat class="text-xs">
        <QList dense class="bg-black text-white py-2">
          <QItem class="!p-0">
            <QBtn
              icon="visibility"
              label="More info"
              align="left"
              flat
              v-close-popup
              class="grow text-xs"
            />
          </QItem>
          <QItem class="!p-0">
            <QBtn
              icon="person_2"
              label="Go to artist"
              align="left"
              flat
              v-close-popup
              class="grow text-xs"
            />
          </QItem>
          <QItem class="!p-0">
            <QBtn
              icon="album"
              label="Go to album"
              align="left"
              flat
              v-close-popup
              class="grow text-xs"
            />
          </QItem>
          <QItem class="!p-0">
            <QBtn
              icon="download"
              label="Download now"
              align="left"
              class="grow text-xs"
              flat
              v-close-popup
              @close="() => console.log('gay')"
            />
          </QItem>
          <QItem class="!p-0">
            <QBtn
              icon="library_add"
              label="Add to library"
              align="left"
              class="grow text-xs"
              flat
              v-close-popup
              @close="() => console.log('gay')"
            />
          </QItem>
        </QList>
      </QBtnDropdown>
    </div>
  </div>
</template>

<style scoped></style>

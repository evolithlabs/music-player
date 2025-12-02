<script setup lang="ts">
import { QAvatar, QBtn, QFooter, QImg, QSpinnerAudio } from 'quasar';
import FooterLink from '../FooterLink.vue';
import { useMediaPlayerStore } from 'src/stores/media-player';
import { Capacitor } from '@capacitor/core';
import { useMediaControlsStore } from 'src/stores/media-controls';

const mediaPlayerStore = useMediaPlayerStore();
const mediaControlsStore = useMediaControlsStore();

const leftLinks = [
  {
    title: 'Home',
    icon: 'home',
    to: '/',
  },
  {
    title: 'Library',
    icon: 'library_music',
    to: '/library',
  },
];

const rightLinks = [
  {
    title: 'Stream',
    icon: 'leak_add',
    to: '/library',
  },
  {
    title: 'Library',
    icon: 'settings',
    to: '/settings',
  },
];

const playPauseTrack = async () => {
  mediaControlsStore.executeAction({
    message: 'music-controls-toggle-play-pause',
    position: 0,
  });
};
</script>

<template>
  <QFooter elevated class="bg-blue-9">
    <div class="column q-pa-sm bg-blue-10">
      <div class="row no-wrap items-center">
        <QAvatar rounded class="q-mr-md">
          <QImg
            :src="
              mediaPlayerStore.currentTrack?.coverPath
                ? Capacitor.convertFileSrc(mediaPlayerStore.currentTrack?.coverPath)
                : '/images/background-cover.jpg'
            "
            position="cover"
            ratio="1"
            class="rounded-borders"
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
            {{ mediaPlayerStore.currentTrack?.title ?? 'Unknown Track' }}
          </h6>
          <span class="text-body2">{{
            mediaPlayerStore.currentTrack?.artist ?? 'Unknown Artist'
          }}</span>
        </div>
        <div class="row q-ml-auto q-gutter-x-sm" style="flex-shrink: 0">
          <QBtn icon="skip_previous" flat fab-mini />
          <QBtn icon="skip_next" flat fab-mini />
          <div style="width: 2px" class="bg-white self-grow"></div>
          <QBtn
            :icon="mediaPlayerStore.isPlaying ? 'pause' : 'play_arrow'"
            flat
            fab-mini
            @click="playPauseTrack"
          />
        </div>
      </div>

      <!-- <div class="row no-wrap q-gutter-md items-center">
        <span class="text-caption">0:12</span>
        <QSlider :model-value="12"> </QSlider>
        <span class="text-caption">3:21</span>
      </div> -->
    </div>
    <div class="row q-py-sm">
      <FooterLink
        v-for="link in leftLinks"
        :key="link.to"
        :to="link.to"
        :icon="link.icon"
        class="col"
      >
      </FooterLink>

      <div to="/" class="col text-center">
        <QBtn
          icon="play_arrow"
          :loading="mediaPlayerStore.isPlaying"
          size="md"
          round
          @click="playPauseTrack"
        >
          <template v-slot:loading>
            <QSpinnerAudio />
          </template>
        </QBtn>
      </div>

      <FooterLink
        v-for="link in rightLinks"
        :key="link.to"
        :to="link.to"
        :icon="link.icon"
        class="col"
      >
      </FooterLink>
    </div>
  </QFooter>
</template>

<style scoped></style>

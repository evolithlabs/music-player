<script setup lang="ts">
import { QAvatar, QBtn, QFooter, QIcon, QImg, QSpinnerBars } from 'quasar';
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
    to: '/stream',
  },
  {
    title: 'Library',
    icon: 'settings',
    to: '/settings',
  },
];

const playPauseTrack = async () => {
  await mediaControlsStore.executeAction({
    message: 'music-controls-toggle-play-pause',
    position: 0,
  });
};
</script>

<template>
  <QFooter class="column column-reverse bg-transparent">
    <div class="column q-mx-xs q-px-xs q-mb-xs bg-grey-10 rounded-borders">
      <div class="row no-wrap items-center q-pa-sm q-px-sm">
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
    <div class="row q-py-sm q-mb-sm q-mx-lg bg-glass">
      <FooterLink
        v-for="link in leftLinks"
        :key="link.to"
        :to="link.to"
        :icon="link.icon"
        class="col"
      >
      </FooterLink>

      <div to="/" class="col text-center">
        <QBtn round>
          <QImg
            src="/images/background-cover.jpg"
            ratio="1"
            style="border-radius: 50%"
            :class="{ 'spin-forever': mediaPlayerStore.isPlaying }"
          />
          <QIcon v-show="!mediaPlayerStore.isPlaying" name="blur_on" class="absolute" />
          <QSpinnerBars size="xs" v-show="mediaPlayerStore.isPlaying" class="absolute" />
        </QBtn>
      </div>
      <!-- <QBtn
        icon="play_arrow"
        :loading="mediaPlayerStore.isPlaying"
        size="md"
        round
        @click="playPauseTrack"
      >
        <template v-slot:loading>
          <QSpinnerAudio />
        </template>
      </QBtn> -->

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

<style scoped>
.spin-forever {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

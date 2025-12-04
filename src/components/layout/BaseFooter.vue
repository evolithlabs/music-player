<script setup lang="ts">
import { QAvatar, QBtn, QFooter, QIcon, QImg, QSpinnerBars } from 'quasar';
import FooterLink from '../FooterLink.vue';
import { useMediaPlayerStore } from 'src/stores/media-player';
import { Capacitor } from '@capacitor/core';
import { useMediaControlsStore } from 'src/stores/media-controls';
import { ref } from 'vue';

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
    icon: 'podcasts',
    to: '/stream',
  },
  {
    title: 'Library',
    icon: 'settings',
    to: '/settings',
  },
];

const showPlayer = ref(true);
const togglePlayerVisibility = () => {
  showPlayer.value = !showPlayer.value;
};

const playPauseTrack = async () => {
  await mediaControlsStore.executeAction({
    message: 'music-controls-toggle-play-pause',
    position: 0,
  });
};
</script>

<template>
  <QFooter class="flex flex-col gap-1 justify-end bg-transparent h-40 py-3">
    <div
      v-show="showPlayer"
      class="flex flex-col mx-2 px-1 bg-black/60 backdrop-blur-md rounded-md border border-gray-600"
    >
      <div class="row no-wrap items-center q-pa-sm q-px-sm">
        <QAvatar rounded class="mr-3">
          <QImg
            :src="
              mediaPlayerStore.currentTrack?.coverPath
                ? Capacitor.convertFileSrc(mediaPlayerStore.currentTrack?.coverPath)
                : '/images/background-cover.jpg'
            "
            position="cover"
            ratio="1"
          />
        </QAvatar>
        <div class="flex flex-col">
          <h6 class="text-base font-bold line-clamp-1">
            {{ mediaPlayerStore.currentTrack?.title ?? 'Unknown Track' }}
          </h6>
          <span class="text-xs line-clamp-1">{{
            mediaPlayerStore.currentTrack?.artist ?? 'Unknown Artist'
          }}</span>
        </div>
        <div class="flex ml-auto" style="flex-shrink: 0">
          <QBtn icon="skip_previous" flat fab-mini />
          <QBtn icon="skip_next" flat fab-mini />
          <div style="width: 2px" class="bg-white self-grow mx-1"></div>
          <QBtn
            :icon="mediaPlayerStore.isPlaying ? 'pause' : 'play_arrow'"
            flat
            fab-mini
            @click="playPauseTrack"
          />
        </div>
      </div>

      <!-- <div class="flex flex-nowrap gap-2 items-center px-2">
        <span class="text-xs">0:12</span>
        <QSlider :model-value="12"> </QSlider>
        <span class="text-xs">3:21</span>
      </div> -->
    </div>
    <div class="flex justify-evenly py-2 mx-6 bg-glass border border-gray-600">
      <FooterLink v-for="link in leftLinks" :key="link.to" :to="link.to" :icon="link.icon" />

      <div
        class="text-center relative mx-4 bg-black transition-all"
        :class="{ '!mx-2': showPlayer }"
      >
        <QBtn round outline />

        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-glass p-2 transition-all duration-[5000]"
          :class="{
            'p-2 ring ring-gray-600': !showPlayer,
          }"
        >
          <QBtn
            round
            class="text-sm z-50"
            :class="{
              '!text-lg': !showPlayer,
            }"
            @click="togglePlayerVisibility"
          >
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

      <FooterLink v-for="link in rightLinks" :key="link.to" :to="link.to" :icon="link.icon" />
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

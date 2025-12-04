<script setup lang="ts">
import { QBtn, QFooter, QIcon, QImg, QSlider, QSpinnerBars, QTab, QTabs } from 'quasar';
import FooterLink from '../FooterLink.vue';
import { useMediaPlayerStore } from 'src/stores/media-player';
import { Capacitor } from '@capacitor/core';
import { useMediaControlsStore } from 'src/stores/media-controls';
import { ref } from 'vue';
import { formatSecondsToMMSS } from 'src/utils/format-seconds';

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

const showPlayerInFullscreen = ref(false);
const toggleFullscreenPlayerVisibility = () => {
  showPlayerInFullscreen.value = !showPlayerInFullscreen.value;
};

const trackOrLyricsToggle = ref<'track' | 'lyrics'>('track');

const playPauseTrack = async () => {
  await mediaControlsStore.executeAction({
    message: 'music-controls-toggle-play-pause',
    position: 0,
  });
};
</script>

<template>
  <QFooter
    class="flex flex-col gap-1 justify-end bg-transparent h-[9.5rem] py-2.5 !z-50"
    :class="{ '!h-full pt-0': showPlayerInFullscreen }"
  >
    <!-- Media Player -->
    <div
      v-show="showPlayer"
      class="flex flex-col mx-2 px-1 bg-black/60 backdrop-blur-md rounded-md border border-gray-600"
      :class="{
        'grow !mx-0 transition-all duration-200 ': showPlayerInFullscreen,
      }"
      @click="() => (!showPlayerInFullscreen ? toggleFullscreenPlayerVisibility() : null)"
    >
      <div
        class="flex flex-nowrap items-center p-2"
        :class="{
          'flex-col justify-between grow p-4 pb-8': showPlayerInFullscreen,
        }"
      >
        <div
          v-show="showPlayerInFullscreen"
          class="flex flex-nowrap items-center justify-between gap-4 w-full"
        >
          <QBtn
            icon="arrow_back"
            dense
            round
            flat
            class="shrink-0"
            @click.stop="toggleFullscreenPlayerVisibility"
          ></QBtn>
          <h6 class="text-lg font-medium line-clamp-1 hidden">
            {{ mediaPlayerStore.currentTrack?.title ?? 'Unknown Track' }} by
            {{ mediaPlayerStore.currentTrack?.artist ?? 'nf' }}
          </h6>

          <QTabs v-model="trackOrLyricsToggle" dense :narrow-indicator="true" class="text-white">
            <QTab name="track" label="Track" />
            <QTab name="lyrics" label="Lyrics" />
          </QTabs>
          <QBtn icon="more_vert" dense round flat class="shrink-0"></QBtn>
        </div>
        <QImg
          :src="
            mediaPlayerStore.currentTrack?.coverPath
              ? Capacitor.convertFileSrc(mediaPlayerStore.currentTrack?.coverPath)
              : '/images/background-cover.jpg'
          "
          position="cover"
          ratio="1"
          no-transition
          class="h-full w-auto aspect-square rounded-md mr-3"
          :class="{
            '!h-auto !w-full !mr-0  ': showPlayerInFullscreen,
          }"
        />
        <div class="flex flex-col" :class="{ 'text-center': showPlayerInFullscreen }">
          <h5
            class="text-base font-bold line-clamp-1"
            :class="{ '!text-2xl transition-all': showPlayerInFullscreen }"
          >
            {{ mediaPlayerStore.currentTrack?.title ?? 'Unknown Track' }}
          </h5>
          <span
            class="text-xs line-clamp-1 text-white/80"
            :class="{ '!text-base transition-all': showPlayerInFullscreen }"
          >
            {{ mediaPlayerStore.currentTrack?.artist ?? 'Unknown Artist' }}
          </span>
        </div>

        <div
          v-show="showPlayerInFullscreen"
          class="w-full flex flex-nowrap gap-4 items-center px-2"
        >
          <span class="text-xs">{{ formatSecondsToMMSS(mediaPlayerStore.elapsedTime) }}</span>
          <QSlider
            :model-value="mediaPlayerStore.elapsedTime"
            color="white"
            track-color="grey-8"
            class="grow"
            @change="
              (val) =>
                mediaControlsStore.executeAction({
                  message: 'music-controls-seek-to',
                  position: val * 1000,
                })
            "
          >
          </QSlider>
          <span class="text-xs">{{
            formatSecondsToMMSS((mediaPlayerStore.currentTrack?.duration ?? 0) / 1000)
          }}</span>
        </div>
        <div
          class="flex items-center gap-3 shrink-0"
          :class="{
            'mt-autoo ': showPlayerInFullscreen,
            'ml-auto': !showPlayerInFullscreen,
          }"
        >
          <QBtn
            v-show="showPlayerInFullscreen"
            icon="shuffle"
            flat
            round
            dense
            class="text-md order-1"
          />
          <QBtn
            icon="skip_previous"
            flat
            round
            dense
            class="text-xs order-2"
            :class="{ '!text-2xl transition-all ': showPlayerInFullscreen }"
            @click.stop="
              mediaControlsStore.executeAction({
                message: 'music-controls-previous',
                position: 0,
              })
            "
          />
          <QBtn
            icon="skip_next"
            flat
            round
            dense
            class="text-xs order-3"
            :class="{ '!text-2xl transition-all ': showPlayerInFullscreen }"
            @click.stop="
              mediaControlsStore.executeAction({
                message: 'music-controls-next',
                position: 0,
              })
            "
          />
          <div v-show="!showPlayerInFullscreen" class="bg-white grow mx-1 h-8 w-0.5 order-4"></div>
          <QBtn
            :icon="mediaPlayerStore.isPlaying ? 'pause' : 'play_arrow'"
            round
            dense
            class="text-xs order-5"
            :class="{ '!text-2xl !order-2 ring ring-white': showPlayerInFullscreen }"
            @click.stop="playPauseTrack"
          />
          <QBtn
            v-show="showPlayerInFullscreen"
            icon="repeat"
            flat
            round
            dense
            class="text-md order-6"
          />
        </div>
      </div>
    </div>

    <!-- Navigation -->
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

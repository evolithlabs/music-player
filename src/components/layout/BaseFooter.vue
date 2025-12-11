<script setup lang="ts">
import {
  QBtn,
  QBtnGroup,
  QDialog,
  QFooter,
  QImg,
  QSlider,
  QSpinnerBars,
  QTab,
  QTabPanel,
  QTabPanels,
  QTabs,
} from 'quasar';
import FooterLink from '../FooterLink.vue';
import { useMediaPlayerStore } from 'src/stores/media-player';
import { Capacitor } from '@capacitor/core';
import { useMediaControlsStore } from 'src/stores/media-controls';
import { ref } from 'vue';
import { formatMsToMMSS } from 'src/utils/format-ms-to-mmss';

const mediaPlayerStore = useMediaPlayerStore();
const mediaControlsStore = useMediaControlsStore();

const leftLinks = [
  {
    title: 'Home',
    icon: 'bi-house',
    to: '/',
  },
  {
    title: 'Library',
    icon: 'bi-collection-play',
    to: '/library',
  },
];

const rightLinks = [
  {
    title: 'Spotify',
    icon: 'bi-spotify',
    to: '/spotify-library',
  },
  {
    title: 'Library',
    icon: 'bi-gear',
    to: '/spotify-callback',
  },
];

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
  <QFooter class="flex flex-col gap-1.5 justify-end bg-transparent h-footer !z-[6000]">
    <!-- Media Player -->
    <div
      class="flex flex-col mx-2 p-2 bg-black/60 backdrop-blur-md rounded-md border border-zinc-500"
      @click="toggleFullscreenPlayerVisibility"
    >
      <div class="flex flex-nowrap items-center p-2">
        <QImg
          :src="
            mediaPlayerStore.currentTrack?.coverPath
              ? Capacitor.convertFileSrc(mediaPlayerStore.currentTrack?.coverPath)
              : '/images/background-cover.jpg'
          "
          position="cover"
          ratio="1"
          no-transition
          class="h-full w-auto aspect-square rounded-md mr-3 shrink-0"
        />
        <div class="flex flex-col">
          <h5 class="text-base font-bold line-clamp-1 break-all">
            {{ mediaPlayerStore.currentTrack?.name ?? 'Unknown Track' }}
          </h5>
          <span class="text-xs text-white/80 line-clamp-1 break-all">
            {{ mediaPlayerStore.currentTrack?.artist ?? 'Unknown Artist' }}
          </span>
        </div>

        <div class="flex items-center gap-0 shrink-0 ml-auto">
          <QBtn
            icon="bi-skip-start"
            flat
            round
            dense
            class="text-sm order-2"
            @click.stop="
              mediaControlsStore.executeAction({
                message: 'music-controls-previous',
                position: 0,
              })
            "
          />
          <QBtn
            icon="bi-skip-end"
            flat
            round
            dense
            class="text-sm order-3"
            @click.stop="
              mediaControlsStore.executeAction({
                message: 'music-controls-next',
                position: 0,
              })
            "
          />
          <div class="bg-white grow mx-2 h-8 w-0.5 order-4"></div>
          <QBtn
            :icon="mediaPlayerStore.isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"
            round
            dense
            class="text-sm order-5"
            @click.stop="playPauseTrack"
          />
        </div>
      </div>
    </div>

    <!-- Media Player Fullscreen Dialog -->
    <QDialog
      v-model="showPlayerInFullscreen"
      position="top"
      transition-show="slide-up"
      transition-hide="jump-down"
      maximized
      class="bg-glass text-white z-[7000]"
    >
      <div class="p-4 !h-dvh flex flex-col">
        <div class="flex flex-nowrap items-center justify-between gap-4 w-full mb-8">
          <QBtn
            icon="bi-arrow-left"
            dense
            round
            flat
            class="shrink-0"
            @click.stop="toggleFullscreenPlayerVisibility"
          ></QBtn>

          <QTabs v-model="trackOrLyricsToggle" dense :narrow-indicator="true" class="text-white">
            <QTab name="track" label="Track" />
            <QTab name="lyrics" label="Lyrics" />
          </QTabs>
          <QBtn icon="bi-three-dots-vertical" dense round flat class="shrink-0"></QBtn>
        </div>

        <div class="flex flex-col flex-nowrap gap-8 grow">
          <QTabPanels
            v-model="trackOrLyricsToggle"
            animated
            swipeable
            class="p-0 m-0 bg-transparent grow"
          >
            <QTabPanel name="track" class="p-0 m-0 bg-transparent text-center">
              <QImg
                :src="
                  mediaPlayerStore.currentTrack?.coverPath
                    ? Capacitor.convertFileSrc(mediaPlayerStore.currentTrack?.coverPath)
                    : '/images/background-cover.jpg'
                "
                position="cover"
                ratio="1"
                no-transition
                class="w-5/6 h-auto aspect-square rounded-md mx-auto shrink border"
              />
              <div class="flex flex-col text-center mt-4">
                <h5 class="text-2xl font-bold line-clamp-1">
                  {{ mediaPlayerStore.currentTrack?.name ?? 'Unknown Track' }}
                </h5>
                <span class="text-base line-clamp-1 text-white/80">
                  {{ mediaPlayerStore.currentTrack?.artist ?? 'Unknown Artist' }}
                </span>
              </div>
            </QTabPanel>
            <QTabPanel name="lyrics" class="p-0 m-0">
              <div class="h-full w-full aspect-square overflow-scroll">
                <pre class="whitespace-pre-wrap text-2xl text-white/60">
<span class=" text-white">Hello darkness, my old friend (hello)

Knocking at my door again

Beggin' me to </span>come outside 

Let you back into my life

Now, usually I'd be strong enough

To lock the doors and keep 'em shut

But not today, I'm desperate (desperate)

So go ahead and come on in
So go ahead and come on in
So go ahead and come on in

OCD is worse than ever, hands are bleedin', maybe I should take the pills, don't (whoa)

Know what's goin' on with me, some days I actually think I might be schizo- (whoa)

Phrenic, prolly not, but even writin' this is makin' me begin to spiral, oh, God (oh, oh, oh)

Made a promise, told myself I wouldn't let the fear back in, but then I did, though (whoa)

Told the world that I was sick of runnin', then went back to runnin', what a joke (whoa)

Disappointed, yeah, me too, I thought I finally had finally made a breakthrough, guess not (oh, oh, oh)

It's the same song and dance, you've all seen it before
Darkness holds out his hand, then we walk to the floor

Every decision made isn't mine anymore
Like a puppet with strings, I just don't have a choice

What's the truth? What's a lie?
Help me, God, help me, Lord
Face your fears, dry your eyes
Grandma died, what's the point?

Lost the keys, lost my hope, lost my will, lost my joy
Lost a friend, lost my home, lost my faith, lost my voice

Standing back, watching my mansion burn to ash while I
Hold the gas can, asking God if He started this fire
Is this what You wanted? Is this what You wanted?
Make all my hopes and my dreams come to life just to lay them to rest
Is this what You wanted? Is this what You wanted?
Give me a false sense of peace just to show me what peace really is
Is this what You wanted?
On the verge, on the edge
(Is this what You wanted?)
Petrified, scared to death
(Is this what You wanted?)
Prayin' to God, desperate
(Is this what You wanted, what You wanted?)
(Is this what You wanted?)
Hangin' on by a thread
(Is this what You wanted?)
Empty heart, nothin' left
(Is this what You wanted?)
Breakin' down, spiralin'
(Is this what You wanted, what You wanted?)
(Is this what You wanted?)
Standing back (is this what You wanted?)
Watching my mansion (is this what You wanted?)
Burn to ash (is this what You wanted?) while I (oh, oh, oh)
(What You wanted, is this what You wanted?)
Hold the gas (is this what You wanted?) can
Asking God if (is this what You wanted?)
He started this fire (is this what You wanted, what You wanted?)
            </pre>
              </div>
            </QTabPanel>
          </QTabPanels>

          <div class="w-full flex flex-nowrap gap-4 items-center px-2 mt-auto">
            <span class="text-xs">{{ formatMsToMMSS(mediaPlayerStore.elapsedTime) }}</span>
            <QSlider
              :model-value="mediaPlayerStore.elapsedTime"
              :min="0"
              :max="mediaPlayerStore.currentTrack?.duration ?? 0"
              color="white"
              track-color="grey-8"
              class="grow"
              @change="
                (val) =>
                  mediaControlsStore.executeAction({
                    message: 'music-controls-seek-to',
                    position: val,
                  })
              "
            >
            </QSlider>
            <span class="text-xs">
              {{ formatMsToMMSS(mediaPlayerStore.currentTrack?.duration ?? 0) }}
            </span>
          </div>

          <div class="flex items-center justify-evenly gap-3 shrink-0">
            <QBtn icon="bi-shuffle" flat round dense class="text-md order-1" />
            <QBtn
              icon="bi-skip-start"
              flat
              round
              dense
              class="text-2xl order-2"
              @click.stop="
                mediaControlsStore.executeAction({
                  message: 'music-controls-previous',
                  position: 0,
                })
              "
            />
            <QBtn
              :icon="mediaPlayerStore.isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"
              round
              dense
              class="text-2xl order-2 ring ring-white"
              @click.stop="playPauseTrack"
            />
            <QBtn
              icon="bi-skip-end"
              flat
              round
              dense
              class="text-2xl order-3"
              @click.stop="
                mediaControlsStore.executeAction({
                  message: 'music-controls-next',
                  position: 0,
                })
              "
            />
            <QBtn icon="bi-repeat" flat round dense class="text-md order-6" />
          </div>

          <QBtnGroup rounded outline class="self-center">
            <QBtn label="Up next" class="bg-zinc-800 text-sm" />
            <QBtn label="Related" class="bg-zinc-800 text-sm" />
          </QBtnGroup>
        </div>
      </div>
    </QDialog>

    <!-- Navigation -->
    <div
      class="flex justify-evenly bg-glass !rounded-none !rounded-t-md py-2 border-t border-zinc-500"
    >
      <FooterLink v-for="link in leftLinks" :key="link.to" :to="link.to" :icon="link.icon" />

      <QBtn round class="z-50" @click="toggleFullscreenPlayerVisibility">
        <QImg
          :src="
            mediaPlayerStore.currentTrack?.coverPath
              ? Capacitor.convertFileSrc(mediaPlayerStore.currentTrack?.coverPath)
              : '/images/background-cover.jpg'
          "
          ratio="1"
          style="border-radius: 50%"
          :class="{
            'animate-[spin_10s_linear_infinite] ': mediaPlayerStore.isPlaying,
          }"
        />
        <QSpinnerBars size="xs" v-show="mediaPlayerStore.isPlaying" class="absolute" />
      </QBtn>
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

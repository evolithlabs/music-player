import { defineStore, acceptHMRUpdate } from 'pinia';
import { computed, ref, onMounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import type { QueueSource } from '../types/media-player';
import type { Track } from 'src/types/data';

export const useMediaPlayerStore = defineStore(
  'media-player',
  () => {
    const audio = new Audio();
    const isPlaying = ref(false);
    const elapsedTime = ref(0);

    const queue = ref<Track[]>([]);
    const queueSource = ref<QueueSource>();
    const queueIndex = ref<number>(0);

    onMounted(() => {
      isPlaying.value = false;
    });

    const currentTrack = computed(() => {
      return queue.value[queueIndex.value];
    });

    const loadTracks = (track: Track, tracksQueue: Track[], trackSource: QueueSource) => {
      // Find the starting index
      const index = tracksQueue.findIndex((t) => t.id === track.id);
      if (index === -1) {
        return;
      }
      queueIndex.value = index;

      // Save the queue and its context
      queueSource.value = trackSource;
      queue.value = tracksQueue;

      // Load the track
      loadAudio();
    };

    const loadAudio = () => {
      // Load the track
      audio.src = Capacitor.convertFileSrc(currentTrack.value?.path ?? '');
      audio.load();

      // Set current time
      audio.currentTime = elapsedTime.value / 1000;

      // Listen to audio events
      audio.onplay = () => (isPlaying.value = true);
      audio.onpause = () => (isPlaying.value = false);
      audio.onended = () => (isPlaying.value = false);

      audio.ontimeupdate = () => {
        elapsedTime.value = audio.currentTime * 1000;
      };
    };

    const loadAndPlayTracks = async (
      track: Track,
      tracksQueue: Track[],
      trackSource: QueueSource,
    ) => {
      elapsedTime.value = 0;
      loadTracks(track, tracksQueue, trackSource);
      await play();
    };

    const play = async () => {
      if (!currentTrack.value) return;
      await audio.play();
      isPlaying.value = true;
    };

    const pause = () => {
      audio.pause();
      isPlaying.value = false;
    };

    const toggle = async () => {
      if (isPlaying.value) {
        pause();
      } else {
        await play();
      }
    };

    const prev = async () => {
      if (queueIndex.value > 0) {
        queueIndex.value -= 1;
      } else {
        queueIndex.value = queue.value.length - 1;
      }
      elapsedTime.value = 0;

      loadAudio();
      await play();
    };

    const next = async () => {
      if (queueIndex.value < queue.value.length - 1) {
        queueIndex.value += 1;
      } else {
        queueIndex.value = 0;
      }
      elapsedTime.value = 0;

      loadAudio();
      await play();
    };

    const seekTo = (seconds: number) => {
      audio.currentTime = seconds;
    };

    return {
      queue,
      queueSource,
      currentTrack,
      audio,
      isPlaying,
      elapsedTime,
      loadAudio,
      loadTracks,
      loadAndPlayTracks,
      play,
      pause,
      toggle,
      prev,
      next,
      seekTo,
    };
  },
  {
    persist: {
      storage: localStorage,
      // omit: ['isPlaying'],
    },
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMediaPlayerStore, import.meta.hot));
}

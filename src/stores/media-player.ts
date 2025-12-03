import { defineStore, acceptHMRUpdate } from 'pinia';
import { computed, ref, onMounted } from 'vue';
import type { Track } from 'src/types/tracks';
import { Capacitor } from '@capacitor/core';
import type { QueueSource } from '../types/media-player';

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

    const init = () => {
      if (currentTrack.value) {
        // Load the track
        audio.src = Capacitor.convertFileSrc(currentTrack.value.path);
        audio.load();

        // Set current time
        audio.currentTime = elapsedTime.value;

        // Listen to audio events
        audio.onplay = () => (isPlaying.value = true);
        audio.onpause = () => (isPlaying.value = false);
        audio.onended = () => (isPlaying.value = false);

        audio.ontimeupdate = () => {
          elapsedTime.value = audio.currentTime;
        };
      }
    };

    const loadTracks = (track: Track, tracksQueue: Track[], trackSource: QueueSource) => {
      // Find the starting index
      const index = tracksQueue.findIndex((t) => t.id === track.id);
      if (index === -1) {
        console.error('Selected track not found in the source list.');
        return;
      }
      queueIndex.value = index;

      // Save the queue and its context
      queueSource.value = trackSource;
      queue.value = tracksQueue;

      // Load the track
      audio.src = Capacitor.convertFileSrc(currentTrack.value?.path ?? '');
      audio.load();

      // Listen to audio events
      audio.onplay = () => (isPlaying.value = true);
      audio.onpause = () => (isPlaying.value = false);
      audio.onended = () => (isPlaying.value = false);

      audio.ontimeupdate = () => {
        elapsedTime.value = audio.currentTime;
      };
    };

    const loadAndPlayTracks = async (
      track: Track,
      tracksQueue: Track[],
      trackSource: QueueSource,
    ) => {
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

    const seekTo = (position: number) => {
      audio.currentTime = position;
    };

    return {
      queue,
      queueSource,
      currentTrack,
      audio,
      isPlaying,
      elapsedTime,
      init,
      loadTracks,
      loadAndPlayTracks,
      play,
      pause,
      toggle,
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

import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import type { Track } from 'src/types/tracks';
import { Capacitor } from '@capacitor/core';

export const useMediaPlayerStore = defineStore(
  'media-player',
  () => {
    const audio = new Audio();
    const currentTrack = ref<Track>();
    const isPlaying = ref(false);
    const elapsedTime = ref(0);

    const load = (track: Track) => {
      currentTrack.value = track;
      audio.src = Capacitor.convertFileSrc(track.path);
      audio.load();

      audio.onplay = () => (isPlaying.value = true);
      audio.onpause = () => (isPlaying.value = false);
      audio.onended = () => (isPlaying.value = false);

      audio.ontimeupdate = () => {
        elapsedTime.value = audio.currentTime;
      };
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

    return { audio, currentTrack, isPlaying, elapsedTime, load, play, pause, toggle, seekTo };
  },
  {
    persist: {
      storage: localStorage,
      omit: ['isPlaying'],
    },
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMediaPlayerStore, import.meta.hot));
}

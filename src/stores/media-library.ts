import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import { MediaScanner } from 'capacitor-mediastore';
import type { Track } from 'src/types/tracks';

export const useMediaLibraryStore = defineStore('media-library', () => {
  const tracks = ref<Track[]>([]);

  const scanTracks = async () => {
    const permissions = await MediaScanner.requestPermissions();
    if (!permissions.granted) {
      alert('Permissions not granted. Please enable them in system settings.');
      return;
    }

    const result = await MediaScanner.getAudioFiles();
    tracks.value = result.files;
  };

  return { tracks, scanTracks };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMediaLibraryStore, import.meta.hot));
}

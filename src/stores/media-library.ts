import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import { MediaScanner } from 'capacitor-mediastore';
import { useLocalDB } from 'src/composables/local-db';
import type { LocalTrack } from 'src/types/local';

export const useMediaLibraryStore = defineStore('media-library', () => {
  const tracks = ref<LocalTrack[]>([]);
  const localDb = useLocalDB();

  const scanningTracks = ref(false);
  const scanTracks = async () => {
    scanningTracks.value = true;
    const permissions = await MediaScanner.requestPermissions();
    if (!permissions.granted) {
      alert('Permissions not granted. Please enable them in system settings.');
      return;
    }

    const result = await MediaScanner.getAudioFiles();
    tracks.value = result.files;
    scanningTracks.value = false;
  };

  const scanTrack = async (path: string) => {
    const result = await MediaScanner.readTrackMetadata({
      path: path,
    });

    tracks.value.push(result.file);
    return result.file;
  };

  const syncingTracksToDb = ref(false);
  const syncTracksToDB = async () => {
    // Scan for tracks in the media library
    syncingTracksToDb.value = true;
    for (let i = 0; i < tracks.value.length; i++) {
      const track = tracks.value[i];
      if (track) await localDb.syncTrackData(track);
    }

    syncingTracksToDb.value = false;
  };

  const syncTrackToDB = async (track: LocalTrack) => {
    if (track) await localDb.syncTrackData(track);
  };

  return {
    tracks,
    scanTracks,
    scanningTracks,
    scanTrack,
    syncTracksToDB,
    syncTrackToDB,
    syncingTracksToDb,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMediaLibraryStore, import.meta.hot));
}

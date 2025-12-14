import { CapacitorMusicControls } from 'capacitor-music-controls-plugin';
import { defineStore, acceptHMRUpdate } from 'pinia';
import { useMediaPlayerStore } from './media-player';
import type { MediaControlOptions, MediaControlsEvent } from 'src/types/media-controls';

export const useMediaControlsStore = defineStore('media-controls', () => {
  const mediaPlayerStore = useMediaPlayerStore();

  const defaultMediaControlOptions: MediaControlOptions = {
    hasPrev: true,
    hasNext: true,
    hasClose: false,
    elapsed: 0,
    hasSkipForward: true,
    hasSkipBackward: true,
    skipForwardInterval: 15,
    skipBackwardInterval: 15,
    hasScrubbing: true,
    dismissable: true,
    ticker: '',
    playIcon: 'media_play',
    pauseIcon: 'media_pause',
    prevIcon: 'media_prev',
    nextIcon: 'media_next',
    closeIcon: 'media_close',
    notificationIcon: 'notification',
  };

  const init = async (options: MediaControlOptions) => {
    const mergedOptions = {
      ...defaultMediaControlOptions,
      ...options, // user overrides defaults
    };

    await CapacitorMusicControls.create(mergedOptions)
      .then(() => {
        // Android listener - different from iOS
        document.addEventListener('controlsNotification', (event) => {
          const customEvent = event as MediaControlsEvent;

          // Call async function, handle errors, but do NOT await
          executeAction(customEvent).catch((err) => {
            console.error('Error executing action:', err);
          });
        });
      })
      .catch((e) => {
        console.error('Error while initing music controls', e);
      });
  };

  const updateMetadata = async (options: MediaControlOptions) => {
    const mergedOptions = {
      ...defaultMediaControlOptions,
      ...options, // user overrides defaults
    };

    await CapacitorMusicControls.updateMetadata(mergedOptions)
      .then(() => {
        console.log('Music controls metadata updated');
      })
      .catch((e) => {
        console.error('Error while initing music controls', e);
      });
  };

  const syncPlayState = () => {
    CapacitorMusicControls.updateElapsed({
      elapsed: (mediaPlayerStore.audio.currentTime ?? 0) * 1000,
      isPlaying: mediaPlayerStore.isPlaying,
    });
  };

  const executeAction = async (
    event: MediaControlsEvent | { message: string; position: number },
  ) => {
    switch (event.message) {
      case 'music-controls-next':
        // next
        await mediaPlayerStore.next();
        await updateMetadata({
          track: mediaPlayerStore.currentTrack?.name || 'Unknown',
          artist: mediaPlayerStore.currentTrack?.artist || 'Unknown',
          album: mediaPlayerStore.currentTrack?.album || 'Unknown',
          cover: mediaPlayerStore.currentTrack?.coverPath || '',
          duration: mediaPlayerStore.currentTrack?.duration || 0,
          isPlaying: mediaPlayerStore.isPlaying,
          elapsed: 0,
        });

        break;
      case 'music-controls-previous':
        // previous
        await mediaPlayerStore.prev();
        await updateMetadata({
          track: mediaPlayerStore.currentTrack?.name || 'Unknown',
          artist: mediaPlayerStore.currentTrack?.artist || 'Unknown',
          album: mediaPlayerStore.currentTrack?.album || 'Unknown',
          cover: mediaPlayerStore.currentTrack?.coverPath || '',
          duration: mediaPlayerStore.currentTrack?.duration || 0,
          isPlaying: mediaPlayerStore.isPlaying,
          elapsed: 0,
        });

        break;
      case 'music-controls-pause':
        // paused
        mediaPlayerStore.pause();
        CapacitorMusicControls.updateElapsed({
          elapsed: (mediaPlayerStore.audio.currentTime ?? 0) * 1000,
          isPlaying: false,
        });
        break;
      case 'music-controls-play':
        // resumed
        await mediaPlayerStore.play();
        CapacitorMusicControls.updateElapsed({
          elapsed: (mediaPlayerStore.audio.currentTime ?? 0) * 1000,
          isPlaying: true,
        });
        break;
      case 'music-controls-destroy':
        // controls were destroyed
        break;

      // External controls (iOS only)
      case 'music-controls-toggle-play-pause':
        // Update media player state
        await mediaPlayerStore.toggle();

        // Update media controls state
        CapacitorMusicControls.updateElapsed({
          elapsed: (mediaPlayerStore.audio.currentTime ?? 0) * 1000,
          isPlaying: mediaPlayerStore.isPlaying,
        });
        break;
      case 'music-controls-seek-to':
        mediaPlayerStore.seekTo(event.position / 1000);
        await mediaPlayerStore.play();
        CapacitorMusicControls.updateElapsed({
          elapsed: event.position,
          isPlaying: true,
        });
        // do something
        break;
      case 'music-controls-skip-forward':
        // Do something
        break;
      case 'music-controls-skip-backward':
        // Do something
        break;

      // Headset events (Android only)
      // All media button events are listed below
      case 'music-controls-media-button':
        // Do something
        break;
      case 'music-controls-headset-unplugged':
        // Do something
        break;
      case 'music-controls-headset-plugged':
        // Do something
        break;
      default:
        console.log('Unhandled action', event.message);
        break;
    }
  };

  return { init, updateMetadata, syncPlayState, executeAction };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMediaControlsStore, import.meta.hot));
}

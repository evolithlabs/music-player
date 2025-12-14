<script setup lang="ts">
import { QBtn, QImg, QSpinner, useQuasar } from 'quasar';
import type { VueClassProp, VueStyleProp } from 'quasar';
import { useMediaControlsStore } from 'src/stores/media-controls';
import { useMediaPlayerStore } from 'src/stores/media-player';
import type { Track, TrackDownloadStatus } from 'src/types/tracks';
import { Capacitor } from '@capacitor/core';
import { FileTransfer } from '@capacitor/file-transfer';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { formatMsToMMSS } from 'src/utils/format-ms-to-mmss';
import { computed } from 'vue';
import { backendApi } from 'src/boot/axios';
import type { AxiosError } from 'axios';
import {
  biCloudArrowDownFill,
  biExclamationCircleFill,
  biFloppy2,
  biPauseFill,
  biPlayFill,
  biSpotify,
} from '@quasar/extras/bootstrap-icons';
import { useMediaLibraryStore } from 'src/stores/media-library';

const { track, queue, type, downloadStatus } = defineProps<{
  track: Track;
  queue?: Track[];
  type?: 'local' | 'spotify';
  downloadStatus?: TrackDownloadStatus | undefined;
}>();

const emit = defineEmits<{
  updateDownloadStatus: [id: string, status: TrackDownloadStatus];
}>();

const $q = useQuasar();
const mediaPlayerStore = useMediaPlayerStore();
const mediaControlsStore = useMediaControlsStore();
const mediaLibraryStore = useMediaLibraryStore();

const localTrackIsSpotifyVersion = computed(() => {
  return type == 'local' && track.spotify_id;
});

const spotifyTrackHasLocalVersion = computed(() => {
  return (
    type == 'spotify' &&
    mediaLibraryStore.tracks.some((t) => t.spotify_id && t.spotify_id == track.spotify_id)
  );
});

const spotifyTrackLocalVersion = computed(() => {
  return mediaLibraryStore.tracks.find((t) => t.spotify_id && t.spotify_id == track.spotify_id);
});

const showTrackOptions = () => {
  const options: {
    classes?: VueClassProp;
    style?: VueStyleProp;
    icon?: string;
    img?: string;
    avatar?: string;
    label?: string | number;
    value: string;
  }[] = [
    {
      icon: 'bi-eye-fill',
      label: 'More details',
      value: 'details',
    },
  ];

  if (type == 'spotify' && !spotifyTrackHasLocalVersion.value) {
    if (downloadStatus == 'completed') {
      options.push({
        icon: 'bi-download',
        label: 'Download',
        value: 'download',
      });
    } else {
      options.push({
        icon: 'bi-cloud-arrow-down',
        label: 'Download to the cloud',
        value: 'cloud_download',
      });
    }
  }

  if (type == 'local' || spotifyTrackHasLocalVersion.value) {
    options.push({
      icon: 'bi-trash-fill',
      label: 'Delete track',
      value: 'play',
      classes: 'text-red-400',
    });
  }

  $q.bottomSheet({
    title: `${track.artist} - ${track.name}`,
    grid: false,
    dark: true,
    class: 'bg-black text-white border-t',
    actions: options,
  }).onOk((option) => {
    switch (option.value) {
      case 'download':
        void downloadTrack();
        break;
    }
  });
};

const imageButtonIcon = computed(() => {
  if (type == 'local') {
    if (!mediaPlayerStore.isPlaying || mediaPlayerStore.currentTrack?.id != track.id) {
      return biPlayFill;
    } else {
      return biPauseFill;
    }
  } else if (type == 'spotify' && downloadStatus == 'completed') {
    if (
      !mediaPlayerStore.isPlaying ||
      mediaPlayerStore.currentTrack?.spotify_id != track.spotify_id
    ) {
      return biPlayFill;
    } else {
      return biPauseFill;
    }
  }

  if (downloadStatus == 'failed') {
    return biExclamationCircleFill;
  }

  return biCloudArrowDownFill;
});

const onClick = async () => {
  if (type == 'local') {
    await playPauseTrack();
  } else {
    if (downloadStatus == 'completed') {
      await playPauseTrack();
    } else {
      // queue track for download
      try {
        await backendApi.post<Record<string, TrackDownloadStatus>>('/queue-track', {
          spotify_track_id: track.id,
        });

        $q.notify({
          type: 'info',
          message: 'Initiated Track download on cloud',
          caption: 'You will be able to play/download the track soon!',
          timeout: 3500,
        });
        emit('updateDownloadStatus', track.id, 'queued');
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Oops - Cloud download error',
          caption: (error as AxiosError).message,
        });
      }
    }
  }
};

const playPauseTrack = async () => {
  if (
    mediaPlayerStore.currentTrack?.id == track.id ||
    (mediaPlayerStore.currentTrack?.spotify_id &&
      mediaPlayerStore.currentTrack.spotify_id == track.spotify_id)
  ) {
    // toggle play/pause
    await mediaControlsStore.executeAction({
      message: 'music-controls-toggle-play-pause',
      position: 0,
    });
  } else {
    if (type == 'local') {
      await mediaPlayerStore.loadAndPlayTracks(track, queue ?? [track], {
        type: 'misc',
      });
    } else {
      const trackToPlay: Track = spotifyTrackLocalVersion.value
        ? {
            ...spotifyTrackLocalVersion.value,
            artist: spotifyTrackLocalVersion.value?.artist ?? '',
            album: spotifyTrackLocalVersion.value?.album ?? '',
          }
        : track;

      if (trackToPlay) {
        await mediaPlayerStore.loadAndPlayTracks(trackToPlay, [trackToPlay], {
          type: 'misc',
        });
      }
    }

    await mediaControlsStore.updateMetadata({
      track: track.name ?? 'Unknown',
      artist: track.artist ?? 'Unknown',
      album: track.album ?? 'Unknown',
      cover: track.coverPath ?? '/images/background-cover.jpg',
      duration: track.duration ?? 0,
      isPlaying: true,
      elapsed: 0,
    });
  }
};

const downloadTrack = async () => {
  try {
    const documentsDir = await Filesystem.getUri({
      directory: Directory.ExternalStorage,
      path: 'Music',
    });

    const basePath = documentsDir.uri.replace('file://', '');
    const fileName = `${track.artist} - ${track.name}.mp3`;
    const fullPath = `${basePath}/${fileName}`;

    const notif = $q.notify({
      group: false, // required to be updatable
      timeout: 0, // we want to be in control when it gets dismissed
      spinner: true,
      message: 'Downloading track...',
      caption: '0%',
      type: 'info',
    });
    const progressListener = await FileTransfer.addListener('progress', (progress) => {
      const percentageCompleted = Math.floor((progress.bytes / progress.contentLength) * 100);
      notif({
        caption: `${percentageCompleted}%`,
      });
    });

    await FileTransfer.downloadFile({
      url: `${backendApi.defaults.baseURL}play-track/${track.id}?download=1`,
      path: fullPath,
      progress: true,
    });

    notif({
      icon: 'bi-check',
      type: 'positive',
      message: `Track downloaded`,
      caption: `${track.artist} - ${track.name}`,
      spinner: false,
      timeout: 3500,
    });

    await progressListener.remove();
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Oops - Track download error',
      caption: (error as Error).message,
    });
  }
};
</script>

<template>
  <div
    class="flex flex-nowrap items-center grow text-white rounded-md"
    :class="{
      'bg-glass !rounded-md':
        mediaPlayerStore.currentTrack?.id == track.id ||
        (mediaPlayerStore.currentTrack?.spotify_id &&
          mediaPlayerStore.currentTrack.spotify_id == track.spotify_id),
    }"
    @click="onClick"
  >
    <div class="mr-3 relative rounded-md">
      <QImg
        :src="
          track.coverPath
            ? Capacitor.convertFileSrc(track.coverPath)
            : '/images/background-cover.jpg'
        "
        width="48px"
        position="cover"
        ratio="1"
        class="rounded-md"
      />
      <div
        v-if="downloadStatus == 'queued' || downloadStatus == 'downloading'"
        class="text-xl absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center"
      >
        <QSpinner color="white" size="md" />
      </div>
      <QBtn
        v-else
        :icon="imageButtonIcon"
        flat
        class="text-xs absolute top-0 left-0 right-0 bottom-0 [&_.q-icon]:stroke-[0.5] [&_.q-icon]:stroke-zinc-700 bg-black/20 opacity-80"
        :class="{ 'text-red-400': downloadStatus == 'failed' }"
      />
      <QBtn
        v-if="localTrackIsSpotifyVersion"
        :icon="biSpotify"
        class="!text-[0.4rem] text-green-500 absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 p-0 m-0"
      ></QBtn>
      <QBtn
        v-if="spotifyTrackHasLocalVersion"
        :icon="biFloppy2"
        class="!text-[0.4rem] text-white absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 p-0 m-0"
      ></QBtn>
    </div>
    <div class="flex flex-col mr-4">
      <h6 class="font-bold line-clamp-1 text-sm relative">
        {{ track.name }}
      </h6>
      <div class="flex items-center gap-1">
        <span class="text-xs line-clamp-1">{{ track.artist }}</span>
        <span>•</span>
        <span class="text-xs">{{ formatMsToMMSS(track.duration) }}</span>
      </div>
    </div>
    <div class="flex items-baseline ml-auto shrink-0 relative">
      <QBtn
        icon="bi-three-dots-vertical"
        round
        color="white"
        flat
        class="text-xs"
        @click.stop="showTrackOptions"
      />
    </div>
  </div>
</template>

<style scoped>
.image-button .q-btn__content .q-icon {
  background-color: red !important;
}
</style>

<script setup lang="ts">
import { QBtn, QImg, QSpinner, useQuasar } from 'quasar';
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
import { biCloudArrowDownFill, biPauseFill, biPlayFill } from '@quasar/extras/bootstrap-icons';

const { track, queue, type, downloadStatus } = defineProps<{
  track: Track;
  queue?: Track[];
  type?: 'local' | 'spotify';
  downloadStatus?: TrackDownloadStatus;
}>();

const emit = defineEmits<{
  updateDownloadStatus: [id: string, status: TrackDownloadStatus];
}>();

const mediaPlayerStore = useMediaPlayerStore();
const mediaControlsStore = useMediaControlsStore();

const $q = useQuasar();
const showTrackOptions = () => {
  $q.bottomSheet({
    title: `${track.artist} - ${track.title}`,
    grid: false,
    dark: true,
    class: 'bg-black text-white border-t',
    actions: [
      {
        icon: 'bi-eye-fill',
        label: 'More details',
        value: 'details',
      },
      {
        icon: 'bi-person-fill',
        label: 'Go to artist',
        value: 'artist',
      },
      {
        icon: 'bi-vinyl-fill',
        label: 'Go to album',
        value: 'album',
      },
      {
        icon: 'bi-plus-square-fill',
        label: 'Add to library',
        value: 'library',
      },
      {
        icon: downloadStatus == 'completed' ? 'bi-download' : 'bi-cloud-arrow-down',
        label: downloadStatus == 'completed' ? 'Download now' : 'Download to cloud',
        value: downloadStatus == 'completed' ? 'download' : 'cloud_download',
      },
      {
        icon: 'bi-trash-fill',
        label: 'Delete track',
        value: 'play',
        classes: 'text-red-400',
      },
    ],
  }).onOk((option) => {
    switch (option.value) {
      case 'download':
        void downloadTrack();
        break;
    }
  });
};

const imageButtonIcon = computed(() => {
  if (type == 'local' || downloadStatus == 'completed') {
    if (!mediaPlayerStore.isPlaying || mediaPlayerStore.currentTrack?.id != track.id) {
      return biPlayFill;
    } else {
      return biPauseFill;
    }
  }
  return biCloudArrowDownFill;
});

const onImageButtonClick = async () => {
  if (type == 'local') {
    await playPauseTrack();
  } else {
    if (downloadStatus == 'completed') {
      await playPauseTrack();
    } else {
      // queue track for download
      console.log('queuing for download');
      try {
        await backendApi.post<Record<string, TrackDownloadStatus>>('/queue-track', {
          spotify_track_id: track.id,
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
  if (mediaPlayerStore.currentTrack?.id == track.id) {
    // toggle play/pause
    await mediaControlsStore.executeAction({
      message: 'music-controls-toggle-play-pause',
      position: 0,
    });
  } else {
    await mediaPlayerStore.loadAndPlayTracks(track, queue ?? [track], {
      type: 'misc',
    });

    await mediaControlsStore.updateMetadata({
      track: track.title,
      artist: track.artist,
      album: track.album,
      cover: track.coverPath ?? '/images/background-cover.jpg',
      duration: track.duration,
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
    const fileName = `${track.artist} - ${track.title}.mp3`;
    const fullPath = `${basePath}/${fileName}`;

    // const progressListener = await FileTransfer.addListener('progress', (progress) => {
    //   $q.notify({
    //     type: 'info',
    //     message: 'Download progress',
    //     caption: `Downloaded ${progress.bytes} of ${progress.contentLength}`,
    //   });
    // });

    $q.notify({
      type: 'info',
      message: `Track ${track.title} is being downloaded`,
      closeBtn: true,
    });

    const response = await FileTransfer.downloadFile({
      url: `${backendApi.defaults.baseURL}play-track/${track.id}?download=1`,
      path: fullPath,
      progress: true,
    });

    $q.notify({
      type: 'positive',
      message: `Track ${track.title} downloaded`,
      caption: `Saved at ${response.path}`,
    });

    // await progressListener.remove();
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
      'bg-glass !rounded-md': mediaPlayerStore.currentTrack?.id == track.id,
    }"
  >
    <div class="mr-3 relative rounded-md overflow-hidden">
      <QImg
        :src="
          track.coverPath
            ? Capacitor.convertFileSrc(track.coverPath)
            : '/images/background-cover.jpg'
        "
        width="48px"
        position="cover"
        ratio="1"
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
        @click="onImageButtonClick"
      />
    </div>
    <div class="flex flex-col mr-4">
      <h6 class="font-bold line-clamp-1 text-sm">
        {{ track.title }}
      </h6>
      <div class="flex items-center gap-1">
        <span class="text-xs line-clamp-1">{{ track.artist }}</span>
        <span>•</span>
        <span class="text-xs">{{ formatMsToMMSS(track.duration) }}</span>
      </div>
    </div>
    <div class="flex items-baseline ml-auto shrink-0">
      <QBtn
        icon="bi-three-dots-vertical"
        round
        color="white"
        flat
        class="text-xs"
        @click="showTrackOptions"
      />
    </div>
  </div>
</template>

<style scoped>
.image-button .q-btn__content .q-icon {
  background-color: red !important;
}
</style>

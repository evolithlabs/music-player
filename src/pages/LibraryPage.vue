<template>
  <QPage class="text-white pb-footer pt-4">
    <div class="flex flex-col gap-2 mb-2">
      <h1 class="text-3xl flex items-center gap-2 font-bold mx-4">
        <QIcon name="bi-music-note-beamed" class="text-4xl" />
        Your Library

        <QBtn dense round flat class="ml-auto p-0 m-0" @click="rescanTracks">
          <QCircularProgress
            show-value
            :value="scanProgress"
            :thickness="scanProgress ? 0.1 : 0"
            animation-speed="1000"
            track-color="grey-9"
            class="text-4xl !p-0 !m-0"
          >
            <QIcon
              name="bi-arrow-clockwise"
              size="sm"
              class="!p-0 !m-0"
              :class="{ 'animate-spin': scanProgress }"
            />
          </QCircularProgress>
        </QBtn>
      </h1>
    </div>

    <LibrarySearchAndFilter
      v-model:query="searchQuery"
      v-model:tab="tab"
      :tracks="tracks"
      type="local"
    ></LibrarySearchAndFilter>
  </QPage>
</template>

<script setup lang="ts">
import { QBtn, QCircularProgress, QIcon, QPage, useQuasar } from 'quasar';
import LibrarySearchAndFilter from 'src/components/LibrarySearchAndFilter.vue';
import { useMediaLibraryStore } from 'src/stores/media-library';
import type { LibraryTab } from 'src/types/library';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

const $q = useQuasar();
const mediaLibraryStore = useMediaLibraryStore();

const searchQuery = ref<string>('');
const tab = ref<LibraryTab>('tracks');

const tracks = computed(() => {
  return mediaLibraryStore.tracks;
});

onMounted(() => {
  if (mediaLibraryStore.scanningTracks) {
    scanProgress.value = 25;
  } else if (mediaLibraryStore.syncingTracksToDb) {
    scanProgress.value = 66;
  }
});

const scanProgress = ref(0);
const rescanTracks = async () => {
  $q.notify({
    message: 'Scanning local tracks',
  });

  scanProgress.value = 0;

  await nextTick();
  scanProgress.value = 25;

  await mediaLibraryStore.scanTracks();
  scanProgress.value = 66;

  await mediaLibraryStore.syncTracksToDB();
  scanProgress.value = 100;

  setTimeout(() => {
    scanProgress.value = 0;
  }, 1000);
};

watch(
  () => mediaLibraryStore.scanningTracks,
  (newValue) => {
    if (!newValue) {
      scanProgress.value = 66;
    }
  },
);

watch(
  () => mediaLibraryStore.syncingTracksToDb,
  (newValue) => {
    if (!newValue) {
      scanProgress.value = 100;
      setTimeout(() => {
        scanProgress.value = 0;
      }, 1000);
    }
  },
);
</script>

<style scoped></style>

<template>
  <QPage class="text-white pb-footer pt-4">
    <div class="flex flex-col gap-2 mb-2">
      <h1 class="text-3xl flex items-center gap-2 font-bold mx-4">
        <QIcon name="bi-music-note-beamed" class="text-4xl" />
        Your Library

        <QBtn
          dense
          round
          flat
          icon="bi-arrow-clockwise"
          class="ml-auto"
          :class="{ 'animate-spin': mediaLibraryStore.scanningTracks }"
          @click="mediaLibraryStore.scanTracks()"
        >
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
import { QBtn, QIcon, QPage } from 'quasar';
import LibrarySearchAndFilter from 'src/components/LibrarySearchAndFilter.vue';
import { useMediaLibraryStore } from 'src/stores/media-library';
import type { LibraryTab } from 'src/types/library';
import { computed, ref } from 'vue';

const mediaLibraryStore = useMediaLibraryStore();

const searchQuery = ref<string>('');
const tab = ref<LibraryTab>('tracks');

const tracks = computed(() => {
  return mediaLibraryStore.tracks;
});
</script>

<style scoped></style>

<template>
  <div class="column">
    <QList bordered>
      <QItem class="q-p-none q-pa-sm">
        <TrackItem
          v-for="track in mediaLibraryStore.tracks"
          :key="track.id"
          v-bind="track"
          class="full-width"
        ></TrackItem>
      </QItem>
    </QList>
  </div>
</template>

<script setup lang="ts">
import { QItem, QList } from 'quasar';
import TrackItem from 'src/components/item/TrackItem.vue';
import { useMediaLibraryStore } from 'src/stores/media-library';

const mediaLibraryStore = useMediaLibraryStore();
</script>

<style scoped></style>

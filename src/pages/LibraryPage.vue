<template>
  <QPage class="flex flex-col flex-nowrap text-white pb-footer pt-4">
    <div class="flex flex-col gap-2">
      <h1 class="text-3xl flex items-center gap-2 font-bold mx-4">
        <QIcon name="bi-music-note-beamed" class="text-4xl" />
        Your Library

        <QBtn dense round flat icon="bi-arrow-clockwise" class="ml-auto"> </QBtn>
      </h1>
      <QInput
        model-value=""
        rounded
        dense
        borderless
        clearable
        :debounce="500"
        placeholder="Search tracks, playlists, artists..."
        :input-style="{
          color: 'white',
        }"
        class="grow bg-glass !bg-zinc-800 search-input mx-4 border px-4"
      />
    </div>

    <QTabs v-model="tab" dense :narrow-indicator="false" class="text-white bg-zinc-800 mt-1">
      <QTab name="tracks" label="Tracks" :ripple="false" />
      <QTab name="playlists" label="Playlists" :ripple="false" />
      <QTab name="artists" label="Artists" :ripple="false" />
      <QTab name="albums" label="Albums" :ripple="false" />
    </QTabs>

    <QTabPanels v-model="tab" animated swipeable class="grow bg-transparent">
      <QTabPanel name="tracks" class="p-0 m-0">
        <QVirtualScroll :items="mediaLibraryStore.tracks ?? tracks" v-slot="{ item, index }">
          <QItem :key="index" dense class="pt-2 px-2">
            <TrackItem
              v-if="mediaLibraryStore.tracks"
              :track="item"
              :queue="mediaLibraryStore.tracks"
            ></TrackItem>
            <TrackItem
              v-else
              :track="{
                id: 22,
                title: 'Washed Up',
                album: 'Fear',
                artist: 'NF',
                coverPath: '',
                path: '',
                duration: 500,
                year: 2001,
              }"
            ></TrackItem>
          </QItem>
        </QVirtualScroll>
      </QTabPanel>

      <QTabPanel name="playlists">playlists</QTabPanel>
    </QTabPanels>
  </QPage>
</template>

<script setup lang="ts">
import {
  QBtn,
  QIcon,
  QInput,
  QItem,
  QPage,
  QTab,
  QTabPanel,
  QTabPanels,
  QTabs,
  QVirtualScroll,
} from 'quasar';
import TrackItem from 'src/components/item/TrackItem.vue';
import { useMediaLibraryStore } from 'src/stores/media-library';
import { ref } from 'vue';

const mediaLibraryStore = useMediaLibraryStore();

const tracks = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 1,
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
];

const tab = ref<'tracks' | 'albums' | 'artists' | 'playlists'>('tracks');
</script>

<style scoped></style>

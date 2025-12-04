<template>
  <QPage class="flex flex-col flex-nowrap text-white pt-header h-dvh">
    <div>
      <h1 class="text-3xl flex items-center gap-2 font-bold px-2">
        <QIcon name="album" class="text-4xl" />
        Your Library

        <QBtn dense round flat icon="arrow_circle_down" class="ml-auto text-lg">
          <QBadge color="black" text-color="white" rounded floating transparent> 4 </QBadge>
        </QBtn>
      </h1>
      <QTabs v-model="tab" dense :narrow-indicator="false" class="text-white bg-zinc-800 mt-1">
        <QTab name="tracks" label="Tracks" :ripple="false" />
        <QTab name="playlists" label="Playlists" :ripple="false" />
        <QTab name="artists" label="Artists" :ripple="false" />
        <QTab name="albums" label="Albums" :ripple="false" />
      </QTabs>
    </div>

    <QTabPanels v-model="tab" animated swipeable class="h-full bg-transparent mb-footer">
      <QTabPanel name="tracks" class="p-0 m-0">
        <QVirtualScroll :items="mediaLibraryStore.tracks ?? tracks" v-slot="{ index }">
          <QItem :key="index" dense class="p-2 border-b">
            <TrackItem
              title="Washed Up"
              album="Fear"
              artist="NF"
              cover-path=""
              path=""
              :duration="500"
              :id="22"
              :year="2001"
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
  QBadge,
  QBtn,
  QIcon,
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

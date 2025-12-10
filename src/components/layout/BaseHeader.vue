<script setup lang="ts">
import {
  QBtn,
  QCard,
  QDialog,
  QHeader,
  QInput,
  QItem,
  QTab,
  QTabPanel,
  QTabPanels,
  QTabs,
  QVirtualScroll,
} from 'quasar';
import { ref } from 'vue';
import TrackItem from '../item/TrackItem.vue';

const searchDialog = ref(false);
const searchQuery = ref();

const tab = ref<'spotify' | 'library'>('spotify');
const tracks = ref([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 1,
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
]);
// const filters = reactive({
//   tracks: false,
//   albums: false,
//   artists: false,
// });
</script>

<template>
  <QHeader
    class="bg-transparent flex justify-between items-center p-2 fixed top-0 left-0 right-0 h-16 z-50"
  >
    <div class="bg-glass p-1">
      <QBtn icon="bi-list" round flat ripple class="text-xs"></QBtn>
      <QBtn icon="bi-search" round flat ripple class="text-xs" @click="searchDialog = true" />
    </div>
    <div class="bg-glass p-1">
      <QBtn icon="bi-bell" round flat ripple class="text-xs" />
    </div>

    <QDialog
      v-model="searchDialog"
      position="top"
      transition-show="jump-down"
      transition-hide="fade"
      full-height
      full-width
      backdrop-filter="blur(4px)"
      class="z-[5000]"
    >
      <QCard
        class="flex flex-col bg-glass flex-nowrap"
        style="height: calc(100vh - 8rem) !important"
      >
        <div class="sticky top-0 z-30 pt-4 px-4">
          <div class="flex items-center gap-2">
            <QBtn icon="bi-arrow-left" color="white" dense flat v-close-popup />

            <QInput
              v-model="searchQuery"
              rounded
              outlined
              dense
              clearable
              :debounce="500"
              placeholder="Search tracks, playlists, artists..."
              :input-style="{
                color: 'white',
              }"
              class="grow bg-glass !bg-zinc-800 search-input"
            />
            <QBtn icon="bi-three-dots-vertical" color="white" dense flat />
          </div>
          <div class="mt-4">
            <QTabs v-model="tab" dense :narrow-indicator="true" class="text-white">
              <QTab name="spotify" label="Spotify" />
              <QTab name="library" label="Library" />
            </QTabs>
          </div>
        </div>
        <div class="grow flex flex-col flex-wrap bg-zinc-800">
          <QTabPanels v-model="tab" animated swipeable class="grow bg-transparent">
            <QTabPanel name="spotify" class="p-0 m-0">
              <div class="grow">
                <QVirtualScroll :items="tracks" v-slot="{ index }">
                  <QItem :key="index" dense class="p-2 border-b">
                    <TrackItem
                      :track="{
                        id: '22',
                        name: 'Washed Up',
                        album: 'Fear',
                        artist: 'NF',
                        coverPath: '',
                        path: '',
                        duration: 500000,
                        year: 2001,
                      }"
                    ></TrackItem>
                  </QItem>
                </QVirtualScroll>
              </div>
            </QTabPanel>
            <QTabPanel name="library" class="p-2">
              <h5>Your Library</h5>
            </QTabPanel>
          </QTabPanels>
        </div>
        <!-- <div class="q-mt-xs">
          <QScrollArea :visible="false" style="height: 40px">
            <div class="row no-wrap">
              <QChip v-model:selected="filters.tracks" color="grey-6" text-color="black" icon="add">
                Tracks
              </QChip>
              <QChip v-model:selected="filters.albums" color="grey-6" text-color="black" icon="add">
                Albums
              </QChip>
              <QChip
                v-model:selected="filters.artists"
                color="grey-6"
                text-color="black"
                icon="add"
              >
                Artists
              </QChip>
            </div>
          </QScrollArea>
        </div> -->
      </QCard>
    </QDialog>
  </QHeader>
</template>

<style scoped lang="scss">
.q-chip--selected {
  color: white !important;
  background-color: $grey-10 !important;
}

.q-chip--selected > .q-icon {
  color: white !important;
}
</style>

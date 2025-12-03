<script setup lang="ts">
import { QBtn, QCard, QDialog, QHeader, QInput, QTab, QTabPanel, QTabPanels, QTabs } from 'quasar';
import { ref } from 'vue';

const searchDialog = ref(false);
const searchQuery = ref();

const tab = ref<'spotify' | 'library'>('spotify');
// const filters = reactive({
//   tracks: false,
//   albums: false,
//   artists: false,
// });
</script>

<template>
  <QHeader
    class="bg-transparent row justify-between items-center q-pa-none q-ma-none q-gutter-none q-ma-xs"
  >
    <div class="bg-glass q-pa-xs">
      <QBtn icon="menu" round flat ripple class="text-caption"></QBtn>
      <QBtn icon="search" round flat ripple class="text-caption" @click="searchDialog = true" />
    </div>
    <div class="bg-glass q-pa-xs">
      <QBtn icon="notifications" round flat ripple class="text-caption" />
    </div>

    <QDialog
      v-model="searchDialog"
      position="top"
      transition-show="slide-down"
      transition-hide="slide-up"
      seamless
      full-height
      full-width
    >
      <QCard class="column q-pt-sm bg-blue-grey-5 dialog-container">
        <div class="row q-gutter-x-sm items-center q-px-sm">
          <QBtn icon="arrow_back" color="white" dense flat v-close-popup />

          <QInput
            v-model="searchQuery"
            rounded
            outlined
            dense
            clearable
            :debounce="500"
            placeholder="Search tracks, playlists, artists..."
            color="grey-10"
            :input-style="{
              color: 'white',
            }"
            class="col-grow bg-glass search-input"
          />
          <QBtn icon="more_vert" color="white" dense flat v-close-popup />
        </div>
        <div class="column col-grow q-mt-md">
          <QTabs
            v-model="tab"
            dense
            :narrow-indicator="false"
            active-color="grey-10"
            class="text-grey-10"
          >
            <QTab name="spotify" label="Spotify" />
            <QTab name="library" label="Library" />
          </QTabs>

          <QTabPanels v-model="tab" animated swipeable class="col-grow bg-transparent">
            <QTabPanel name="spotify" class="column fit">
              <div>
                <h5>Spotify</h5>
                <h5>Spotify</h5>
                <h5>Spotify</h5>
              </div>
            </QTabPanel>
            <QTabPanel name="library" class="q-gutter-none">
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

.dialog-container {
  height: calc(100vh - 144px) !important;
}
</style>

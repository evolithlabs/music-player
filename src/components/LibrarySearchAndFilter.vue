<script setup lang="ts">
import {
  QIcon,
  QInput,
  QItem,
  QSpinnerBars,
  QTab,
  QTabPanel,
  QTabPanels,
  QTabs,
  QVirtualScroll,
} from 'quasar';
import TrackItem from 'src/components/item/TrackItem.vue';
import type { LibraryTab } from 'src/types/library';
import type { Track } from 'src/types/tracks';

const { tracks, loading } = defineProps<{
  tracks: Track[];
  loading?: boolean | undefined;
}>();

const queryModel = defineModel<string>('query', {
  default: '',
});

const tabModel = defineModel<LibraryTab>('tab', {
  default: 'tracks',
});
</script>

<template>
  <div>
    <QInput
      v-model="queryModel"
      rounded
      dense
      borderless
      :debounce="300"
      placeholder="Search tracks, playlists, artists..."
      :input-style="{
        color: 'white',
      }"
      class="grow bg-glass !bg-zinc-800 search-input mx-4 border px-4"
    >
      <template v-if="queryModel" v-slot:append>
        <QIcon name="bi-x-circle" @click.stop.prevent="queryModel = ''" class="text-white/80" />
      </template>
    </QInput>

    <QTabs v-model="tabModel" dense :narrow-indicator="false" class="text-white bg-zinc-800 mt-1">
      <QTab name="tracks" label="Tracks" :ripple="false" />
      <QTab name="playlists" label="Playlists" :ripple="false" />
      <QTab name="artists" label="Artists" :ripple="false" />
      <QTab name="albums" label="Albums" :ripple="false" />
    </QTabs>

    <QTabPanels v-model="tabModel" animated swipeable class="grow bg-transparent">
      <QTabPanel name="tracks" class="p-0 m-0 grow">
        <QVirtualScroll
          v-if="tracks.length"
          :items="tracks"
          :virtual-scroll-item-size="56"
          v-slot="{ item, index }"
        >
          <QItem :key="index" dense class="pt-2 px-2">
            <TrackItem v-if="tracks" :track="item" :queue="tracks"></TrackItem>
            <TrackItem
              v-else
              :track="{
                id: '22',
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
        <div v-else-if="loading" class="text-center mt-16">
          <QSpinnerBars color="white" class="mx-auto text-5xl" />
        </div>
        <div v-else class="text-center mt-16 text-xl">No tracks found</div>
      </QTabPanel>

      <QTabPanel name="playlists">playlists</QTabPanel>
    </QTabPanels>
  </div>
</template>

<style scoped></style>

<script setup lang="ts">
import { QIcon, QInput, QSpinnerBars, QTab, QTabPanel, QTabPanels, QTabs } from 'quasar';
import TrackItem from 'src/components/item/TrackItem.vue';
import type { LibraryTab } from 'src/types/library';
import AlbumItem from './item/AlbumItem.vue';
import ArtistItem from './item/ArtistItem.vue';
import { useTemplateRef } from 'vue';
import { useScroll } from '@vueuse/core';
import type { Album, Artist, Track } from 'src/types/data';

const { tracks, loading } = defineProps<{
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  loading?: boolean | undefined;
  type: 'local' | 'spotify';
}>();

const emit = defineEmits<{
  loadTracks: [];
}>();

const queryModel = defineModel<string>('query', {
  default: '',
});

const tabModel = defineModel<LibraryTab>('tab', {
  default: 'tracks',
});

const tracksContainerEl = useTemplateRef('tracksContainer');
const { arrivedState: tracksContainerArrivedState } = useScroll(tracksContainerEl, {
  offset: { bottom: 25 },
  onScroll: () => {
    if (tracksContainerArrivedState.bottom) {
      emit('loadTracks');
    }
  },
});
</script>

<template>
  <div class="h-full flex flex-col">
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
      class="bg-glass !bg-zinc-800 search-input mx-4 border px-4"
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

    <QTabPanels
      v-model="tabModel"
      animated
      swipeable
      keep-alive
      class="grow bg-transparent h-[25rem]"
    >
      <QTabPanel name="tracks" class="p-2 m-0 h-full">
        <div ref="tracksContainer" class="h-full overflow-scroll">
          <template v-for="track in tracks">
            <slot name="track" :track="track" :queue="tracks" :type="type">
              <TrackItem
                :key="track.id"
                :track="track"
                :queue="tracks"
                :type="type"
                class="p-1.5"
              ></TrackItem>
            </slot>
          </template>
        </div>
        <div v-if="!tracks.length && loading" class="text-center mt-16">
          <QSpinnerBars color="white" class="mx-auto text-5xl" />
        </div>
        <div v-else-if="!tracks.length" class="text-center mt-16 text-xl">No tracks found</div>
      </QTabPanel>

      <QTabPanel name="artists" class="p-2 m-0 h-full">
        <div ref="artistsContainer">
          <template v-for="artist in artists">
            <slot name="artist" :artist="artist" :type="type">
              <ArtistItem :key="artist.id" :artist="artist" :type="type" class="p-1.5"></ArtistItem>
            </slot>
          </template>
        </div>
        <div v-if="!artists.length && loading" class="text-center mt-16">
          <QSpinnerBars color="white" class="mx-auto text-5xl" />
        </div>
        <div v-else-if="!artists.length" class="text-center mt-16 text-xl">No artists found</div>
      </QTabPanel>

      <QTabPanel name="albums" class="p-2 m-0 h-full">
        <div ref="albumsContainer">
          <slot />
          <template v-for="album in albums">
            <slot name="album" :album="album" :type="type">
              <AlbumItem :key="album.id" :album="album" :type="type" class="p-1.5"></AlbumItem>
            </slot>
          </template>
        </div>
        <div v-if="albums.length && loading" class="text-center mt-16">
          <QSpinnerBars color="white" class="mx-auto text-5xl" />
        </div>
        <div v-else-if="!albums.length" class="text-center mt-16 text-xl">No albums found</div>
      </QTabPanel>
    </QTabPanels>
  </div>
</template>

<style scoped></style>

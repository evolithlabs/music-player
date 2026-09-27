<script setup lang="ts">
import { QBtn, QIcon, QInput, QSpinnerBars, QTab, QTabPanel, QTabPanels, QTabs } from 'quasar';
import TrackItem from 'src/components/item/TrackItem.vue';
import type { LibraryTab } from 'src/types/library';
import AlbumItem from './item/AlbumItem.vue';
import ArtistItem from './item/ArtistItem.vue';
import { useTemplateRef } from 'vue';
import { useScroll, useWindowSize } from '@vueuse/core';
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
  loadArtists: [];
  loadAlbums: [];
}>();

const queryModel = defineModel<string>('query', {
  default: '',
});

const tabModel = defineModel<LibraryTab>('tab', {
  default: 'tracks',
});

const tracksContainerEl = useTemplateRef('tracksContainer');
const { y: tracksContainerY, arrivedState: tracksContainerArrivedState } = useScroll(
  tracksContainerEl,
  {
    offset: { bottom: 25 },
    onScroll: () => {
      if (tracksContainerArrivedState.bottom) {
        emit('loadTracks');
      }
    },
  },
);

const artistsContainerEl = useTemplateRef('artistsContainer');
const { y: artistsContainerY, arrivedState: artistsContainerArrivedState } = useScroll(
  artistsContainerEl,
  {
    offset: { bottom: 25 },
    onScroll: () => {
      if (artistsContainerArrivedState.bottom) {
        emit('loadArtists');
      }
    },
  },
);

const albumsContainerEl = useTemplateRef('albumsContainer');
const { y: albumsContainerY, arrivedState: albumsContainerArrivedState } = useScroll(
  albumsContainerEl,
  {
    offset: { bottom: 25 },
    onScroll: () => {
      if (albumsContainerArrivedState.bottom) {
        emit('loadAlbums');
      }
    },
  },
);

const { height } = useWindowSize();
const showScrollToTop = () => {
  switch (tabModel.value) {
    case 'tracks':
      return height.value / 2 - tracksContainerY.value < 0;
    case 'artists':
      return height.value / 2 - artistsContainerY.value < 0;
    case 'albums':
      return height.value / 2 - albumsContainerY.value < 0;
  }

  return false;
};

const scrollToTop = () => {
  switch (tabModel.value) {
    case 'tracks':
      return tracksContainerEl.value?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    case 'artists':
      return artistsContainerEl.value?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    case 'albums':
      return albumsContainerEl.value?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
  }
};
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
      class="bg-glass search-input mx-4 border px-4"
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
      class="grow bg-transparent h-[33rem]"
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

      <QTabPanel name="playlists" class="p-2 m-0 h-full">
        Nothing here yet
        <!-- <div ref="playlistsContainer">
          <template v-for="artist in artists">
            <slot name="artist" :artist="artist" :type="type">
              <ArtistItem :key="artist.id" :artist="artist" :type="type" class="p-1.5"></ArtistItem>
            </slot>
          </template>
        </div>
        <div v-if="!artists.length && loading" class="text-center mt-16">
          <QSpinnerBars color="white" class="mx-auto text-5xl" />
        </div>
        <div v-else-if="!artists.length" class="text-center mt-16 text-xl">No artists found</div> -->
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

    <QBtn
      v-if="tabModel == 'playlists'"
      label="Create"
      icon="bi-plus"
      rounded
      class="fixed bottom-1 left-2 mb-footer bg-glass"
    />

    <QBtn
      v-if="showScrollToTop()"
      icon="bi-caret-up"
      round
      class="fixed bottom-1 right-2 mb-footer bg-glass"
      @click="scrollToTop()"
    />
  </div>
</template>

<style scoped></style>

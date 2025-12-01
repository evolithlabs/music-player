<template>
  <div class="column">
    <QBtn @click="toggleToSpotify">Open</QBtn>
    <pre class="full-width">
      Access token: {{ spotifyAuthStore.accessToken }} 
      Refresh token: {{ spotifyAuthStore.refreshToken }} 
      Expires at: {{ spotifyAuthStore.expiresAt }}
    </pre>

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

    <QDialog v-model="spotifyDialog" position="bottom">
      <SpotifyOauth />
    </QDialog>
  </div>
</template>

<script setup lang="ts">
import { QBtn, QDialog, QItem, QList } from 'quasar';
import TrackItem from 'src/components/item/TrackItem.vue';
import SpotifyOauth from 'src/components/SpotifyOauth.vue';
import { useMediaLibraryStore } from 'src/stores/media-library';
import { useSpotifyAuthStore } from 'src/stores/spotify-auth';
import { ref } from 'vue';

const spotifyAuthStore = useSpotifyAuthStore();
const mediaLibraryStore = useMediaLibraryStore();

const spotifyDialog = ref(false);
const toggleToSpotify = () => {
  spotifyDialog.value = !spotifyDialog.value;
};
</script>

<style scoped></style>

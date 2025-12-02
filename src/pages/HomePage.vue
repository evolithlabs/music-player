<template>
  <q-page class="row items-center justify-evenly">
    <QBtn @click="toggleToSpotify">Open</QBtn>
    <pre class="full-width">
      Access token: {{ spotifyAuthStore.accessToken }} 
      Refresh token: {{ spotifyAuthStore.refreshToken }} 
      Expires at: {{ spotifyAuthStore.expiresAt }}
    </pre>

    <h3>Groovio Music</h3>

    <QDialog v-model="spotifyDialog" position="bottom">
      <SpotifyOauth />
    </QDialog>
  </q-page>
</template>

<script setup lang="ts">
import { QBtn, QDialog } from 'quasar';
import SpotifyOauth from 'src/components/SpotifyOauth.vue';
import { useSpotifyAuthStore } from 'src/stores/spotify-auth';
import { ref } from 'vue';

const spotifyAuthStore = useSpotifyAuthStore();

const spotifyDialog = ref(false);
const toggleToSpotify = () => {
  spotifyDialog.value = !spotifyDialog.value;
};
</script>

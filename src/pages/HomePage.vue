<template>
  <QPage class="flex flex-col items-center text-white h-dvh pt-header">
    <QBtn @click="toggleToSpotify" outline>Open</QBtn>
    <pre class="full-width">
      Access token: {{ spotifyAuthStore.accessToken }} 
      Refresh token: {{ spotifyAuthStore.refreshToken }} 
      Expires at: {{ spotifyAuthStore.expiresAt }}
    </pre>

    <QDialog v-model="spotifyDialog" position="bottom">
      <SpotifyOauth />
    </QDialog>
  </QPage>
</template>

<script setup lang="ts">
import { QBtn, QDialog, QPage } from 'quasar';
import SpotifyOauth from 'src/components/SpotifyOauth.vue';
import { useSpotifyAuthStore } from 'src/stores/spotify-auth';
import { ref } from 'vue';

const spotifyAuthStore = useSpotifyAuthStore();

const spotifyDialog = ref(false);
const toggleToSpotify = () => {
  spotifyDialog.value = !spotifyDialog.value;
};
</script>

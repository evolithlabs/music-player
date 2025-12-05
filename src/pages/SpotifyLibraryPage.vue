<template>
  <QPage class="flex flex-col flex-nowrap text-white pt-4 pb-footer">
    <div class="flex flex-col gap-2">
      <h1 class="text-3xl flex items-center gap-2 font-bold mx-4">
        <QIcon name="bi-spotify" class="text-4xl" />
        Spotify Library

        <QBtn dense round flat icon="bi-arrow-down-circle" class="ml-auto">
          <QBadge color="white" text-color="black" rounded floating> 4 </QBadge>
        </QBtn>
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

    <!-- Content Section -->

    <!-- Spotify Authentication -->
    <div
      v-if="!accessTokenIsValid && !validatingAccessToken"
      class="flex justify-center items-center p-4 grow pt-footer"
    >
      <SpotifyOauth></SpotifyOauth>
    </div>

    <div v-else-if="accessTokenIsValid">Access Token: {{ spotifyAuthStore.accessToken }}</div>

    <!-- Loader -->
    <div v-if="validatingAccessToken" class="flex justify-center items-center grow">
      <QSpinnerBars class="text-7xl" />
    </div>
  </QPage>
</template>

<script setup lang="ts">
import { QBadge, QBtn, QIcon, QInput, QPage, QSpinnerBars } from 'quasar';
import SpotifyOauth from 'src/components/SpotifyOauth.vue';
import { useSpotifyAuthStore } from 'src/stores/spotify-auth';
import { onMounted, ref } from 'vue';

const spotifyAuthStore = useSpotifyAuthStore();

const accessTokenIsValid = ref(false);
const validatingAccessToken = ref(true);
onMounted(async () => {
  validatingAccessToken.value = true;
  accessTokenIsValid.value = await spotifyAuthStore.validateAccessToken();
  validatingAccessToken.value = false;
});
</script>

<style scoped></style>

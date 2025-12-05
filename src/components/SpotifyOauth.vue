<script setup lang="ts">
import { QBtn, QCard, QSpinnerBars } from 'quasar';
import { useSpotifyAuthStore } from 'src/stores/spotify-auth';
import { onMounted, ref } from 'vue';

const { code } = defineProps<{
  code?: string | undefined;
}>();

const emit = defineEmits<{
  close: [];
}>();

const spotifyAuthStore = useSpotifyAuthStore();

const state = ref<'user-authorization' | 'user-authentication'>('user-authorization');
onMounted(async () => {
  if (code) {
    state.value = 'user-authentication';
    await authenticate();
  }
});

const isAuthorizing = ref(false);
const loginWithSpotify = () => {
  console.log('Connecting to Spotify…');
  isAuthorizing.value = true;
  spotifyAuthStore.authenticate();
};

const isAuthenticating = ref(false);
const authenticate = async () => {
  if (!code) return;
  isAuthenticating.value = true;

  try {
    await spotifyAuthStore.generateAccessToken(code);
  } catch (error) {
    console.error('Something went wrong while trying to authenticate to spotify', error);
  }

  setTimeout(() => {
    isAuthenticating.value = false;
  }, 3000);
};
</script>

<template>
  <QCard
    flat
    class="flex flex-col gap-4 text-center px-4 py-8 bg-glass text-white !rounded-md grow"
  >
    <template v-if="state == 'user-authorization'">
      <h5 class="font-bold text-xl">Login to Spotify</h5>
      <p class="text-sm">Sign in to search and play music using your Spotify account.</p>

      <QSpinnerBars v-if="isAuthorizing" size="lg" color="green" class="mx-auto" />
      <QBtn
        v-else
        label="Connect"
        color="green"
        icon="bi-spotify"
        rounded
        @click="loginWithSpotify"
      ></QBtn>
    </template>

    <template v-else>
      <h5 class="font-bold text-xl">
        <template v-if="isAuthenticating"> Logging to Spotify... </template>
        <template v-else> Logged in! </template>
      </h5>
      <p class="text-sm">
        <template v-if="isAuthenticating"> sit tight! It will take a couple of seconds. </template>
        <template v-else>
          You can now freely search any Spotify song, artist or albums you like!
        </template>
      </p>

      <QSpinnerBars v-if="isAuthenticating" size="lg" color="green" class="mx-auto" />
      <QBtn v-else label="Close" color="green" rounded @click="emit('close')"></QBtn>
    </template>
  </QCard>
</template>

<style scoped></style>

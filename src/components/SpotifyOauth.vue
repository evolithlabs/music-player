<script setup lang="ts">
import { QBtn, QCard, QInnerLoading, QSpinnerAudio } from 'quasar';
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
    isAuthenticating.value = false;
  } catch (error) {
    console.error('Something went wrong while trying to authenticate to spotify', error);
  }
};
</script>

<template>
  <QCard class="column content-center text-center q-pa-md">
    <template v-if="state == 'user-authorization'">
      <h5 class="text-weight-medium q-mb-lg q-mt-none">Login with Spotify</h5>
      <p class="text-body2">Sign in to search and play music using your Spotify account.</p>
      <QBtn label="Connect" color="green" rounded @click="loginWithSpotify"></QBtn>

      <QInnerLoading :showing="isAuthorizing" />
    </template>

    <template v-else>
      <h5 class="text-weight-medium q-mb-lg q-mt-none">
        <template v-if="isAuthenticating"> Logging to Spotify... </template>
        <template v-else> Logged in! </template>
      </h5>
      <p class="text-body2 q-px-sm">
        <template v-if="isAuthenticating"> sit tight! It will take a couple of seconds. </template>
        <template v-else>
          You can now freely search any Spotify song, artist or albums you like!
        </template>
      </p>

      <QSpinnerAudio v-if="isAuthenticating" size="xl" color="green" />

      <QBtn
        v-if="!isAuthenticating"
        label="Close"
        color="green"
        rounded
        @click="emit('close')"
      ></QBtn>
    </template>
  </QCard>
</template>

<style scoped></style>

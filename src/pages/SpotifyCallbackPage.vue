<script setup lang="ts">
import { QBtn, QIcon, QPage } from 'quasar';
import SpotifyOauth from 'src/components/SpotifyOauth.vue';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const code = ref<string>();
onMounted(() => {
  const spotifyCode = route.query.code;

  if (typeof spotifyCode === 'string' && spotifyCode && spotifyCode.length) {
    code.value = spotifyCode;
  }
});

const onClose = async () => {
  await router.push('/spotify-library');
};
</script>

<template>
  <QPage class="h-dvh text-white pt-4 pb-footer">
    <h1 class="text-3xl flex items-center gap-2 font-bold mx-4">
      <QIcon name="bi-spotify" class="text-4xl" />
      Spotify Callback

      <QBtn dense round flat icon="bi-question-circle" class="ml-auto"> </QBtn>
    </h1>

    <div class="flex justify-center items-center h-full p-4">
      <SpotifyOauth v-if="code" :code="code" @close="onClose"></SpotifyOauth>
      <div v-else class="bg-glass px-4 py-8 !rounded-md grow flex flex-col gap-4 text-center">
        <h5 class="font-bold text-xl">Something went wrong!</h5>
        <p class="text-sm">
          No authorization code was provided by Spotify. Please try logging in again.
        </p>
        <QBtn label="Return" color="green" rounded @click="onClose"></QBtn>
      </div>
    </div>
  </QPage>
</template>

<style scoped></style>

<script setup lang="ts">
import { QPage } from 'quasar';
import SpotifyOauth from 'src/components/SpotifyOauth.vue';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const code = ref<string>();
onMounted(() => {
  const spotifyCode = route.query.code;

  console.log('got code param', spotifyCode);
  if (typeof spotifyCode === 'string' && spotifyCode && spotifyCode.length) {
    code.value = spotifyCode;
  }
});

const onClose = async () => {
  await router.push('/');
};
</script>

<template>
  <QPage class="h-dvh pt-header">
    <SpotifyOauth v-if="code" :code="code" @close="onClose"></SpotifyOauth>
  </QPage>
</template>

<style scoped></style>

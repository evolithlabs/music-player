<script setup lang="ts">
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
  <div>
    <SpotifyOauth v-if="code" :code="code" @close="onClose"></SpotifyOauth>
  </div>
</template>

<style scoped></style>

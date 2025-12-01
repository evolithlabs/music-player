<template>
  <QLayout view="lHh Lpr lFf">
    <QHeader elevated> Groovio Music </QHeader>

    <BaseFooter></BaseFooter>

    <QDialog v-model="spotifyAuthDialog" position="standard">
      <SpotifyOauth :code="code" @close="spotifyAuthDialog = false"></SpotifyOauth>
    </QDialog>

    <q-page-container>
      <router-view />
    </q-page-container>
  </QLayout>
</template>

<script setup lang="ts">
import { QDialog, QHeader, QLayout } from 'quasar';
import BaseFooter from 'src/components/layout/BaseFooter.vue';
import SpotifyOauth from 'src/components/SpotifyOauth.vue';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const spotifyAuthDialog = ref(false);
const code = ref<string>();
onMounted(() => {
  const spotifyCode = route.query.code;

  console.log('got code param', spotifyCode);
  if (typeof spotifyCode === 'string' && spotifyCode && spotifyCode.length) {
    code.value = spotifyCode;
    spotifyAuthDialog.value = true;
  }
});
</script>

<template>
  <QPage class="flex flex-col text-white pb-footer pt-4">
    <div>
      <h1 class="text-3xl flex items-center gap-2 font-bold px-2">
        <QIcon name="bi-soundwave" class="text-4xl" />
        Groovio Player
      </h1>
    </div>

    {{ tracks }}

    <div class="grow overflow-scroll"></div>
  </QPage>
</template>

<script setup lang="ts">
import { QIcon, QPage, useQuasar } from 'quasar';
import { db } from 'src/boot/db';
import type { DatabaseTrack } from 'src/types/db';
import { onMounted, ref } from 'vue';

const $q = useQuasar();
onMounted(async () => {
  await fetchTracks();
});

const tracks = ref<DatabaseTrack[]>([]);
const fetchTracks = async () => {
  try {
    const res = await db.selectFrom('tracks').selectAll().execute();
    tracks.value = res;
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `error: ${(error as Error).message}`,
    });
  }
};
</script>

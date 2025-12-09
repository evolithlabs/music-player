<template>
  <QPage class="flex flex-col text-white pb-footer pt-4">
    <div>
      <h1 class="text-3xl flex items-center gap-2 font-bold px-2">
        <QIcon name="bi-soundwave" class="text-4xl" />
        Groovio Player
      </h1>
    </div>

    <QBtn outline @click="AddRunner">Add</QBtn>
    {{ tracks }}

    <div class="grow overflow-scroll"></div>
  </QPage>
</template>

<script setup lang="ts">
import { QBtn, QIcon, QPage, useQuasar } from 'quasar';
import { getDbInstance } from 'src/db';
import type { DatabaseTrack } from 'src/types/db';
import { onMounted, ref } from 'vue';

const $q = useQuasar();

onMounted(async () => {
  await fetchTracks();
});

const AddRunner = async () => {
  const db = await getDbInstance();

  console.log('adding runner');

  try {
    await db
      .insertInto('tracks')
      .values({
        name: 'Runner 59',
        duration: 69,
        path: 'gay',
      })
      .execute();

    await fetchTracks();
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `error: ${(error as Error).message}`,
    });
  }
};

const tracks = ref<DatabaseTrack[]>([]);
const fetchTracks = async () => {
  const db = await getDbInstance();

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

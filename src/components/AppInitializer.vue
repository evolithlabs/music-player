<template>
  <div
    class="h-dvh w-dvw absolute top-0 left-0 right-0 bottom-0 z-[9999] flex gap-4 bg-black !rounded-none text-white p-4 pt-32 opacity-100 transition-all duration-1000"
    :class="{ '!opacity-0': progress == 1 }"
  >
    <div
      class="absolute top-0 bottom-16 left-0 right-0 flex flex-col justify-center items-center gap-4"
    >
      <QBtn :icon="biHeadphones" dense class="text-5xl animate-wiggle pointer-events-none" />
      <h2 v-if="state != 'idle'" class="text-3xl">Tuning your library</h2>

      <div
        v-if="state != 'idle'"
        class="flex flex-col gap-2 items-start border border-white rounded-md p-4 text-xl"
      >
        <span
          v-for="(text, i) in [
            'Initializing music database',
            'Scanning music folders',
            'Syncing music database',
            'Preparing media player',
          ]"
          :key="text"
          class="flex items-center gap-2"
        >
          <QIcon v-if="progress == i * 0.25" name="bi-record-circle" />
          <QIcon v-else-if="progress < (i + 1) * 0.25" name="bi-circle" />
          <QIcon v-else name="bi-check-circle" />
          {{ text }}
        </span>
      </div>

      <p v-if="state != 'idle'" class="text-xs text-center px-6">
        Don’t worry, this setup only runs the first time you launch the app. Future launches will
        skip this step.
      </p>
    </div>

    <QLinearProgress
      :value="progress"
      :animation-speed="1000"
      class="bg-zinc-700 text-white rounded-full h-4 self-end"
    />
  </div>
</template>

<script setup lang="ts">
import { biHeadphones } from '@quasar/extras/bootstrap-icons';
import type { Kysely } from 'kysely';
import { QBtn, QIcon, QLinearProgress, useQuasar } from 'quasar';
import { getDbInstance } from 'src/db';
import { migrateDown, migrateUp } from 'src/db/migrations/migrator';
import { useMediaControlsStore } from 'src/stores/media-controls';
import { useMediaLibraryStore } from 'src/stores/media-library';
import { useMediaPlayerStore } from 'src/stores/media-player';
import { useSettingsStore } from 'src/stores/settings';
import type { Database } from 'src/types/db';
import { onMounted } from 'vue';

const { progress } = defineProps<{
  state: 'idle' | 'initializing' | 'finished';
  progress: number;
}>();

const emit = defineEmits<{
  progress: [value: number];
  state: [value: 'idle' | 'initializing' | 'finished'];
}>();

const $q = useQuasar();

const mediaLibraryStore = useMediaLibraryStore();
const mediaControlsStore = useMediaControlsStore();
const mediaPlayerStore = useMediaPlayerStore();
const settingsStore = useSettingsStore();

onMounted(async () => {
  try {
    const db = await getDbInstance();
    const settings = await settingsStore.getSettings();

    if (settings?.app_is_initialized) {
      await migrateDb(db);
      await initMediaPlayer();
      emit('progress', 1);
    } else {
      emit('state', 'initializing');

      await migrateDb(db);
      emit('progress', 0.25);

      await mediaLibraryStore.scanTracks();
      emit('progress', 0.5);

      await mediaLibraryStore.syncTracksToDB();
      emit('progress', 0.75);

      await initMediaPlayer();
      await settingsStore.saveSettings({
        app_is_initialized: true,
      });
      emit('progress', 1);
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Oops - App Init error',
      caption: (error as Error).message,
    });
  }

  setTimeout(() => {
    emit('state', 'finished');
  }, 1000);
});

const migrateDb = async (db: Kysely<Database>) => {
  await migrateDown(db, $q);
  await migrateUp(db, $q);
};

const initMediaPlayer = async () => {
  // Initialize media controls with the current track info
  await mediaControlsStore.init({
    track: mediaPlayerStore.currentTrack?.name ?? 'Unknown Track',
    artist: mediaPlayerStore.currentTrack?.artist ?? 'Unknown Artist',
    album: mediaPlayerStore.currentTrack?.album ?? 'Unknown Album',
    cover:
      mediaPlayerStore.currentTrack?.coverPath ??
      document.location.origin + '/images/background-cover.jpg',
    duration: mediaPlayerStore.currentTrack?.duration ?? 0,
    elapsed: 0,
    dismissable: false,
    isPlaying: false,
  });

  // Init media player
  if (mediaPlayerStore.currentTrack) {
    mediaPlayerStore.loadAudio();
  }
};
</script>

<style scoped></style>

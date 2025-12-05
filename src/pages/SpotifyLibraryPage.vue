<template>
  <QPage class="flex flex-col flex-nowrap text-white pb-footer pt-4">
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

    <div></div>
  </QPage>
</template>

<script setup lang="ts">
import { QBadge, QBtn, QIcon, QInput, QPage } from 'quasar';
</script>

<style scoped></style>

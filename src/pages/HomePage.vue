<template>
  <QPage class="flex flex-col text-white pb-footer pt-4">
    <div>
      <h1 class="text-3xl flex items-center gap-2 font-bold px-2">
        <QIcon name="bi-soundwave" class="text-4xl" />
        Groovio Player
      </h1>
    </div>

    <div class="grow overflow-scroll"></div>
  </QPage>
</template>

<script setup lang="ts">
import { QIcon, QPage } from 'quasar';
</script>

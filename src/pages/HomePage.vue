<template>
  <QPage class="flex flex-col text-white h-dvh pt-header">
    <div>
      <h1 class="text-3xl flex items-center gap-2 font-bold px-2">
        <QIcon name="graphic_eq" class="text-4xl" />
        Groovio Player
      </h1>
    </div>

    <div class="grow overflow-scroll mb-footer"></div>
  </QPage>
</template>

<script setup lang="ts">
import { QIcon, QPage } from 'quasar';
</script>

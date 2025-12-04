<template>
  <QPage class="flex flex-col text-white pt-header pb-footer">
    <div>
      <h1 class="text-3xl flex items-center gap-2 font-bold px-2">
        <QIcon name="graphic_eq" class="text-4xl" />
        Groovio Player
      </h1>
    </div>

    <div class="grow overflow-scroll"></div>
  </QPage>
</template>

<script setup lang="ts">
import { QIcon, QPage } from 'quasar';
</script>

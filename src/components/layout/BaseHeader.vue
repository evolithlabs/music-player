<script setup lang="ts">
import { QBtn, QHeader } from 'quasar';
</script>

<template>
  <QHeader
    class="bg-transparent row justify-between items-center q-pa-none q-ma-none q-gutter-none q-ma-xs"
  >
    <div class="bg-glass q-pa-xs">
      <QBtn icon="menu" round flat ripple class="text-caption"></QBtn>
      <QBtn icon="search" round flat ripple class="text-caption" />
    </div>
    <div class="bg-glass q-pa-xs">
      <QBtn icon="notifications" round flat ripple class="text-caption" />
    </div>
  </QHeader>
</template>

<style scoped></style>

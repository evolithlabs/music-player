<template>
  <QLayout view="hHh Lpr fFf" class="bg-zinc-800">
    <!-- <BaseHeader></BaseHeader> -->
    <BaseFooter class="z-[9999]"></BaseFooter>

    <QPageContainer class="!py-0">
      <router-view />
    </QPageContainer>
  </QLayout>
</template>

<script setup lang="ts">
import { QLayout, QPageContainer } from 'quasar';
import BaseFooter from 'src/components/layout/BaseFooter.vue';
</script>

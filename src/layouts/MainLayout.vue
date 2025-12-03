<template>
  <QLayout view="lHh Lpr lFf" class="bg-blue-grey-5">
    <BaseHeader></BaseHeader>
    <BaseFooter></BaseFooter>

    <q-page-container>
      <router-view />
    </q-page-container>
  </QLayout>
</template>

<script setup lang="ts">
import { QLayout } from 'quasar';
import BaseFooter from 'src/components/layout/BaseFooter.vue';
import BaseHeader from 'src/components/layout/BaseHeader.vue';
</script>

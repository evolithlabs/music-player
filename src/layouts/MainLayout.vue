<template>
  <QLayout view="lHh Lpr lFf">
    <QHeader elevated> Groovio Music</QHeader>

    <BaseFooter></BaseFooter>

    <q-page-container>
      <router-view />
    </q-page-container>
  </QLayout>
</template>

<script setup lang="ts">
import { QHeader, QLayout } from 'quasar';
import BaseFooter from 'src/components/layout/BaseFooter.vue';
</script>

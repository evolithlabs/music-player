<script setup lang="ts">
import { QBtn } from 'quasar';

const { to, icon } = defineProps<{
  icon: string;
  to: string;
}>();
</script>

<template>
  <RouterLink :to="to" class="content-center text-center text-white">
    <QBtn :icon="icon" size="md" flat />
  </RouterLink>
</template>

<style scoped></style>

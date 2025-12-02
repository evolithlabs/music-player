<script setup lang="ts">
import { QBtn } from 'quasar';

const { to, icon } = defineProps<{
  icon: string;
  to: string;
}>();
</script>

<template>
  <RouterLink :to="to" class="link content-center text-center text-white">
    <QBtn :icon="icon" size="md" flat round ripple />
  </RouterLink>
</template>

<style scoped>
.link {
  text-decoration: none;
}
</style>

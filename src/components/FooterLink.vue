<script setup lang="ts">
import { QBtn } from 'quasar';

const { to, icon } = defineProps<{
  icon: string;
  to: string;
}>();
</script>

<template>
  <RouterLink :to="to" class="link content-center text-center text-white">
    <QBtn :icon="icon" size="md" round ripple flat />
  </RouterLink>
</template>

<style scoped lang="scss">
.link {
  text-decoration: none;
}

.router-link-exact-active > .q-btn {
  color: $grey-10;
  background-color: white;
}
</style>

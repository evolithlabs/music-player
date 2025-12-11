<template>
  <div class="bg-black">
    <router-view v-if="initializingProgress == 1" />
    <AppInitializer
      v-if="initializingState != 'finished'"
      :state="initializingState"
      :progress="initializingProgress"
      @progress="(val) => (initializingProgress = val)"
      @state="(val) => (initializingState = val)"
    ></AppInitializer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppInitializer from './components/AppInitializer.vue';

const initializingProgress = ref(0);
const initializingState = ref<'idle' | 'initializing' | 'finished'>('idle');
</script>

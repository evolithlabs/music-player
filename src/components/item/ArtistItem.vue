<script setup lang="ts">
import { QBtn, QImg, useQuasar } from 'quasar';
import type { VueClassProp, VueStyleProp } from 'quasar';
import type { Artist } from 'src/types/data';

const { artist } = defineProps<{
  artist: Artist;
  type?: 'local' | 'spotify';
}>();

const $q = useQuasar();

const showTrackOptions = () => {
  const options: {
    classes?: VueClassProp;
    style?: VueStyleProp;
    icon?: string;
    img?: string;
    avatar?: string;
    label?: string | number;
    value: string;
  }[] = [
    {
      icon: 'bi-eye-fill',
      label: 'More details',
      value: 'details',
    },
  ];

  $q.bottomSheet({
    title: `${artist.name} - ${artist.tracksCount} tracks`,
    grid: false,
    dark: true,
    class: 'bg-black text-white border-t',
    actions: options,
  }).onOk((option) => {
    console.log('selected option', option);
  });
};

const onClick = () => {};
</script>

<template>
  <div
    class="flex flex-nowrap items-center grow text-white rounded-md relative"
    v-ripple
    @click="onClick"
  >
    <div class="mr-3 relative rounded-md z-10">
      <QImg
        src="/images/background-cover.jpg"
        width="48px"
        position="cover"
        ratio="1"
        class="rounded-md"
      />
      <QBtn
        icon="bi-play"
        flat
        class="text-xs absolute top-0 left-0 right-0 bottom-0 [&_.q-icon]:stroke-[0.5] [&_.q-icon]:stroke-zinc-700 bg-black/20 opacity-80"
      />
    </div>
    <div class="flex flex-col mr-4 z-10">
      <h6 class="font-bold line-clamp-1 text-sm relative">
        {{ artist.name }}
      </h6>
      <div class="flex items-center gap-1">
        <span class="text-xs line-clamp-1">
          {{ artist.albumsCount }} {{ artist.albumsCount != 1 ? 'albums' : 'album' }}
        </span>
        <span>•</span>
        <span class="text-xs shrink-0">
          {{ artist.tracksCount }} {{ artist.tracksCount != 1 ? 'tracks' : 'track' }}
        </span>
      </div>
    </div>
    <div class="flex items-baseline ml-auto shrink-0 relative z-10">
      <QBtn
        icon="bi-three-dots-vertical"
        round
        color="white"
        flat
        class="text-xs"
        @click.stop="showTrackOptions"
      />
    </div>
  </div>
</template>

<style scoped>
.image-button .q-btn__content .q-icon {
  background-color: red !important;
}
</style>

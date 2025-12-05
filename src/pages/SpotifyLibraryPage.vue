<template>
  <QPage class="text-white pt-4 pb-footer">
    <div class="flex flex-col gap-2 mb-2">
      <h1 class="text-3xl flex items-center gap-2 font-bold mx-4">
        <QIcon name="bi-spotify" class="text-4xl" />
        Spotify Library

        <QBtn dense round flat icon="bi-arrow-down-circle" class="ml-auto">
          <QBadge color="white" text-color="black" rounded floating> 4 </QBadge>
        </QBtn>
      </h1>
    </div>

    <!-- Spotify Authentication -->
    <div
      v-if="!accessTokenIsValid && !validatingAccessToken"
      class="flex justify-center items-center p-4 grow pt-footer"
    >
      <SpotifyOauth></SpotifyOauth>
    </div>

    <!-- Auth Loader -->
    <div v-if="validatingAccessToken" class="flex justify-center items-center grow mt-16">
      <QSpinnerBars class="text-5xl" />
    </div>

    <!-- Content -->
    <div v-else-if="accessTokenIsValid">
      <LibrarySearchAndFilter
        v-model:query="searchQuery"
        v-model:tab="tab"
        :tracks="tracks"
        :loading="fetchingData"
        @update:query="fetchTracks"
      ></LibrarySearchAndFilter>
    </div>
  </QPage>
</template>

<script setup lang="ts">
import type { AxiosError } from 'axios';
import { QBadge, QBtn, QIcon, QPage, QSpinnerBars, useQuasar } from 'quasar';
import { spotifyApi } from 'src/boot/axios';
import LibrarySearchAndFilter from 'src/components/LibrarySearchAndFilter.vue';
import SpotifyOauth from 'src/components/SpotifyOauth.vue';
import { useSpotifyAuthStore } from 'src/stores/spotify-auth';
import type { LibraryTab } from 'src/types/library';
import type { SpotifyTrackResponse } from 'src/types/spotify';
import type { Track } from 'src/types/tracks';
import { onMounted, ref } from 'vue';

const spotifyAuthStore = useSpotifyAuthStore();
const $q = useQuasar();

const accessTokenIsValid = ref(false);
const validatingAccessToken = ref(true);
onMounted(async () => {
  validatingAccessToken.value = true;

  try {
    accessTokenIsValid.value = await spotifyAuthStore.validateAccessToken();
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to validate Spotify access token',
      caption: (error as AxiosError).message,
    });
  }

  validatingAccessToken.value = false;
  await fetchTracks();
});

const tracks = ref<Track[]>([]);
const searchQuery = ref<string>('');
const tab = ref<LibraryTab>('tracks');
const fetchingData = ref(false);
const fetchTracks = async () => {
  // Placeholder for fetching tracks from Spotify API
  let query = searchQuery.value.trim();
  if (!searchQuery.value) query = 'NF';

  fetchingData.value = true;
  try {
    const response = await spotifyApi.get<SpotifyTrackResponse>('/search', {
      params: {
        q: query,
        type: 'track',
        limit: 10,
        offset: 0,
        include_external: 'audio',
      },
      headers: {
        Authorization: `Bearer ${spotifyAuthStore.accessToken}`,
      },
    });

    tracks.value = [];
    response.data?.tracks?.items?.forEach((spotifyTrack) => {
      // Map SpotifyTrack to your Track type and add to tracks array
      const track: Track = {
        id: spotifyTrack.id ?? '-1',
        title: spotifyTrack.name ?? 'Unknown Title',
        artist: spotifyTrack.artists?.map((artist) => artist.name).join(', ') ?? 'Unknown Artist',
        album: spotifyTrack.album?.name ?? 'Unknown Album',
        duration: Math.floor((spotifyTrack.duration_ms ?? 0) / 1000),
        coverPath: spotifyTrack.album?.images?.at(0)?.url || '/images/background-cover.jpg',
        year: spotifyTrack.album?.release_date
          ? parseInt(spotifyTrack?.album?.release_date?.split('-').at(0) ?? '0')
          : 0,
        path: 'https://s3.ustatik.com/audio.com.audio/transcoding/44/10/1789421194991044-1789421197058588-1789421215373396.mp3?X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=W7IA3NSYSOQIKLY9DEVC/20251205/eu-central-1/s3/aws4_request&X-Amz-Date=20251205T140755Z&X-Amz-SignedHeaders=host&X-Amz-Expires=518400&X-Amz-Signature=6bd9a12065943b42e83836a1d4e994f205c9ba9aa0d62e766c07e6f109a7b323',
      };

      tracks.value.push(track);
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to fetch tracks from Spotify',
      caption: (error as AxiosError).message,
    });
  }

  fetchingData.value = false;
};
</script>

<style scoped></style>

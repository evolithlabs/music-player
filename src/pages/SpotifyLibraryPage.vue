<template>
  <QPage class="text-white pt-4 pb-footer h-full">
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
        :artists="[]"
        :albums="[]"
        :offset="15"
        type="spotify"
        :loading="fetchingTracks"
        @update:query="fetchTracks"
      >
        <template #track="{ track, queue, type }">
          <TrackItem
            :track="track"
            :key="track.id"
            :queue="queue"
            :type="type"
            :download-status="tracksDownloadStatuses[track.id]"
            class="p-1.5"
            @update-download-status="(id, status) => (tracksDownloadStatuses[id] = status)"
          ></TrackItem>
        </template>
      </LibrarySearchAndFilter>
    </div>
  </QPage>
</template>

<script setup lang="ts">
import type { AxiosError } from 'axios';
import { QBadge, QBtn, QIcon, QPage, QSpinnerBars, useQuasar } from 'quasar';
import { backendApi, spotifyApi } from 'src/boot/axios';
import LibrarySearchAndFilter from 'src/components/LibrarySearchAndFilter.vue';
import SpotifyOauth from 'src/components/SpotifyOauth.vue';
import TrackItem from 'src/components/item/TrackItem.vue';
import { useSpotifyAuthStore } from 'src/stores/spotify-auth';
import type { Track, TrackDownloadStatus } from 'src/types/data';
import type { LibraryTab } from 'src/types/library';
import type { SpotifyTrackResponse } from 'src/types/spotify';
import { getSpotifyTrackUrl } from 'src/utils/get-spotify-track-url';
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
      message: `Oops - Failed to validate Spotify access token`,
      caption: (error as AxiosError).message,
    });
  }

  validatingAccessToken.value = false;

  // Fetch tracks
  if (accessTokenIsValid.value) await fetchTracks();
});

const searchQuery = ref<string>('');
const tab = ref<LibraryTab>('tracks');

const tracks = ref<Track[]>([]);
const fetchingTracks = ref(false);
const tracksDownloadStatuses = ref<Record<string, TrackDownloadStatus>>({});
const fetchingTracksStatuses = ref(false);
const fetchTracks = async () => {
  // Placeholder for fetching tracks from Spotify API
  let query = searchQuery.value.trim();
  if (!searchQuery.value) query = 'NF';

  try {
    // Fetch spotify tracks
    fetchingTracks.value = true;
    const spotifyResponse = await spotifyApi.get<SpotifyTrackResponse>('/search', {
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
    spotifyResponse.data?.tracks?.items?.forEach((spotifyTrack) => {
      // Map SpotifyTrack to your Track type and add to tracks array
      const track: Track = {
        id: spotifyTrack.id ?? '-1',
        spotify_id: spotifyTrack.id,
        name: spotifyTrack.name ?? 'Unknown Title',
        artist: spotifyTrack.artists?.map((artist) => artist.name).join(', ') ?? 'Unknown Artist',
        album: spotifyTrack.album?.name ?? 'Unknown Album',
        duration: spotifyTrack.duration_ms ?? 0,
        coverPath: spotifyTrack.album?.images?.at(0)?.url || '/images/background-cover.jpg',
        year: spotifyTrack.album?.release_date
          ? parseInt(spotifyTrack?.album?.release_date?.split('-').at(0) ?? '0')
          : 0,
        path: getSpotifyTrackUrl(spotifyTrack.id ?? ''),
      };

      tracks.value.push(track);
    });
    fetchingTracks.value = false;

    // Fetch track statuses
    fetchingTracksStatuses.value = true;
    const backendResponse = await backendApi.get<Record<string, TrackDownloadStatus>>(
      '/check-tracks',
      {
        params: {
          ids: spotifyResponse.data?.tracks?.items
            ?.map((spotifyTrack) => spotifyTrack.id)
            .join(','),
        },
      },
    );

    for (const spotifyTrackId in backendResponse.data) {
      const status = backendResponse.data[spotifyTrackId];
      if (status) {
        tracksDownloadStatuses.value[spotifyTrackId] = status;
      }
    }
    fetchingTracksStatuses.value = true;
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Oops - Failed to fetch Spotify tracks`,
      caption: (error as AxiosError).message,
    });
  }

  fetchingTracks.value = false;
  fetchingTracksStatuses.value = false;
};
</script>

<style scoped></style>

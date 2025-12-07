import { backendApi } from 'src/boot/axios';

export const getSpotifyTrackUrl = (spotifyTrackId: string): string => {
  return `${backendApi.defaults.baseURL}/play-track/${spotifyTrackId}`;
};

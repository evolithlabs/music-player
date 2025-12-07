import { defineBoot } from '#q-app/wrappers';
import axios from 'axios';

const spotifyApi = axios.create({ baseURL: 'https://api.spotify.com/v1' });
const backendApi = axios.create({ baseURL: process.env.API_URL ?? 'www.example.com' });

export default defineBoot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios;
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$spotifyApi = spotifyApi;
  app.config.globalProperties.$backendApi = backendApi;
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API
});

export { axios, spotifyApi, backendApi };

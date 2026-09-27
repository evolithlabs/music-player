import { defineStore, acceptHMRUpdate } from 'pinia';
import type { SpotifyAccessTokenResponse } from 'src/types/spotify';
import { onMounted, onUnmounted, ref } from 'vue';
import { sha256 as jsSha256 } from 'js-sha256';
import { Capacitor } from '@capacitor/core';
import { useQuasar } from 'quasar';

export const useSpotifyAuthStore = defineStore(
  'spotify-auth',
  () => {
    const clientId = '87fe66d473fe41a08cd883998c6b60e0';
    const redirectUri =
      Capacitor.getPlatform() == 'android'
        ? 'org.capacitor.quasar.app://spotify-callback'
        : document.location.origin + '/';

    const codeVerifier = ref<string>('');
    const accessToken = ref<string>();
    const refreshToken = ref<string>();
    const expiresIn = ref<number>();
    const expiresAt = ref<number>();
    let refreshTimeout: NodeJS.Timeout | undefined;

    const $q = useQuasar();

    const generateRandomString = (length: number) => {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const values = crypto.getRandomValues(new Uint8Array(length));
      return values.reduce((acc, x) => acc + possible[x % possible.length], '');
    };

    const sha256 = (plain: string): Uint8Array => {
      // Use the 'array' method of js-sha256 to get the hash as a byte array
      const hashBytes = jsSha256.array(plain);
      return new Uint8Array(hashBytes);
    };

    const base64encode = (input: Uint8Array) => {
      return btoa(String.fromCharCode(...input))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const authenticate = () => {
      codeVerifier.value = generateRandomString(64);
      const hashed = sha256(codeVerifier.value);
      const codeChallenge = base64encode(hashed);

      const scope = 'user-read-private user-read-email';
      const authUrl = new URL('https://accounts.spotify.com/authorize');

      const params = {
        response_type: 'code',
        client_id: clientId,
        scope,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: redirectUri,
      };

      authUrl.search = new URLSearchParams(params).toString();
      window.location.href = authUrl.toString();
    };

    const generateAccessToken = async (code: string) => {
      // stored in the previous step
      const url = 'https://accounts.spotify.com/api/token';
      const payload = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier.value,
        }),
      };

      try {
        const body = await fetch(url, payload);
        const response = (await body.json()) as Partial<SpotifyAccessTokenResponse>;

        accessToken.value = response.access_token;
        refreshToken.value = response.refresh_token;
        expiresIn.value = response.expires_in;

        if (response.expires_in) {
          expiresAt.value = Date.now() + response.expires_in * 1000;
          scheduleTokenRefresh(response.expires_in);
        }
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: `Oops - Failed to generate Spotify access token`,
          caption: (error as Error).message,
        });
      }
    };

    const refreshAccessToken = async () => {
      if (!refreshToken.value) return;

      const url = 'https://accounts.spotify.com/api/token';
      const payload = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken.value,
          client_id: clientId,
        }),
      };

      try {
        const body = await fetch(url, payload);
        const response = (await body.json()) as Partial<SpotifyAccessTokenResponse>;

        accessToken.value = response.access_token;
        refreshToken.value = response.refresh_token;
        expiresIn.value = response.expires_in;

        if (response.expires_in) {
          expiresAt.value = Date.now() + response.expires_in * 1000;
          scheduleTokenRefresh(response.expires_in);
        }
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: `Oops - Failed to validate Spotify access token`,
          caption: (error as Error).message,
        });
      }
    };

    const scheduleTokenRefresh = (expiresIn: number) => {
      // Refresh 30 sec before expiration
      const refreshInMs = (expiresIn - 30) * 1000;

      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        refreshAccessToken().catch(console.error);
      }, refreshInMs);
    };

    const validateAccessToken = async () => {
      if (!accessToken.value || !expiresAt.value) return false;

      if (Date.now() >= expiresAt.value) {
        // Token is expired
        await refreshAccessToken();
      }

      return true;
    };

    onMounted(async () => {
      const valid = await validateAccessToken();

      // Schedule next background refresh
      if (valid && expiresAt.value) {
        const remainingMs = expiresAt.value - Date.now();
        if (remainingMs > 0) {
          scheduleTokenRefresh(Math.floor(remainingMs / 1000));
        }
      }
    });

    onUnmounted(() => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      expiresAt,
      codeVerifier,
      authenticate,
      generateAccessToken,
      validateAccessToken,
    };
  },
  {
    persist: {
      storage: localStorage,
    },
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSpotifyAuthStore, import.meta.hot));
}

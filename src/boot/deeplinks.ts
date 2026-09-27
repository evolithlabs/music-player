import { App as CapacitorApp } from '@capacitor/app';
import type { BootCallback } from '@quasar/app-vite';

const boot: BootCallback = ({ router }) => {
  void CapacitorApp.addListener('appUrlOpen', (event) => {
    if (!event.url) return;

    // Remove scheme
    const withoutScheme = event.url.replace(/^.*?:\/\//, ''); // "spotify-callback/?code=..."

    // Split host and pathname
    const [host, ...rest] = withoutScheme.split('/'); // host = "spotify-callback", rest = ["?code=..."]
    const path = '/' + host;

    // Extract query string manually
    const queryString = rest.join('/').replace(/^\?/, ''); // "code=..."
    const query = Object.fromEntries(new URLSearchParams(queryString));

    // Push to Vue Router
    router
      .push({
        path,
        query,
      })
      .catch((e) => console.error('Error during deeplink redirection', e));
  });
};

export default boot;

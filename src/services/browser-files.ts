import { downloadPercent } from '../utils/downloads.ts';

export type BrowserFileStorage = {
  getFile(key: string): Promise<Blob | undefined>;
  saveFile(key: string, data: Blob): Promise<void>;
  removeFile?(key: string): Promise<void>;
};

const filePrefix = 'groovio-file:';

// Store stable keys in song rows. Blob URLs are only valid in the current page.
export function createBrowserFiles(storage: BrowserFileStorage, fetchFile: typeof fetch = fetch) {
  const urls = new Map<string, string>();
  const keys = new Map<string, string>();
  function playable(key: string, data: Blob) {
    let uri = urls.get(key);
    if (!uri) {
      uri = URL.createObjectURL(data);
      urls.set(key, uri);
      keys.set(uri, key);
    }
    return uri;
  }
  return {
    storedUri(uri: string) { return keys.has(uri) ? `${filePrefix}${keys.get(uri)}` : uri; },
    async remove(uri: string) {
      const key = keys.get(uri) ?? (uri.startsWith(filePrefix) ? uri.slice(filePrefix.length) : undefined);
      if (!key) return;
      if (!storage.removeFile) throw new Error('Browser music storage is unavailable. Please reload the app.');
      await storage.removeFile(key);
      const url = urls.get(key);
      if (url) { URL.revokeObjectURL(url); keys.delete(url); urls.delete(key); }
    },
    async resolve(uri: string) {
      if (!uri.startsWith(filePrefix)) return { uri, exists: !uri.startsWith('blob:') };
      const key = uri.slice(filePrefix.length);
      const data = await storage.getFile(key);
      return data?.size ? { uri: playable(key, data), exists: true } : { uri, exists: false };
    },
    async download(key: string, url: string, audio = false, onProgress?: (percent: number | null) => void) {
      const existing = await storage.getFile(key);
      if (existing?.size) return playable(key, existing);
      const response = await fetchFile(url, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error(`Could not download ${audio ? 'audio' : 'artwork'} (HTTP ${response.status}). Please retry.`);
      let data: Blob;
      if (onProgress && response.body) {
        const total = Number(response.headers.get('Content-Length'));
        const reader = response.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;
        onProgress(downloadPercent(0, total));
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            chunks.push(new Uint8Array(value)); received += value.byteLength;
            onProgress(downloadPercent(received, total));
          }
        } finally { reader.releaseLock(); }
        data = new Blob(chunks, { type: response.headers.get('Content-Type') ?? '' });
      } else data = await response.blob();
      if (!data.size) throw new Error('The downloaded file is empty. Please retry.');
      if (audio && (data.type.startsWith('text/') || data.type.includes('json'))) throw new Error('The music service returned an invalid audio file. Please retry.');
      // Resolve only after the transaction commits, so failures remain retryable.
      await storage.saveFile(key, data);
      return playable(key, data);
    },
  };
}

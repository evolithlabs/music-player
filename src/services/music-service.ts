import { Platform } from 'react-native';
import { localPreferences } from '../database';

import { CatalogAlbum, CatalogArtist, CatalogPage, CatalogTrack, DownloadJob } from '../types/music';

const serviceKey = 'groovio.service-url';
export const defaultServiceUrl = process.env.EXPO_PUBLIC_MUSIC_SERVICE_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8090' : 'http://localhost:8090');

export async function loadServiceUrl() {
  const saved = await localPreferences.getItem(serviceKey);
  return validateServiceUrl(Platform.OS === 'web' && saved === 'http://10.0.2.2:8090' ? defaultServiceUrl : saved ?? defaultServiceUrl);
}

export function validateServiceUrl(value: string) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Enter an http or https service address without credentials or query parameters.');
  }
  return url.toString().replace(/\/$/, '');
}

export async function saveServiceUrl(value: string) {
  const url = validateServiceUrl(value);
  await localPreferences.setItem(serviceKey, url);
  return url;
}

async function request<T>(base: string, path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel);
  const timer = setTimeout(cancel, 35000);
  try {
    const response = await fetch(`${base}${path}`, { ...options, signal: controller.signal });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? `Music service returned HTTP ${response.status}.`);
    }
    return await response.json() as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Request cancelled or timed out. Please try again.');
    if (error instanceof TypeError) throw new Error('Could not reach the music service. Check its address and your connection.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export function searchTracks(base: string, query: string, offset = 0, signal?: AbortSignal) {
  return request<{ tracks: CatalogTrack[]; count: number; offset: number }>(base, `/api/search?q=${encodeURIComponent(query)}&offset=${offset}`, {}, signal);
}

export function queueTrack(base: string, track: CatalogTrack, signal?: AbortSignal) {
  return request<DownloadJob>(base, '/api/queue-track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deezerId: track.deezerId, recordingId: track.recordingId, releaseId: track.releaseId ?? '', title: track.title, artist: track.artist }),
  }, signal);
}

export function getDownloadJob(base: string, id: string, signal?: AbortSignal) {
  return request<DownloadJob>(base, `/api/downloads/${encodeURIComponent(id)}`, {}, signal);
}

export function getArtist(base: string, name: string, trackId?: number, signal?: AbortSignal) {
  return request<CatalogArtist>(base, `/api/artist?name=${encodeURIComponent(name)}&trackId=${trackId ?? ''}`, {}, signal);
}

export function getArtistSongs(base: string, id: number, offset = 0, top = false, signal?: AbortSignal) {
  return request<CatalogPage<{ tracks: CatalogTrack[] }>>(base, `/api/artists/${id}/tracks?offset=${offset}&top=${top ? '1' : '0'}`, {}, signal);
}

export function getArtistAlbums(base: string, id: number, offset = 0, signal?: AbortSignal) {
  return request<CatalogPage<{ albums: CatalogAlbum[] }>>(base, `/api/artists/${id}/albums?offset=${offset}`, {}, signal);
}

export function getAlbum(base: string, name: string, artist: string, id?: number, trackId?: number, signal?: AbortSignal) {
  return request<CatalogAlbum>(base, `/api/album?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist)}&id=${id ?? ''}&trackId=${trackId ?? ''}`, {}, signal);
}

export function getAlbumSongs(base: string, id: number, offset = 0, signal?: AbortSignal) {
  return request<CatalogPage<{ tracks: CatalogTrack[] }>>(base, `/api/albums/${id}/tracks?offset=${offset}`, {}, signal);
}

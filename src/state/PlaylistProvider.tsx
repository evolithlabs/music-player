import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { Playlist } from '../types/collection';
import { getDatabase, writeLocal } from '../database';

const likedSongs: Playlist = { id: 'liked', name: 'Liked Songs', trackIds: [], createdAt: 0 };
type State = { playlists: Playlist[]; ready: boolean; error: string | null; create: (name: string, trackIds?: string[]) => Promise<Playlist>; add: (id: string, trackIds: string[]) => Promise<void>; rename: (id: string, name: string) => Promise<void>; remove: (id: string) => Promise<void> };
const Context = createContext<State | null>(null);

export function PlaylistProvider({ children }: PropsWithChildren) {
  const [playlists, setPlaylists] = useState<Playlist[]>([likedSongs]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<Playlist[]>([likedSongs]);
  const pending = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    void getDatabase().then(async (db) => {
      let saved = await db.getPlaylists();
      if (await db.getSetting('groovio.playlists-initialized') !== 'true') {
        if (!saved.some((item) => item.id === 'liked')) { saved = [likedSongs, ...saved]; await writeLocal((db) => db.savePlaylists(saved)); }
        await writeLocal((db) => db.setSetting('groovio.playlists-initialized', 'true'));
      }
      return saved;
    }).then((saved) => {
      if (!Array.isArray(saved) || saved.some((item) => typeof item?.id !== 'string' || typeof item?.name !== 'string' || !Array.isArray(item?.trackIds) || item.trackIds.some((id: unknown) => typeof id !== 'string'))) throw new Error('Invalid playlists');
      if (active) {
        current.current = saved;
        setPlaylists(current.current); setReady(true);
      }
    }).catch(() => { if (active) setError('Could not open playlists. Restart the app to try again.'); });
    return () => { active = false; };
  }, []);
  const write = useCallback((update: (items: Playlist[]) => Playlist[]) => {
    const operation = pending.current.then(async () => {
      const items = update(current.current);
      await writeLocal((db) => db.savePlaylists(items));
      current.current = items; setPlaylists(items); setError(null);
    });
    pending.current = operation.catch(() => {});
    return operation;
  }, []);
  const create = useCallback(async (input: string, trackIds: string[] = []) => {
    if (!ready) throw new Error('Playlists are still loading.');
    const name = input.trim();
    if (!name) throw new Error('Give your playlist a name.');
    const playlist: Playlist = { id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name, trackIds: [...new Set(trackIds)], createdAt: Date.now() };
    await write((items) => {
      if (items.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('A playlist with this name already exists.');
      return [...items, playlist];
    });
    return playlist;
  }, [ready, write]);
  const add = useCallback(async (id: string, trackIds: string[]) => {
    if (!ready) throw new Error('Playlists are still loading.');
    await write((items) => {
      if (!items.some((item) => item.id === id)) throw new Error('This playlist no longer exists.');
      return items.map((item) => item.id === id ? { ...item, trackIds: [...new Set([...item.trackIds, ...trackIds])] } : item);
    });
  }, [ready, write]);
  const rename = useCallback(async (id: string, input: string) => {
    if (!ready) throw new Error('Playlists are still loading.');
    const name = input.trim();
    if (!name) throw new Error('Give your playlist a name.');
    await write((items) => {
      if (!items.some((item) => item.id === id)) throw new Error('This playlist no longer exists.');
      if (items.some((item) => item.id !== id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('A playlist with this name already exists.');
      return items.map((item) => item.id === id ? { ...item, name } : item);
    });
  }, [ready, write]);
  const remove = useCallback((id: string) => {
    const operation = pending.current.then(async () => {
      if (!ready) throw new Error('Playlists are still loading.');
      await writeLocal((db) => db.removePlaylist(id));
      current.current = current.current.filter((item) => item.id !== id); setPlaylists(current.current); setError(null);
    });
    pending.current = operation.catch(() => {});
    return operation;
  }, [ready]);
  return <Context.Provider value={{ playlists, ready, error, create, add, rename, remove }}>{children}</Context.Provider>;
}

export function usePlaylists() {
  const value = useContext(Context);
  if (!value) throw new Error('PlaylistProvider is required');
  return value;
}

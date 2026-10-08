import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useLibrary } from '../state/LibraryProvider';
import { usePlaylists } from '../state/PlaylistProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { formatSongArtist } from '../utils/playback';
import { Artwork } from './Artwork';
import { BottomSheet } from './BottomSheet';

export function PlaylistEditor({ onClose, playlistId }: { onClose: () => void; playlistId?: string }) {
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { tracks } = useLibrary();
  const { create, add, playlists, ready } = usePlaylists();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playlist = playlists.find((item) => item.id === playlistId);
  const candidates = playlistId ? tracks.filter((track) => !playlist?.trackIds.includes(track.id)) : tracks;
  async function save() {
    if (busy || !ready) return;
    setBusy(true); setError(null);
    try {
      const id = playlistId ?? (await create(name)).id;
      if (playlistId && selected.length) await add(id, selected);
      onClose();
      if (!playlistId) router.push({ pathname: '/collection', params: { kind: 'playlist', id } });
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save this playlist.'); }
    finally { setBusy(false); }
  }
  return <BottomSheet visible onClose={onClose} title={playlistId ? 'Add songs' : 'New playlist'}>
    {!playlistId && <TextInput accessibilityLabel="Playlist name" value={name} onChangeText={setName} maxLength={80} placeholder="Playlist name" placeholderTextColor={theme.colors.muted} selectionColor={theme.colors.accent} style={styles.input} />}
    {playlistId && <><Text style={styles.caption}>{`Choose songs for ${playlist?.name ?? 'your playlist'}.`}</Text>
    {candidates.map((track) => <Pressable key={track.id} accessibilityRole="checkbox" accessibilityLabel={`Add ${track.title}`} aria-checked={selected.includes(track.id)} accessibilityState={{ checked: selected.includes(track.id) }} onPress={() => setSelected((value) => value.includes(track.id) ? value.filter((id) => id !== track.id) : [...value, track.id])} style={styles.row}><Artwork uri={track.artworkUri} square /><View style={styles.details}><Text numberOfLines={1} style={styles.title}>{track.title}</Text><Text numberOfLines={1} style={styles.caption}>{formatSongArtist(track)}</Text></View><Ionicons name={selected.includes(track.id) ? 'checkmark-circle' : 'ellipse-outline'} size={theme.size.icon} color={selected.includes(track.id) ? theme.colors.accent : theme.colors.muted} /></Pressable>)}
    {!candidates.length && <Text style={styles.caption}>{tracks.length ? 'All your songs are already in this playlist.' : 'Songs will appear here when added to your library.'}</Text>}</>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel={playlistId ? 'Add selected songs' : 'Create playlist'} disabled={busy || !ready || (!playlistId && !name.trim()) || (!!playlistId && !selected.length)} onPress={() => { void save(); }} style={[styles.save, (busy || !ready) && styles.disabled]}><Text style={styles.saveText}>{busy ? 'Saving…' : playlistId ? 'Add selected songs' : 'Create playlist'}</Text></Pressable>
  </BottomSheet>;
}
const createStyles = (theme: Theme) => ({
  input: { ...theme.type.body, color: theme.colors.text, padding: theme.space.md, borderRadius: theme.radius.input, backgroundColor: theme.colors.recessed, boxShadow: theme.shadows.inset, marginBottom: theme.space.md, outlineWidth: 0, outlineStyle: 'solid' as const },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.sm, paddingVertical: theme.space.sm },
  details: { flex: 1, minWidth: 0 },
  title: { ...theme.type.body, color: theme.colors.text },
  caption: { ...theme.type.caption, color: theme.colors.muted, marginVertical: theme.space.xs },
  save: { padding: theme.space.md, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent, marginTop: theme.space.md, alignItems: 'center' as const },
  saveText: { ...theme.type.action, color: theme.colors.onAccent },
  error: { ...theme.type.caption, color: theme.colors.error },
  disabled: { opacity: theme.opacity.disabled },
});

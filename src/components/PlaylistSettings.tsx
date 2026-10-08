import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Share, Text, TextInput } from 'react-native';

import { useLibrary } from '../state/LibraryProvider';
import { usePlaylists } from '../state/PlaylistProvider';
import { useTheme, useThemeStyles } from '../state/ThemeProvider';
import { Theme } from '../theme';
import { BottomSheet } from './BottomSheet';

export function PlaylistSettings({ playlistId, onClose, onRemoved }: { playlistId?: string; onClose: () => void; onRemoved?: () => void }) {
  const playlists = usePlaylists();
  const { tracks } = useLibrary();
  const { theme } = useTheme();
  const styles = useThemeStyles(createStyles);
  const playlist = playlists.playlists.find((item) => item.id === playlistId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setEditing(false); setError(null); onClose(); };
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await action(); close(); } catch (error) { setError(error instanceof Error ? error.message : 'Could not update this playlist.'); }
    finally { setBusy(false); }
  };
  return <BottomSheet visible={!!playlist} title={editing ? 'Edit playlist' : playlist?.name ?? 'Playlist'} onClose={close}>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {editing ? <><TextInput autoFocus accessibilityLabel="Playlist name" value={name} onChangeText={setName} maxLength={80} placeholder="Playlist name" placeholderTextColor={theme.colors.muted} selectionColor={theme.colors.accent} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Save playlist name" disabled={busy || !name.trim()} onPress={() => { if (playlist) void run(() => playlists.rename(playlist.id, name)); }} style={styles.save}><Text style={styles.saveText}>Save</Text></Pressable></> : playlist && <>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit playlist" disabled={busy} style={styles.row} onPress={() => { setName(playlist.name); setEditing(true); }}><Ionicons name="create-outline" size={theme.size.icon} color={theme.colors.text} /><Text style={styles.label}>Edit</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Share playlist" disabled={busy} style={styles.row} onPress={() => { void run(() => Share.share({ message: `${playlist.name}\n${playlist.trackIds.map((id) => tracks.find((track) => track.id === id)).filter((track) => !!track).map((track) => `${track.title} — ${track.artist}`).join('\n')}` })); }}><Ionicons name="share-outline" size={theme.size.icon} color={theme.colors.text} /><Text style={styles.label}>Share</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Remove playlist" disabled={busy} style={styles.row} onPress={() => { void run(async () => { await playlists.remove(playlist.id); onRemoved?.(); }); }}><Ionicons name="trash-outline" size={theme.size.icon} color={theme.colors.error} /><Text style={[styles.label, { color: theme.colors.error }]}>Remove</Text></Pressable>
    </>}
  </BottomSheet>;
}
const createStyles = (theme: Theme) => ({
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.space.md, paddingVertical: theme.space.md },
  label: { ...theme.type.body, color: theme.colors.text },
  input: { ...theme.type.body, color: theme.colors.text, padding: theme.space.md, borderRadius: theme.radius.input, backgroundColor: theme.colors.recessed, outlineWidth: 0 },
  save: { alignItems: 'center' as const, padding: theme.space.md, marginTop: theme.space.md, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent },
  saveText: { ...theme.type.action, color: theme.colors.onAccent },
  error: { ...theme.type.caption, color: theme.colors.error },
});

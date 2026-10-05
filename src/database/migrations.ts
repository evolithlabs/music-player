// Bundled schema migrations keep installation and upgrades fully offline.
export const migrations = [{ version: 1, sql: `
CREATE TABLE IF NOT EXISTS songs (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, artist TEXT NOT NULL, album TEXT, uri TEXT NOT NULL, added_at INTEGER NOT NULL, file_state TEXT NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL, pinned INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS playlist_songs (playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE, song_id TEXT NOT NULL, position INTEGER NOT NULL, PRIMARY KEY (playlist_id, song_id));
CREATE TABLE IF NOT EXISTS listening_events (id TEXT PRIMARY KEY NOT NULL, song_id TEXT NOT NULL, started_at INTEGER NOT NULL, heard_seconds REAL NOT NULL, position REAL NOT NULL, completed INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS listening_song_date ON listening_events(song_id, started_at);
CREATE TABLE IF NOT EXISTS downloads (id TEXT PRIMARY KEY NOT NULL, service_url TEXT NOT NULL, status TEXT NOT NULL, transfer TEXT NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
` }, { version: 2, sql: 'ALTER TABLE playlists DROP COLUMN pinned;' }];

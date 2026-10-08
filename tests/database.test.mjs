import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';

import { migrations } from '../src/database/migrations.ts';
import { createRepository } from '../src/database/repository.ts';
import { migrateLegacy } from '../src/database/legacy.ts';
import * as schema from '../src/database/schema.ts';
import { listenedSeconds } from '../src/utils/listening.ts';
import { catalogIdentity, matchesCatalog } from '../src/utils/catalog.ts';

function open(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys = ON');
  const version = sqlite.prepare('PRAGMA user_version').get().user_version;
  for (const migration of migrations) if (migration.version > version) {
    sqlite.exec(`BEGIN; ${migration.sql} PRAGMA user_version = ${migration.version}; COMMIT;`);
  }
  // Exercise the production Drizzle repository against real SQLite using Expo's statement contract.
  const client = { prepareSync(sql) {
    const statement = sqlite.prepare(sql);
    return {
      executeSync(params) {
        if (statement.columns().length) { const rows = statement.all(...params); return { getAllSync: () => rows, getFirstSync: () => rows[0] }; }
        const result = statement.run(...params); return { ...result, lastInsertRowId: result.lastInsertRowid };
      },
      executeForRawResultSync(params) { statement.setReturnArrays(true); const rows = statement.all(...params); return { getAllSync: () => rows }; },
    };
  } };
  return { db: createRepository(drizzle(client, { schema })), close: () => sqlite.close() };
}
const song = { id: 'song', title: 'The Search', artist: 'NF', album: 'The Search', uri: 'song.mp3', origin: 'local', addedAt: 1, deezerId: 716493312 };

test('removing playlist pinning preserves existing playlists and ordered songs on upgrade', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'groovio-upgrade-'));
  const path = join(directory, 'groovio.db');
  const previous = new DatabaseSync(path);
  previous.exec(migrations[0].sql);
  previous.exec("INSERT INTO playlists VALUES ('mix', 'Mix', 2, 1); INSERT INTO playlist_songs VALUES ('mix', 'second', 1), ('mix', 'first', 0); PRAGMA user_version = 1;");
  previous.close();
  let connection = open(path);
  try {
    assert.deepEqual(await connection.db.getPlaylists(), [{ id: 'mix', name: 'Mix', createdAt: 2, trackIds: ['first', 'second'] }]);
    await connection.db.savePlaylists([{ id: 'mix', name: 'Renamed', createdAt: 2, trackIds: ['second', 'first'] }]);
    connection.close(); connection = open(path);
    assert.deepEqual(await connection.db.getPlaylists(), [{ id: 'mix', name: 'Renamed', createdAt: 2, trackIds: ['second', 'first'] }]);
  } finally { connection.close(); rmSync(directory, { recursive: true }); }
});

test('playlist removal persists, removes its links, and preserves songs and other playlists', async () => {
  const { db, close } = open();
  try {
    await db.saveSongs([song]);
    await db.savePlaylists([{ id: 'remove', name: 'Remove', createdAt: 1, trackIds: ['song'] }, { id: 'keep', name: 'Keep', createdAt: 2, trackIds: ['song'] }]);
    await db.removePlaylist('remove');
    assert.deepEqual((await db.getPlaylists()).map((item) => item.id), ['keep']);
    assert.deepEqual((await db.getPlaylists())[0].trackIds, ['song']);
    assert.equal((await db.getSongs()).length, 1);
    await db.savePlaylists([{ id: 'remove', name: 'Recreated', createdAt: 3, trackIds: [] }]);
    assert.deepEqual((await db.getPlaylists()).find((item) => item.id === 'remove').trackIds, []);
  } finally { close(); }
});

test('song removal persists with playlist cleanup, preserves other songs and listening totals', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'groovio-remove-'));
  const path = join(directory, 'groovio.db');
  let connection = open(path);
  try {
    await connection.db.saveSongs([song, { ...song, id: 'keep' }]);
    await connection.db.savePlaylists([{ id: 'mix', name: 'Mix', createdAt: 1, trackIds: ['song', 'keep'] }]);
    await connection.db.saveListeningEvent({ id: 'session', songId: 'song', startedAt: 1, heardSeconds: 20, position: 20, completed: false });
    await connection.db.saveDownloads([
      { serviceUrl: 'one', transfer: 'saved', job: { id: 'remove', status: 'completed' } },
      { serviceUrl: 'two', transfer: 'saved', job: { id: 'remove', status: 'completed' } },
      { serviceUrl: 'one', transfer: 'pending', job: { id: 'keep', status: 'queued' } },
    ]);
    await connection.db.removeSong('song');
    await connection.db.removeDownloads('remove');
    connection.close(); connection = open(path);
    assert.deepEqual((await connection.db.getSongs()).map((item) => item.id), ['keep']);
    assert.deepEqual((await connection.db.getPlaylists())[0].trackIds, ['keep']);
    assert.deepEqual((await connection.db.getDownloads()).map((entry) => entry.job.id), ['keep']);
    assert.equal((await connection.db.getListeningStats()).heardSeconds, 20);
  } finally { connection.close(); rmSync(directory, { recursive: true }); }
});

test('songs, playlist order, download status and preferences survive database reopen', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'groovio-db-'));
  const path = join(directory, 'groovio.db');
  let connection = open(path);
  try {
    await connection.db.saveSongs([song]);
    await connection.db.savePlaylists([{ id: 'mix', name: 'Mix', createdAt: 2, trackIds: ['missing-song', 'song', 'song'] }]);
    await connection.db.saveDownloads([{ serviceUrl: 'http://localhost:8090', transfer: 'pending', job: { id: 'job', status: 'queued' } }]);
    await connection.db.setSetting('theme', 'charcoal');
    connection.close(); connection = open(path);
    assert.equal((await connection.db.getSongs())[0].deezerId, song.deezerId);
    assert.deepEqual((await connection.db.getPlaylists())[0].trackIds, ['missing-song', 'song']);
    assert.equal((await connection.db.getDownloads())[0].job.status, 'queued');
    assert.equal(await connection.db.getSetting('theme'), 'charcoal');
    await connection.db.saveSongs([{ ...song, fileState: 'missing' }]);
    assert.equal((await connection.db.getSongs())[0].fileState, 'missing');
    assert.equal((await connection.db.getPlaylists())[0].trackIds.length, 2);
  } finally { connection.close(); rmSync(directory, { recursive: true }); }
});
test('failed playlist replacement rolls back links and metadata atomically', async () => {
  const { db, close } = open();
  try {
    await db.savePlaylists([{ id: 'mix', name: 'Mix', createdAt: 1, trackIds: ['song'] }]);
    await assert.rejects(() => db.savePlaylists([{ id: 'mix', name: 'Broken', createdAt: 1, trackIds: [null] }]));
    assert.equal((await db.getPlaylists())[0].name, 'Mix');
    assert.deepEqual((await db.getPlaylists())[0].trackIds, ['song']);
  } finally { close(); }
});
test('session updates are idempotent and keep completed status and listening totals', async () => {
  const { db, close } = open();
  try {
    const event = { id: 'session', songId: 'song', startedAt: 10, heardSeconds: 12, position: 12, completed: false };
    await db.saveListeningEvent(event);
    await db.saveListeningEvent({ ...event, heardSeconds: 30, completed: true });
    await db.saveListeningEvent(event);
    await db.saveListeningEvent({ ...event, id: 'new-session', songId: 'new-song', startedAt: 20, heardSeconds: 5 });
    assert.deepEqual(await db.getListeningStats(), { plays: 2, heardSeconds: 35, completed: 1 });
    assert.deepEqual(await db.getRecentSongIds(), ['new-song', 'song']);
  } finally { close(); }
});
test('legacy library and history migration preserves data and runs once', async () => {
  const { db, close } = open();
  const records = new Map([
    ['music-player.library.v1', JSON.stringify([song])],
    ['groovio.playlists.v1', JSON.stringify([{ id: 'mix', name: 'Mix', createdAt: 1, trackIds: ['song'] }])],
    ['groovio.recently-played.v1', JSON.stringify(['song', 'song'])],
    ['music-player.theme.v1', 'charcoal'],
  ]);
  const storage = { async getAllKeys() { return [...records.keys()]; }, async multiGet(keys) { return keys.map((key) => [key, records.get(key)]); } };
  try {
    await migrateLegacy(db, storage); await migrateLegacy(db, storage);
    assert.equal((await db.getSongs()).length, 1);
    assert.equal((await db.getPlaylists())[0].trackIds[0], 'song');
    assert.equal((await db.getListeningStats()).plays, 0);
    assert.deepEqual(await db.getRecentSongIds(), ['song']);
    assert.equal(await db.getSetting('music-player.theme.v1'), 'charcoal');
    assert.equal(records.size, 4);
  } finally { close(); }
});
test('seeks and paused or buffered intervals do not inflate listening time', () => {
  const previous = { position: 10, sampledAt: 1000, playing: true };
  assert.equal(listenedSeconds(previous, { position: 10.25, sampledAt: 1250, playing: true }), 0.25);
  assert.equal(listenedSeconds(previous, { position: 80, sampledAt: 1250, playing: true }), 0);
  assert.equal(listenedSeconds(previous, { position: 2, sampledAt: 1250, playing: true }), 0);
  assert.equal(listenedSeconds(previous, { position: 10.25, sampledAt: 1250, playing: false }), 0);
});
test('an interrupted legacy migration retains its source and retries without duplicate songs', async () => {
  const { db, close } = open();
  const records = new Map([['music-player.library.v1', JSON.stringify([song])], ['groovio.playlists.v1', '{broken-json']]);
  const storage = { async getAllKeys() { return [...records.keys()]; }, async multiGet(keys) { return keys.map((key) => [key, records.get(key)]); } };
  try {
    await assert.rejects(() => migrateLegacy(db, storage));
    assert.equal(await db.getSetting('legacy-migrated.v1'), null);
    assert.equal(records.get('groovio.playlists.v1'), '{broken-json');
    records.set('groovio.playlists.v1', '[]');
    await migrateLegacy(db, storage);
    assert.equal((await db.getSongs()).length, 1);
    assert.equal(await db.getSetting('legacy-migrated.v1'), '1');
  } finally { close(); }
});
test('unresolved Deezer results have distinct IDs and never match empty MusicBrainz IDs', () => {
  const one = { deezerId: 1, recordingId: '' }, two = { deezerId: 2, recordingId: '' };
  assert.notEqual(catalogIdentity(one), catalogIdentity(two));
  assert.equal(matchesCatalog({ catalog: { id: '' } }, one), false);
  assert.equal(matchesCatalog({ deezerId: 1 }, one), true);
  assert.equal(matchesCatalog({ deezerId: 1 }, two), false);
});

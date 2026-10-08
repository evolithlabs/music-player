import assert from 'node:assert/strict';
import test from 'node:test';

import { createBrowserFiles } from '../src/services/browser-files.ts';

function storage() {
  const data = new Map();
  return { data, async getFile(key) { return data.get(key); }, async saveFile(key, blob) { data.set(key, blob); }, async removeFile(key) { data.delete(key); } };
}

test('downloaded audio persists as a stable key and plays after reopening without the service', async () => {
  const db = storage();
  let calls = 0;
  const files = createBrowserFiles(db, async () => { calls++; return new Response('audio fixture', { headers: { 'Content-Type': 'audio/mpeg' } }); });
  const uri = await files.download('song.mp3', 'http://service/song', true);
  assert.equal(await (await fetch(uri)).text(), 'audio fixture');
  const storedUri = files.storedUri(uri);
  assert.equal(storedUri, 'groovio-file:song.mp3');
  assert.equal(await files.download('song.mp3', 'http://service/song', true), uri);
  assert.equal(calls, 1);

  const reopened = createBrowserFiles(db, async () => { throw new Error('Service offline'); });
  const restored = await reopened.resolve(storedUri);
  assert.equal(restored.exists, true);
  assert.notEqual(restored.uri, uri);
  assert.equal(await (await fetch(restored.uri)).text(), 'audio fixture');
  assert.equal(await reopened.download('song.mp3', 'http://service/song', true), restored.uri);
  URL.revokeObjectURL(uri); URL.revokeObjectURL(restored.uri);
});

test('removing audio deletes its stored bytes and cached URL, and allows downloading again', async () => {
  const db = storage();
  const files = createBrowserFiles(db, async () => new Response('audio fixture'));
  const uri = await files.download('song.mp3', 'http://service/song');
  await files.remove(uri);
  assert.equal(db.data.size, 0);
  assert.equal((await files.resolve('groovio-file:song.mp3')).exists, false);
  await assert.rejects(() => fetch(uri));
  const restored = await files.download('song.mp3', 'http://service/song');
  assert.notEqual(restored, uri);
  await files.remove('groovio-file:song.mp3');
  assert.equal(db.data.size, 0);
});

test('failed, empty and non-audio responses never enter offline storage', async () => {
  for (const response of [new Response('Backend error', { status: 500 }), new Response('', { headers: { 'Content-Type': 'audio/mpeg' } }), new Response('{"error":"missing"}', { headers: { 'Content-Type': 'application/json' } })]) {
    const db = storage();
    const files = createBrowserFiles(db, async () => response);
    await assert.rejects(() => files.download('song.mp3', 'http://service/song', true));
    assert.equal(db.data.size, 0);
    assert.equal((await files.resolve('groovio-file:song.mp3')).exists, false);
  }
});

test('storage failures remain retryable instead of returning a temporary playback URL', async () => {
  const db = storage();
  let full = true;
  const files = createBrowserFiles({ ...db, async saveFile(key, blob) { if (full) throw new Error('Storage full'); await db.saveFile(key, blob); } }, async () => new Response('audio fixture', { headers: { 'Content-Type': 'audio/mpeg' } }));
  await assert.rejects(() => files.download('song.mp3', 'http://service/song', true), /Storage full/);
  assert.equal(db.data.size, 0);
  full = false;
  const uri = await files.download('song.mp3', 'http://service/song', true);
  assert.equal(db.data.size, 1);
  URL.revokeObjectURL(uri);
});

test('missing browser files and expired blob URLs are unavailable while external audio remains playable', async () => {
  const files = createBrowserFiles(storage());
  assert.deepEqual(await files.resolve('groovio-file:missing.mp3'), { uri: 'groovio-file:missing.mp3', exists: false });
  assert.equal((await files.resolve('blob:http://localhost/expired')).exists, false);
  assert.equal((await files.resolve('https://example.com/audio.mp3')).exists, true);
});

test('streamed downloads report received bytes and persist the complete audio only', async () => {
  const db = storage();
  const readings = [];
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4, 5, 6, 7, 8]));
      controller.close();
    },
  }), { headers: { 'Content-Length': '8', 'Content-Type': 'audio/mpeg' } });
  const files = createBrowserFiles(db, async () => response);
  const uri = await files.download('song.mp3', 'http://service/song', true, (value) => readings.push(value));
  assert.deepEqual(readings, [0, 25, 100]);
  assert.equal(db.data.get('song.mp3').size, 8);
  URL.revokeObjectURL(uri);
});

test('unknown file sizes stay indeterminate and interrupted streams never save partial audio', async () => {
  const db = storage();
  const readings = [];
  const response = new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array([1, 2])); },
    pull(controller) { controller.error(new Error('Connection lost')); },
  }), { headers: { 'Content-Type': 'audio/mpeg' } });
  const files = createBrowserFiles(db, async () => response);
  await assert.rejects(() => files.download('song.mp3', 'http://service/song', true, (value) => readings.push(value)), /Connection lost/);
  assert.ok(readings.length > 0 && readings.every((value) => value === null));
  assert.equal(db.data.size, 0);
});

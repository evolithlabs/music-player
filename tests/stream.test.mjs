import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareStream } from '../src/services/stream.ts';

const catalog = { recordingId: '', deezerId: 12, title: 'Song', artist: 'Artist', durationMs: 120000, coverUrl: 'https://cover.test/song.jpg' };
const job = (status) => ({ id: 'abcdefghijklmno', status, metadata: catalog });

test('play prepares server audio and returns a remote source without any offline storage', async () => {
  const stages = [];
  let polls = 0;
  const api = { async queueTrack() { return job('queued'); }, async getDownloadJob() { return job(++polls === 1 ? 'downloading' : 'completed'); } };
  const track = await prepareStream(api, 'http://service', catalog, new AbortController().signal, (job) => stages.push(job.status), 1);
  assert.deepEqual(stages, ['queued', 'downloading', 'completed']);
  assert.equal(track.uri, 'http://service/api/downloads/abcdefghijklmno/file');
  assert.equal(track.stream.serviceUrl, 'http://service');
  assert.equal(track.addedAt, undefined);
  assert.equal(track.artworkUri, catalog.coverUrl);
});

test('cached audio plays without polling, and backend failures remain retryable', async () => {
  const api = { async queueTrack() { return job('completed'); }, async getDownloadJob() { throw new Error('Unexpected poll'); } };
  assert.ok((await prepareStream(api, 'http://service', catalog, new AbortController().signal, () => {})).stream);
  await assert.rejects(() => prepareStream({ ...api, async queueTrack() { return { ...job('failed'), error: 'No audio found' }; } }, 'http://service', catalog, new AbortController().signal, () => {}), /No audio found/);
});

test('changing song cancels preparation before it can start stale playback', async () => {
  const controller = new AbortController();
  let polls = 0;
  const api = { async queueTrack() { return job('queued'); }, async getDownloadJob() { polls++; return job('completed'); } };
  await assert.rejects(() => prepareStream(api, 'http://service', catalog, controller.signal, () => controller.abort(), 1), /cancelled/);
  assert.equal(polls, 0);
});

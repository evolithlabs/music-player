import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePlaybackSession, restorePlaybackSession } from '../src/utils/playback-session.ts';

const session = { trackId: 'b', position: 42, queueIds: ['a', 'b', 'c'], historyIds: ['a'], shuffle: true, repeat: 'all' };
const tracks = [{ id: 'a', durationMs: 60000 }, { id: 'b', durationMs: 90000 }, { id: 'c', fileState: 'missing' }];

test('playback restores position, collection order, previous songs and playback settings', () => {
  assert.deepEqual(parsePlaybackSession(JSON.stringify(session)), session);
  assert.deepEqual(restorePlaybackSession(session, tracks), { ...session, queueIds: ['a', 'b'] });
  const restored = restorePlaybackSession({ ...session, trackId: 'a', position: 120, historyIds: ['c', 'b'] }, tracks);
  assert.equal(restored.position, 60);
  assert.deepEqual(restored.historyIds, ['b']);
  assert.equal(restorePlaybackSession({ ...session, queueIds: null }, tracks).queueIds, null);
});

test('unavailable songs and invalid sessions never restore unusable playback', () => {
  assert.equal(restorePlaybackSession({ ...session, trackId: 'c' }, tracks), null);
  assert.equal(restorePlaybackSession(session, []), null);
  assert.equal(parsePlaybackSession('{bad'), null);
  assert.equal(parsePlaybackSession(JSON.stringify({ ...session, position: null })), null);
  const restored = parsePlaybackSession(JSON.stringify({ ...session, position: -2, queueIds: ['a', null, 'a'], repeat: 'invalid' }));
  assert.equal(restored.position, 0);
  assert.deepEqual(restored.queueIds, ['a']);
  assert.equal(restored.repeat, 'off');
});

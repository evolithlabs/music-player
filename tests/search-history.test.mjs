import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeSearchHistory, parseSearchHistory } from '../src/utils/search-history.ts';

const song = (deezerId) => ({ catalog: { recordingId: '', deezerId, title: `Song ${deezerId}`, artist: 'Artist', durationMs: 1000 } });

test('recent search songs retain newest order, distinct recordings and a bounded history', () => {
  const previous = Array.from({ length: 20 }, (_, index) => song(index + 1));
  const recent = mergeSearchHistory([song(3), song(21), song(3)], previous);
  assert.equal(recent.length, 20);
  assert.deepEqual(recent.slice(0, 4).map((item) => item.catalog.deezerId), [3, 21, 1, 2]);
  assert.deepEqual(mergeSearchHistory([{ trackId: 'local' }], [{ trackId: 'local' }, song(1)]), [{ trackId: 'local' }, song(1)]);
  assert.equal(mergeSearchHistory([{ catalog: { recordingId: 'same', releaseId: 'a' } }, { catalog: { recordingId: 'same', releaseId: 'b' } }], []).length, 2);
});

test('recent search songs round trip through storage and ignore malformed entries', () => {
  const recent = [song(1), { trackId: 'local' }];
  assert.deepEqual(parseSearchHistory(JSON.stringify(recent)), recent);
  assert.deepEqual(parseSearchHistory(JSON.stringify([null, {}, { catalog: {} }, ...recent])), recent);
  assert.deepEqual(parseSearchHistory('{bad'), []);
  assert.deepEqual(parseSearchHistory('{}'), []);
  assert.deepEqual(parseSearchHistory(null), []);
});

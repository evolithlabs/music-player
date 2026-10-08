import assert from 'node:assert/strict';
import test from 'node:test';

import { mergePlaylistHistory, parsePlaylistHistory } from '../src/utils/playlist-history.ts';

test('playlist history keeps the most recent play first, without duplicate cards', () => {
  assert.deepEqual(mergePlaylistHistory(['b'], ['a', 'b', 'c']), ['b', 'a', 'c']);
  assert.deepEqual(mergePlaylistHistory(['new'], ['saved', 'new']), ['new', 'saved']);
  assert.equal(mergePlaylistHistory(['new'], Array.from({ length: 40 }, (_, index) => String(index))).length, 30);
});

test('saved playlist history preserves order and safely handles invalid data', () => {
  assert.deepEqual(parsePlaylistHistory('["b",null,"a","b",3,""]'), ['b', 'a']);
  for (const value of [null, '{bad', '{}', 'null']) assert.deepEqual(parsePlaylistHistory(value), []);
});

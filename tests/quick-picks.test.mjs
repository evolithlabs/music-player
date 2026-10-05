import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSelections, rankQuickPicks, selectionWindow } from '../src/utils/quick-picks.ts';

test('Quick Picks ranks direct selections by frequency, then recency, over a rolling two weeks', () => {
  const now = selectionWindow * 3;
  const events = [{ songId: 'old', selectedAt: now - selectionWindow - 1 }, { songId: 'frequent', selectedAt: now - 1000 }, { songId: 'recent', selectedAt: now - 1 }, { songId: 'frequent', selectedAt: now - 2000 }, { songId: 'older-tie', selectedAt: now - 10 }];
  assert.deepEqual(rankQuickPicks(events, now), ['frequent', 'recent', 'older-tie']);
  assert.deepEqual(rankQuickPicks(events, now + selectionWindow + 1), []);
});
test('direct selections survive storage and reject invalid or future timestamps', () => {
  const now = selectionWindow * 2;
  const event = { songId: 'song', selectedAt: now };
  assert.deepEqual(parseSelections(JSON.stringify([event, null, { songId: 1, selectedAt: now }, { songId: 'future', selectedAt: now + 1 }]), now), [event]);
  assert.deepEqual(parseSelections('broken', now), []);
});

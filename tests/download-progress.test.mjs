import assert from 'node:assert/strict';
import test from 'node:test';

import { downloadPercent, downloadStatus, failedDownloadCount, pendingDownloadCount } from '../src/utils/downloads.ts';

test('download rows show measured percentages and leave unmeasured stages indeterminate', () => {
  const entry = { transfer: 'pending', job: { status: 'queued' } };
  assert.equal(downloadStatus(entry).compact, null);
  assert.equal(downloadStatus(entry).description, 'Queued for download');
  entry.job.status = 'resolving';
  assert.equal(downloadStatus(entry).compact, null);
  assert.equal(downloadStatus(entry).description, 'Finding song metadata');
  entry.job.status = 'downloading';
  assert.equal(downloadStatus(entry).compact, null);
  entry.job.progress = 0;
  assert.equal(downloadStatus(entry).compact, '0%');
  entry.job.progress = 47.9;
  assert.equal(downloadStatus(entry).compact, '47%');
  entry.job.stage = 'processing';
  entry.job.progress = 100;
  assert.equal(downloadStatus(entry).compact, null);
  assert.equal(downloadStatus(entry).description, 'Preparing audio');
  entry.job.status = 'completed';
  assert.equal(downloadStatus(entry).compact, null);
  entry.transferProgress = 12;
  assert.equal(downloadStatus(entry).compact, '12%');
  assert.match(downloadStatus(entry).description, /Saving to your device/);
  entry.transfer = 'saved';
  assert.equal(downloadStatus(entry), null);
  entry.transfer = 'failed';
  assert.equal(downloadStatus(entry), null);
  entry.transfer = 'pending'; entry.job.status = 'failed';
  assert.equal(downloadStatus(entry), null);
});

test('stage percentages stay within bounds for both service and device progress', () => {
  for (const status of ['downloading', 'completed']) {
    for (const [progress, expected] of [[-10, '0%'], [47.9, '47%'], [120, '100%'], [NaN, null], [Infinity, null]]) {
      const entry = { transfer: 'pending', transferProgress: progress, job: { status, progress } };
      assert.equal(downloadStatus(entry).compact, expected);
    }
  }
});

test('download badge counts active transfers and failed jobs separately without double counting', () => {
  const entries = [
    { transfer: 'pending', job: { status: 'queued' } },
    { transfer: 'pending', job: { status: 'downloading' } },
    { transfer: 'pending', job: { status: 'completed' } },
    { transfer: 'pending', job: { status: 'failed' } },
    { transfer: 'failed', job: { status: 'completed' } },
    { transfer: 'failed', job: { status: 'failed' } },
    { transfer: 'saved', job: { status: 'completed' } },
  ];
  assert.equal(pendingDownloadCount(entries), 3);
  assert.equal(failedDownloadCount(entries), 3);
  assert.equal(failedDownloadCount(entries.slice(0, 3)), 0);
  assert.equal(pendingDownloadCount([]), 0);
  assert.equal(failedDownloadCount([]), 0);
});

test('download percentages never invent a total or exceed valid bounds', () => {
  assert.equal(downloadPercent(1, 4), 25);
  assert.equal(downloadPercent(1, 3), 33);
  assert.equal(downloadPercent(10, 4), 100);
  assert.equal(downloadPercent(-1, 4), 0);
  for (const total of [0, -1, NaN, Infinity]) assert.equal(downloadPercent(1, total), null);
  assert.equal(downloadPercent(NaN, 4), null);
});

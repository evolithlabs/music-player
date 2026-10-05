export function pendingDownloadCount(entries: readonly { transfer: string; job: { status: string } }[]) {
  return entries.filter((entry) => entry.transfer === 'pending' && entry.job.status !== 'failed').length;
}

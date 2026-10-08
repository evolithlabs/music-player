export function pendingDownloadCount(entries: readonly { transfer: string; job: { status: string } }[]) {
  return entries.filter((entry) => entry.transfer === 'pending' && entry.job.status !== 'failed').length;
}

export function failedDownloadCount(entries: readonly { transfer: string; job: { status: string } }[]) {
  return entries.filter((entry) => entry.transfer === 'failed' || entry.job.status === 'failed').length;
}

export function downloadPercent(received: number, total: number): number | null {
  return Number.isFinite(received) && Number.isFinite(total) && total > 0 ? Math.max(0, Math.min(100, Math.floor(received / total * 100))) : null;
}

export function downloadStatus(entry: { transfer: string; transferProgress?: number | null; job: { status: string; progress?: number; stage?: string } }) {
  if (entry.transfer !== 'pending' || entry.job.status === 'failed') return null;
  if (entry.job.status === 'queued') return { compact: null, description: 'Queued for download' };
  if (entry.job.status === 'resolving') return { compact: null, description: 'Finding song metadata' };
  if (entry.job.status === 'completed') {
    const percent = entry.transferProgress;
    if (typeof percent !== 'number' || !Number.isFinite(percent)) return { compact: null, description: 'Saving to your device' };
    const value = Math.max(0, Math.min(100, Math.floor(percent)));
    return { compact: `${value}%`, description: `Saving to your device · ${value}%` };
  }
  if (entry.job.stage === 'processing') return { compact: null, description: 'Preparing audio' };
  const percent = entry.job.progress;
  if (typeof percent === 'number' && Number.isFinite(percent)) {
    const value = Math.max(0, Math.min(100, Math.floor(percent)));
    return { compact: `${value}%`, description: `Downloading audio · ${value}%` };
  }
  return { compact: null, description: 'Starting audio download' };
}

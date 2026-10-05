export type SleepTimer = { mode: 'off' } | { mode: 'time'; deadline: number; minutes: number } | { mode: 'end' };

export function sleepTimerExpired(timer: SleepTimer, now: number) {
  return timer.mode === 'time' && now >= timer.deadline;
}

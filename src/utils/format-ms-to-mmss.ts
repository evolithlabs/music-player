export const formatMsToMMSS = (milliseconds: number): string => {
  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const paddedSeconds = seconds.toString().padStart(2, '0');

  return `${minutes}:${paddedSeconds}`;
};

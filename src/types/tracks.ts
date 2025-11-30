export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  coverPath: string;
  year: number;
  duration: number; // duration in seconds
  path: string;
}

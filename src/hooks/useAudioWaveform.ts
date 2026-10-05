import { AudioPlayer, getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SharedValue } from 'react-native-reanimated';

import { samplePeaks } from '../utils/waveform';

export function useAudioWaveform(player: AudioPlayer, playing: boolean, bars: number, peaks: SharedValue<number[]>) {
  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    let lastSample = 0;
    let subscription: { remove(): void } | undefined;
    async function listen() {
      // Android's output visualizer requires this permission; no microphone is recorded.
      if (Platform.OS === 'android') {
        const permission = await getRecordingPermissionsAsync();
        if (!permission.granted && !(await requestRecordingPermissionsAsync()).granted) return;
      }
      // Web reports support only after its analyser has been enabled.
      if (cancelled || (Platform.OS !== 'web' && !player.isAudioSamplingSupported)) return;
      subscription = player.addListener('audioSampleUpdate', (sample) => {
        const now = Date.now();
        if (cancelled || now - lastSample < 60) return;
        lastSample = now;
        peaks.value = samplePeaks(sample.channels, bars);
      });
      player.setAudioSamplingEnabled(true);
    }
    void listen().catch(() => { /* Keep the resting waveform if sampling is unavailable. */ });
    return () => {
      cancelled = true;
      subscription?.remove();
      try { player.setAudioSamplingEnabled(false); } catch { /* The player may already be released. */ }
    };
  }, [player, playing, bars, peaks]);
}

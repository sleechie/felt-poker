import { useCallback, useEffect } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

export type GameSound = 'card' | 'chips' | 'fold' | 'win';

export function useGameSounds(enabled: boolean) {
  const card = useAudioPlayer(require('../../assets/sounds/card.wav'));
  const chips = useAudioPlayer(require('../../assets/sounds/chips.wav'));
  const fold = useAudioPlayer(require('../../assets/sounds/fold.wav'));
  const win = useAudioPlayer(require('../../assets/sounds/win.wav'));

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    card.volume = 0.8;
    chips.volume = 0.9;
    fold.volume = 0.7;
    win.volume = 0.85;
  }, [card, chips, fold, win]);

  return useCallback((sound: GameSound) => {
    if (!enabled) return;
    const player = { card, chips, fold, win }[sound];
    player.seekTo(0).then(() => player.play()).catch(() => undefined);
  }, [card, chips, enabled, fold, win]);
}


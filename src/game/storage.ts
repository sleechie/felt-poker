import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from './types';

const GAME_KEY = 'felt.game.v1';
const SETTINGS_KEY = 'felt.settings.v1';

export interface SavedSettings {
  soundOn: boolean;
  showOdds: boolean;
}

function looksLikeGame(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GameState>;
  return Array.isArray(candidate.players)
    && candidate.players.length === 4
    && Array.isArray(candidate.board)
    && Array.isArray(candidate.deck)
    && typeof candidate.handNumber === 'number'
    && typeof candidate.phase === 'string';
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!looksLikeGame(parsed)) return null;
    return {
      ...parsed,
      stats: {
        handsPlayed: parsed.stats?.handsPlayed ?? 0,
        handsWon: parsed.stats?.handsWon ?? 0,
        biggestPot: parsed.stats?.biggestPot ?? 0,
        heroFacedBets: parsed.stats?.heroFacedBets ?? 0,
        heroFolds: parsed.stats?.heroFolds ?? 0,
        heroCalls: parsed.stats?.heroCalls ?? 0,
        heroRaises: parsed.stats?.heroRaises ?? 0,
      },
    };
  } catch {
    return null;
  }
}

export async function saveGame(game: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(GAME_KEY, JSON.stringify(game));
  } catch {
    // A failed save should never interrupt a hand.
  }
}

export async function loadSettings(): Promise<SavedSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedSettings>;
    if (typeof parsed.soundOn !== 'boolean' || typeof parsed.showOdds !== 'boolean') return null;
    return { soundOn: parsed.soundOn, showOdds: parsed.showOdds };
  } catch {
    return null;
  }
}

export async function saveSettings(settings: SavedSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings persistence is best effort.
  }
}

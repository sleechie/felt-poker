export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type GamePhase = 'betting' | 'complete' | 'matchComplete';
export type ActionType = 'fold' | 'check' | 'call' | 'raise';

export interface BotPersona {
  aggression: number;
  bluff: number;
  patience: number;
  volatility: number;
  color: string;
}

export interface PlayerState {
  id: string;
  name: string;
  isHuman: boolean;
  chips: number;
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  streetBet: number;
  committed: number;
  lastAction?: string;
  persona?: BotPersona;
}

export interface PokerAction {
  type: ActionType;
  /** The player's total bet on this street after raising. */
  amount?: number;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  callAmount: number;
  minRaiseTo: number;
  maxRaiseTo: number;
}

export interface HandResult {
  title: string;
  detail: string;
  winnerIds: string[];
  payouts: Record<string, number>;
  pot: number;
}

export interface MatchStats {
  handsPlayed: number;
  handsWon: number;
  biggestPot: number;
  heroFacedBets: number;
  heroFolds: number;
  heroCalls: number;
  heroRaises: number;
}

export interface GameState {
  players: PlayerState[];
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  activePlayerIndex: number | null;
  street: Street;
  phase: GamePhase;
  board: Card[];
  deck: Card[];
  currentBet: number;
  minRaise: number;
  pendingPlayerIds: string[];
  actedSinceFullRaise: string[];
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  message: string;
  lastActionId: number;
  lastAggressorId?: string;
  result?: HandResult;
  stats: MatchStats;
}

export interface HandValue {
  category: number;
  categoryName: string;
  score: number[];
  cards: Card[];
  description: string;
}

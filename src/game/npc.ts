import { estimateEquity } from './equity';
import { getLegalActions, potSize } from './engine';
import { GameState, PokerAction } from './types';

export interface BotDecision {
  action: PokerAction;
  equity: number;
  potOdds: number;
  reason: string;
}

function roundToFive(amount: number): number {
  return Math.max(5, Math.round(amount / 5) * 5);
}

export function decideBotAction(
  state: GameState,
  playerId: string,
  rng: () => number = Math.random,
): BotDecision {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.isHuman || !player.persona) throw new Error('Bot player required');
  const legal = getLegalActions(state, playerId);
  const opponentCount = state.players.filter((candidate) => candidate.id !== playerId && !candidate.folded && (candidate.chips > 0 || candidate.committed > 0)).length;
  const sampleCount = state.street === 'preflop' ? 240 : 320;
  const { equity } = estimateEquity(player.hole, state.board, opponentCount, sampleCount, rng);
  const pot = potSize(state);
  const potOdds = legal.callAmount > 0 ? legal.callAmount / (pot + legal.callAmount) : 0;
  const { aggression, bluff, patience, volatility } = player.persona;
  const observedFoldRate = (state.stats.heroFolds + 2) / (state.stats.heroFacedBets + 6);
  const observedRaiseRate = (state.stats.heroRaises + 2) / (state.stats.heroRaises + state.stats.heroCalls + 10);
  const heroIsAggressor = state.lastAggressorId === 'hero';
  const noise = (rng() - 0.5) * volatility * 0.18;
  const rangeAdjustment = heroIsAggressor ? (observedRaiseRate - 0.2) * -0.16 : 0;
  const adjustedEquity = equity + noise + rangeAdjustment;
  const pressure = legal.callAmount / Math.max(1, player.chips + legal.callAmount);

  const raiseTo = (fraction: number): PokerAction => ({
    type: 'raise',
    amount: Math.min(
      legal.maxRaiseTo,
      Math.max(legal.minRaiseTo, state.currentBet + roundToFive(Math.max(state.bigBlind, pot * fraction))),
    ),
  });

  if (legal.canCheck) {
    if (legal.canRaise && adjustedEquity > 0.72 - aggression * 0.12) {
      return { action: raiseTo(0.7 + aggression * 0.35), equity, potOdds, reason: 'value bet' };
    }
    if (legal.canRaise && adjustedEquity > 0.48 && rng() < 0.25 + aggression * 0.42) {
      return { action: raiseTo(0.38 + aggression * 0.25), equity, potOdds, reason: 'thin value' };
    }
    // Tight players get pressured more; frequent callers get thinner value bets instead.
    const bluffChance = bluff * (0.55 + observedFoldRate * 1.35) * (1 - adjustedEquity) * (state.street === 'river' ? 1.3 : 0.75);
    if (legal.canRaise && rng() < bluffChance) {
      return { action: raiseTo(0.55 + aggression * 0.3), equity, potOdds, reason: 'balanced bluff' };
    }
    return { action: { type: 'check' }, equity, potOdds, reason: 'pot control' };
  }

  const margin = adjustedEquity - potOdds;
  const foldThreshold = -0.04 - (1 - patience) * 0.06 + pressure * 0.08;
  if (legal.canFold && margin < foldThreshold && rng() > bluff * 0.35) {
    return { action: { type: 'fold' }, equity, potOdds, reason: 'price is too high' };
  }
  if (legal.canRaise && adjustedEquity > 0.76 - aggression * 0.1 && rng() < 0.52 + aggression * 0.4) {
    return { action: raiseTo(0.75 + aggression * 0.45), equity, potOdds, reason: 'strong value raise' };
  }
  if (legal.canRaise && margin > 0.16 && rng() < aggression * 0.38) {
    return { action: raiseTo(0.45 + aggression * 0.3), equity, potOdds, reason: 'pressure raise' };
  }
  if (legal.canCall && (margin >= foldThreshold || rng() < (1 - patience) * 0.12)) {
    return { action: { type: 'call' }, equity, potOdds, reason: margin > 0.08 ? 'profitable call' : 'defensive call' };
  }
  return { action: legal.canFold ? { type: 'fold' } : { type: 'check' }, equity, potOdds, reason: 'give up' };
}

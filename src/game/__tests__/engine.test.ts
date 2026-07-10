import { describe, expect, it } from 'vitest';
import { applyAction, createGame, getLegalActions, potSize, startNextHand } from '../engine';
import { seededRandom } from '../deck';

function playPassiveHand() {
  let state = createGame(seededRandom(42));
  let guard = 0;
  while (state.phase === 'betting' && guard < 100) {
    guard += 1;
    const player = state.players[state.activePlayerIndex!];
    const legal = getLegalActions(state, player.id);
    state = applyAction(state, player.id, legal.canCheck ? { type: 'check' } : { type: 'call' });
  }
  return state;
}

describe('holdem game engine', () => {
  it('posts blinds, deals unique hole cards, and starts after the big blind', () => {
    const state = createGame(seededRandom(1));
    expect(potSize(state)).toBe(15);
    expect(state.players.map((player) => player.hole.length)).toEqual([2, 2, 2, 2]);
    expect(new Set(state.players.flatMap((player) => player.hole.map((card) => card.id))).size).toBe(8);
    expect(state.players[state.activePlayerIndex!].id).toBe('rook');
  });

  it('runs a checked-down hand through showdown without losing chips', () => {
    const state = playPassiveHand();
    expect(state.phase).toBe('complete');
    expect(state.board).toHaveLength(5);
    expect(state.result?.pot).toBe(40);
    expect(state.players.reduce((sum, player) => sum + player.chips, 0)).toBe(2400);
    expect(state.stats.handsPlayed).toBe(1);
  });

  it('awards the pot immediately when all opponents fold', () => {
    let state = createGame(seededRandom(7));
    state = applyAction(state, 'rook', { type: 'fold' });
    state = applyAction(state, 'hero', { type: 'raise', amount: 30 });
    state = applyAction(state, 'luna', { type: 'fold' });
    state = applyAction(state, 'miles', { type: 'fold' });
    expect(state.result?.winnerIds).toEqual(['hero']);
    expect(state.players.reduce((sum, player) => sum + player.chips, 0)).toBe(2400);
  });

  it('rotates the dealer on the next hand', () => {
    const completed = playPassiveHand();
    const next = startNextHand(completed, seededRandom(84));
    expect(next.handNumber).toBe(2);
    expect(next.dealerIndex).toBe(1);
  });

  it('keeps chips conserved across randomized complete matches', () => {
    for (let simulation = 1; simulation <= 24; simulation += 1) {
      const rng = seededRandom(simulation * 101);
      let state = createGame(rng);
      let actions = 0;
      while (state.phase !== 'matchComplete' && actions < 3000) {
        if (state.phase === 'complete') {
          state = startNextHand(state, rng);
          continue;
        }
        actions += 1;
        const player = state.players[state.activePlayerIndex!];
        const legal = getLegalActions(state, player.id);
        const roll = rng();
        const action = legal.canRaise && roll < 0.18
          ? { type: 'raise' as const, amount: roll < 0.025 ? legal.maxRaiseTo : legal.minRaiseTo }
          : legal.canCheck
            ? { type: 'check' as const }
            : legal.canFold && roll > 0.76
              ? { type: 'fold' as const }
              : { type: 'call' as const };
        state = applyAction(state, player.id, action);
        expect(state.players.reduce((sum, seat) => sum + seat.chips, 0) + potSize(state)).toBe(2400);
      }
      expect(actions).toBeLessThan(3000);
      expect(state.phase).toBe('matchComplete');
    }
  }, 10_000);
});

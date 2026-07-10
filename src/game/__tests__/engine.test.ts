import { describe, expect, it } from 'vitest';
import { applyAction, createGame, getLegalActions, potSize, startNextHand } from '../engine';
import { cardId, seededRandom } from '../deck';
import { Card, Rank, Suit } from '../types';

const card = (rank: Rank, suit: Suit): Card => ({ id: cardId(rank, suit), rank, suit });

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

  it('pays the main pot and side pot to their correct winners', () => {
    let state = createGame(seededRandom(5));
    state.players[0].hole = [card(14, 'clubs'), card(14, 'diamonds')];
    state.players[1].hole = [card(13, 'clubs'), card(13, 'diamonds')];
    state.players[2].hole = [card(12, 'clubs'), card(12, 'diamonds')];
    state.players[3].hole = [card(11, 'clubs'), card(11, 'diamonds')];
    state.players[0].chips = 50;
    state.players[1].chips = 95;
    state.players[2].chips = 190;
    state.players[3].chips = 200;
    state.deck = [
      card(9, 'clubs'), card(7, 'spades'), card(8, 'spades'), card(6, 'spades'),
      card(4, 'hearts'), card(3, 'diamonds'), card(2, 'clubs'), card(5, 'spades'),
    ];

    state = applyAction(state, 'rook', { type: 'fold' });
    state = applyAction(state, 'hero', { type: 'raise', amount: 50 });
    state = applyAction(state, 'luna', { type: 'raise', amount: 100 });
    state = applyAction(state, 'miles', { type: 'call' });

    expect(state.result?.pot).toBe(250);
    expect(state.result?.payouts).toMatchObject({ hero: 150, luna: 100 });
    expect(state.players.find((player) => player.id === 'hero')?.chips).toBe(150);
    expect(state.players.find((player) => player.id === 'luna')?.chips).toBe(100);
    expect(state.players.reduce((sum, player) => sum + player.chips, 0)).toBe(550);
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

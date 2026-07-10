import { describe, expect, it } from 'vitest';
import { cardId } from '../deck';
import { compareHands, evaluateBest } from '../evaluator';
import { Card, Rank, Suit } from '../types';

const card = (rank: Rank, suit: Suit): Card => ({ id: cardId(rank, suit), rank, suit });

describe('poker hand evaluator', () => {
  it('recognizes a wheel straight flush', () => {
    const hand = [card(14, 'hearts'), card(2, 'hearts'), card(3, 'hearts'), card(4, 'hearts'), card(5, 'hearts')];
    expect(evaluateBest(hand).categoryName).toBe('Straight Flush');
    expect(evaluateBest(hand).score).toEqual([8, 5]);
  });

  it('uses the best five of seven cards', () => {
    const hand = [
      card(14, 'spades'), card(14, 'diamonds'), card(14, 'clubs'),
      card(13, 'spades'), card(13, 'diamonds'), card(2, 'clubs'), card(3, 'hearts'),
    ];
    expect(evaluateBest(hand).description).toBe('Aces full of Kings');
  });

  it('breaks equal-pair ties with kickers', () => {
    const board = [card(9, 'clubs'), card(9, 'diamonds'), card(5, 'spades'), card(3, 'hearts'), card(2, 'clubs')];
    const aces = [card(14, 'hearts'), card(12, 'hearts'), ...board];
    const kings = [card(13, 'hearts'), card(12, 'spades'), ...board];
    expect(compareHands(aces, kings)).toBeGreaterThan(0);
  });
});


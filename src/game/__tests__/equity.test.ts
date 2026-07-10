import { describe, expect, it } from 'vitest';
import { cardId } from '../deck';
import { countImmediateOuts } from '../equity';
import { Card, Rank, Suit } from '../types';

const card = (rank: Rank, suit: Suit): Card => ({ id: cardId(rank, suit), rank, suit });

describe('learning outs', () => {
  it('does not count pairing a public board card as a personal out', () => {
    const hole = [card(14, 'hearts'), card(13, 'spades')];
    const board = [card(10, 'clubs'), card(8, 'diamonds'), card(7, 'clubs')];
    expect(countImmediateOuts(hole, board)).toBe(6);
  });

  it('counts two-pair and trips cards that match the player’s hole cards', () => {
    const hole = [card(14, 'hearts'), card(13, 'spades')];
    const board = [card(14, 'clubs'), card(7, 'diamonds'), card(2, 'clubs')];
    expect(countImmediateOuts(hole, board)).toBe(5);
  });

  it('counts a real four-card flush draw that uses a hole card', () => {
    const hole = [card(14, 'hearts'), card(13, 'hearts')];
    const board = [card(2, 'hearts'), card(7, 'hearts'), card(9, 'clubs')];
    expect(countImmediateOuts(hole, board)).toBe(15);
  });
});

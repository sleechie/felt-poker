import { Card, HandValue } from './types';

const RANK_NAMES: Record<number, string> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
  8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
};

const CATEGORY_NAMES = [
  'High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight',
  'Flush', 'Full House', 'Four of a Kind', 'Straight Flush',
];

function combinations<T>(items: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  const visit = (start: number, selected: T[]) => {
    if (selected.length === size) {
      output.push(selected);
      return;
    }
    for (let index = start; index <= items.length - (size - selected.length); index += 1) {
      visit(index + 1, [...selected, items[index]]);
    }
  };
  visit(0, []);
  return output;
}

function straightHigh(ranks: number[]): number | null {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    if (unique[index] - unique[index + 4] === 4) return unique[index];
  }
  return null;
}

function pluralRank(rank: number): string {
  if (rank === 6) return 'Sixes';
  return `${RANK_NAMES[rank]}s`;
}

function describe(category: number, score: number[]): string {
  switch (category) {
    case 8: return `${RANK_NAMES[score[0]]}-high straight flush`;
    case 7: return `Four ${pluralRank(score[0])}`;
    case 6: return `${pluralRank(score[0])} full of ${pluralRank(score[1])}`;
    case 5: return `${RANK_NAMES[score[0]]}-high flush`;
    case 4: return `${RANK_NAMES[score[0]]}-high straight`;
    case 3: return `Three ${pluralRank(score[0])}`;
    case 2: return `${pluralRank(score[0])} and ${pluralRank(score[1])}`;
    case 1: return `Pair of ${pluralRank(score[0])}`;
    default: return `${RANK_NAMES[score[0]]} high`;
  }
}

export function compareScores(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function evaluateFive(cards: Card[]): HandValue {
  if (cards.length !== 5) throw new Error('evaluateFive expects exactly five cards');

  const ranks: number[] = cards.map((card) => card.rank).sort((a, b) => b - a);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straight = straightHigh(ranks);
  const counts = new Map<number, number>();
  ranks.forEach((rank) => counts.set(rank, (counts.get(rank) ?? 0) + 1));
  const groups = [...counts.entries()].sort(
    ([rankA, countA], [rankB, countB]) => countB - countA || rankB - rankA,
  );

  let category = 0;
  let score = ranks;
  if (flush && straight) {
    category = 8;
    score = [straight];
  } else if (groups[0][1] === 4) {
    category = 7;
    score = [groups[0][0], groups[1][0]];
  } else if (groups[0][1] === 3 && groups[1][1] === 2) {
    category = 6;
    score = [groups[0][0], groups[1][0]];
  } else if (flush) {
    category = 5;
    score = ranks;
  } else if (straight) {
    category = 4;
    score = [straight];
  } else if (groups[0][1] === 3) {
    category = 3;
    score = [groups[0][0], ...groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a)];
  } else if (groups[0][1] === 2 && groups[1][1] === 2) {
    const pairs = groups.slice(0, 2).map(([rank]) => rank).sort((a, b) => b - a);
    category = 2;
    score = [...pairs, groups[2][0]];
  } else if (groups[0][1] === 2) {
    category = 1;
    score = [groups[0][0], ...groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a)];
  }

  return {
    category,
    categoryName: CATEGORY_NAMES[category],
    score: [category, ...score],
    cards,
    description: describe(category, score),
  };
}

export function evaluateBest(cards: Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('evaluateBest expects five to seven cards');
  }
  return combinations(cards, 5)
    .map(evaluateFive)
    .sort((left, right) => compareScores(right.score, left.score))[0];
}

export function compareHands(left: Card[], right: Card[]): number {
  return compareScores(evaluateBest(left).score, evaluateBest(right).score);
}

export function describeCurrentHand(cards: Card[]): string {
  if (cards.length >= 5) return evaluateBest(cards).description;
  const counts = new Map<number, number>();
  cards.forEach((card) => counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1));
  const groups = [...counts.entries()].sort(
    ([rankA, countA], [rankB, countB]) => countB - countA || rankB - rankA,
  );
  if (groups[0]?.[1] === 4) return `Four ${pluralRank(groups[0][0])}`;
  if (groups[0]?.[1] === 3) return `Three ${pluralRank(groups[0][0])}`;
  if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2) {
    return `${pluralRank(groups[0][0])} and ${pluralRank(groups[1][0])}`;
  }
  if (groups[0]?.[1] === 2) return `Pair of ${pluralRank(groups[0][0])}`;
  return `${RANK_NAMES[Math.max(...cards.map((card) => card.rank))]} high`;
}

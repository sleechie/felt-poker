import { createDeck, shuffle } from './deck';
import { compareScores, evaluateBest } from './evaluator';
import { Card } from './types';

export interface EquityResult {
  equity: number;
  win: number;
  tie: number;
  iterations: number;
}

export function estimateEquity(
  hole: Card[],
  board: Card[],
  opponentCount: number,
  iterations = 600,
  rng: () => number = Math.random,
): EquityResult {
  if (hole.length !== 2) return { equity: 0, win: 0, tie: 0, iterations: 0 };
  const knownIds = new Set([...hole, ...board].map((card) => card.id));
  const available = createDeck().filter((card) => !knownIds.has(card.id));
  let wins = 0;
  let ties = 0;
  let equityShare = 0;

  for (let run = 0; run < iterations; run += 1) {
    const sample = shuffle(available, rng);
    let cursor = 0;
    const runBoard = [...board];
    while (runBoard.length < 5) runBoard.push(sample[cursor++]);
    const heroScore = evaluateBest([...hole, ...runBoard]).score;
    const opponentScores: number[][] = [];
    for (let opponent = 0; opponent < opponentCount; opponent += 1) {
      opponentScores.push(evaluateBest([sample[cursor++], sample[cursor++], ...runBoard]).score);
    }
    const bestOpponent = opponentScores.sort((left, right) => compareScores(right, left))[0];
    const comparison = bestOpponent ? compareScores(heroScore, bestOpponent) : 1;
    if (comparison > 0) {
      wins += 1;
      equityShare += 1;
    } else if (comparison === 0) {
      const tiedPlayers = 1 + opponentScores.filter((score) => compareScores(score, heroScore) === 0).length;
      ties += 1;
      equityShare += 1 / tiedPlayers;
    }
  }

  return {
    equity: equityShare / iterations,
    win: wins / iterations,
    tie: ties / iterations,
    iterations,
  };
}

export function countImmediateOuts(hole: Card[], board: Card[]): number | null {
  if (board.length < 3 || board.length >= 5) return null;
  const currentCards = [...hole, ...board];
  const current = evaluateBest(currentCards);
  const knownIds = new Set(currentCards.map((card) => card.id));
  return createDeck()
    .filter((card) => !knownIds.has(card.id))
    .filter((card) => {
      const next = evaluateBest([...currentCards, card]);
      return next.category > current.category;
    }).length;
}


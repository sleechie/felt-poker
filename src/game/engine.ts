import { createDeck, shuffle } from './deck';
import { compareScores, evaluateBest } from './evaluator';
import {
  BotPersona,
  Card,
  GameState,
  LegalActions,
  PlayerState,
  PokerAction,
  Street,
} from './types';

const STARTING_CHIPS = 600;
const SMALL_BLIND = 5;
const BIG_BLIND = 10;

const BOTS: Array<{ id: string; name: string; persona: BotPersona }> = [
  { id: 'luna', name: 'Luna', persona: { aggression: 0.68, bluff: 0.16, patience: 0.58, volatility: 0.38, color: '#FF6B8A' } },
  { id: 'miles', name: 'Miles', persona: { aggression: 0.42, bluff: 0.07, patience: 0.78, volatility: 0.18, color: '#5FD6C7' } },
  { id: 'rook', name: 'Rook', persona: { aggression: 0.82, bluff: 0.22, patience: 0.34, volatility: 0.62, color: '#FFB84D' } },
];

function makePlayers(): PlayerState[] {
  return [
    { id: 'hero', name: 'You', isHuman: true, chips: STARTING_CHIPS, hole: [], folded: false, allIn: false, streetBet: 0, committed: 0 },
    ...BOTS.map(({ id, name, persona }): PlayerState => ({
      id, name, persona, isHuman: false, chips: STARTING_CHIPS, hole: [], folded: false,
      allIn: false, streetBet: 0, committed: 0,
    })),
  ];
}

function nextSeat(players: PlayerState[], from: number, predicate: (player: PlayerState) => boolean): number {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (from + offset) % players.length;
    if (predicate(players[index])) return index;
  }
  return from;
}

function canPlay(player: PlayerState): boolean {
  return player.chips > 0;
}

function canAct(player: PlayerState): boolean {
  return !player.folded && !player.allIn && player.chips > 0;
}

function takeChips(player: PlayerState, amount: number): number {
  const paid = Math.max(0, Math.min(player.chips, amount));
  player.chips -= paid;
  player.streetBet += paid;
  player.committed += paid;
  if (player.chips === 0) player.allIn = true;
  return paid;
}

function dealCard(deck: Card[]): Card {
  const card = deck.pop();
  if (!card) throw new Error('Deck is empty');
  return card;
}

function orderedPending(state: GameState, startAfter: number): number | null {
  if (state.pendingPlayerIds.length === 0) return null;
  return nextSeat(
    state.players,
    startAfter,
    (player) => state.pendingPlayerIds.includes(player.id) && canAct(player),
  );
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, hole: [...player.hole] })),
    board: [...state.board],
    deck: [...state.deck],
    pendingPlayerIds: [...state.pendingPlayerIds],
    actedSinceFullRaise: [...state.actedSinceFullRaise],
    stats: { ...state.stats },
    result: state.result ? { ...state.result, payouts: { ...state.result.payouts } } : undefined,
  };
}

function beginHand(base: GameState, dealerIndex: number, rng: () => number): GameState {
  const players: PlayerState[] = base.players.map((player): PlayerState => ({
    ...player,
    hole: [],
    folded: player.chips === 0,
    allIn: false,
    streetBet: 0,
    committed: 0,
    lastAction: undefined,
  }));
  const deck = shuffle(createDeck(), rng);
  const liveCount = players.filter(canPlay).length;
  if (liveCount < 2) {
    return { ...base, players, phase: 'matchComplete', activePlayerIndex: null, message: 'Match complete' };
  }

  const smallBlindIndex = liveCount === 2
    ? dealerIndex
    : nextSeat(players, dealerIndex, canPlay);
  const bigBlindIndex = nextSeat(players, smallBlindIndex, canPlay);

  for (let round = 0; round < 2; round += 1) {
    for (let offset = 1; offset <= players.length; offset += 1) {
      const index = (dealerIndex + offset) % players.length;
      if (canPlay(players[index])) players[index].hole.push(dealCard(deck));
    }
  }

  takeChips(players[smallBlindIndex], SMALL_BLIND);
  takeChips(players[bigBlindIndex], BIG_BLIND);
  players[smallBlindIndex].lastAction = `Small blind · ${Math.min(SMALL_BLIND, players[smallBlindIndex].committed)}`;
  players[bigBlindIndex].lastAction = `Big blind · ${Math.min(BIG_BLIND, players[bigBlindIndex].committed)}`;

  const pendingPlayerIds = players.filter(canAct).map((player) => player.id);
  const preflopStart = liveCount === 2 ? bigBlindIndex : bigBlindIndex;
  const state: GameState = {
    ...base,
    players,
    dealerIndex,
    smallBlindIndex,
    bigBlindIndex,
    activePlayerIndex: null,
    street: 'preflop',
    phase: 'betting',
    board: [],
    deck,
    currentBet: Math.max(...players.map((player) => player.streetBet)),
    minRaise: BIG_BLIND,
    pendingPlayerIds,
    actedSinceFullRaise: [],
    handNumber: base.handNumber + 1,
    message: 'Pre-flop',
    result: undefined,
    lastAggressorId: undefined,
    lastActionId: base.lastActionId + 1,
  };
  state.activePlayerIndex = orderedPending(state, preflopStart);
  const soleActor = state.pendingPlayerIds.length === 1
    ? state.players.find((player) => player.id === state.pendingPlayerIds[0])
    : undefined;
  // If blind posting leaves nobody with a decision, run the board immediately.
  if (state.pendingPlayerIds.length === 0 || (soleActor && soleActor.streetBet >= state.currentBet)) {
    return finishRound(state);
  }
  return state;
}

export function createGame(rng: () => number = Math.random): GameState {
  const empty: GameState = {
    players: makePlayers(),
    dealerIndex: 0,
    smallBlindIndex: 1,
    bigBlindIndex: 2,
    activePlayerIndex: null,
    street: 'preflop',
    phase: 'betting',
    board: [],
    deck: [],
    currentBet: 0,
    minRaise: BIG_BLIND,
    pendingPlayerIds: [],
    actedSinceFullRaise: [],
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    handNumber: 0,
    message: '',
    lastActionId: 0,
    stats: {
      handsPlayed: 0,
      handsWon: 0,
      biggestPot: 0,
      heroFacedBets: 0,
      heroFolds: 0,
      heroCalls: 0,
      heroRaises: 0,
    },
  };
  return beginHand(empty, 0, rng);
}

export function potSize(state: GameState): number {
  return state.players.reduce((sum, player) => sum + player.committed, 0);
}

export function getLegalActions(state: GameState, playerId: string): LegalActions {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const isTurn = player && state.activePlayerIndex !== null && state.players[state.activePlayerIndex].id === playerId;
  if (!player || !isTurn || state.phase !== 'betting' || !canAct(player)) {
    return { canFold: false, canCheck: false, canCall: false, canRaise: false, callAmount: 0, minRaiseTo: 0, maxRaiseTo: 0 };
  }
  const owed = Math.max(0, state.currentBet - player.streetBet);
  const callAmount = Math.min(owed, player.chips);
  const maxRaiseTo = player.streetBet + player.chips;
  const standardMin = state.currentBet + state.minRaise;
  const minRaiseTo = Math.min(maxRaiseTo, standardMin);
  return {
    canFold: owed > 0,
    canCheck: owed === 0,
    canCall: owed > 0,
    canRaise: maxRaiseTo > state.currentBet && !state.actedSinceFullRaise.includes(player.id),
    callAmount,
    minRaiseTo,
    maxRaiseTo,
  };
}

function dealStreet(state: GameState, street: Street, cardCount: number): void {
  dealCard(state.deck); // burn
  for (let index = 0; index < cardCount; index += 1) state.board.push(dealCard(state.deck));
  state.street = street;
  state.players.forEach((player) => {
    player.streetBet = 0;
    player.lastAction = undefined;
  });
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
  state.actedSinceFullRaise = [];
  state.lastAggressorId = undefined;
  state.message = street[0].toUpperCase() + street.slice(1);
}

function returnUncalledBet(state: GameState): number {
  const ordered = [...state.players].sort((left, right) => right.committed - left.committed);
  if (ordered.length < 2 || ordered[0].committed <= ordered[1].committed) return 0;
  const refund = ordered[0].committed - ordered[1].committed;
  ordered[0].committed -= refund;
  ordered[0].streetBet = Math.max(0, ordered[0].streetBet - refund);
  ordered[0].chips += refund;
  ordered[0].allIn = ordered[0].chips === 0;
  return refund;
}

function settle(state: GameState): GameState {
  returnUncalledBet(state);
  const totalPot = potSize(state);
  const live = state.players.filter((player) => !player.folded && player.committed > 0);
  const payouts: Record<string, number> = {};
  const winnerIds = new Set<string>();
  let title = '';
  let detail = '';

  if (live.length === 1) {
    payouts[live[0].id] = totalPot;
    winnerIds.add(live[0].id);
    title = `${live[0].name} takes it`;
    detail = 'Everyone else folded';
  } else {
    const levels = [...new Set(state.players.map((player) => player.committed).filter((amount) => amount > 0))].sort((a, b) => a - b);
    let previous = 0;
    for (const level of levels) {
      const contributors = state.players.filter((player) => player.committed >= level);
      const sidePot = (level - previous) * contributors.length;
      previous = level;
      const eligible = contributors.filter((player) => !player.folded);
      if (eligible.length === 0 || sidePot === 0) continue;
      const values = eligible.map((player) => ({ player, hand: evaluateBest([...player.hole, ...state.board]) }));
      values.sort((left, right) => compareScores(right.hand.score, left.hand.score));
      const best = values[0].hand.score;
      const winners = values.filter(({ hand }) => compareScores(hand.score, best) === 0);
      const share = Math.floor(sidePot / winners.length);
      let remainder = sidePot - share * winners.length;
      const inAwardOrder = [...winners].sort((left, right) => {
        const leftDistance = (state.players.indexOf(left.player) - state.dealerIndex + state.players.length) % state.players.length;
        const rightDistance = (state.players.indexOf(right.player) - state.dealerIndex + state.players.length) % state.players.length;
        return leftDistance - rightDistance;
      });
      inAwardOrder.forEach(({ player }) => {
        payouts[player.id] = (payouts[player.id] ?? 0) + share + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        winnerIds.add(player.id);
      });
    }
    const primary = state.players
      .filter((player) => winnerIds.has(player.id))
      .sort((left, right) => (payouts[right.id] ?? 0) - (payouts[left.id] ?? 0))[0];
    const primaryHand = evaluateBest([...primary.hole, ...state.board]);
    title = winnerIds.size === 1 ? `${primary.name} wins ${payouts[primary.id]}` : 'Split pot';
    detail = primaryHand.description;
  }

  state.players.forEach((player) => {
    player.chips += payouts[player.id] ?? 0;
    player.streetBet = 0;
    player.committed = 0;
  });
  const hero = state.players.find((player) => player.id === 'hero');
  state.phase = state.players.filter(canPlay).length < 2 || !hero || hero.chips === 0 ? 'matchComplete' : 'complete';
  state.activePlayerIndex = null;
  state.pendingPlayerIds = [];
  state.message = title;
  state.result = { title, detail, winnerIds: [...winnerIds], payouts, pot: totalPot };
  state.stats.handsPlayed += 1;
  if (winnerIds.has('hero')) state.stats.handsWon += 1;
  state.stats.biggestPot = Math.max(state.stats.biggestPot, totalPot);
  return state;
}

function finishRound(state: GameState): GameState {
  const live = state.players.filter((player) => !player.folded && (player.committed > 0 || player.chips > 0));
  if (live.length <= 1) return settle(state);

  const nextStreet = (): boolean => {
    if (state.street === 'preflop') dealStreet(state, 'flop', 3);
    else if (state.street === 'flop') dealStreet(state, 'turn', 1);
    else if (state.street === 'turn') dealStreet(state, 'river', 1);
    else return false;
    return true;
  };

  if (!nextStreet()) return settle(state);
  let actionable = state.players.filter(canAct);
  while (actionable.length <= 1 && state.street !== 'river') {
    nextStreet();
    actionable = state.players.filter(canAct);
  }
  if (actionable.length <= 1) {
    if (state.street !== 'river') throw new Error('Board did not run to the river');
    return settle(state);
  }
  state.pendingPlayerIds = actionable.map((player) => player.id);
  state.activePlayerIndex = orderedPending(state, state.dealerIndex);
  return state;
}

export function applyAction(state: GameState, playerId: string, action: PokerAction): GameState {
  const next = cloneState(state);
  if (next.activePlayerIndex === null || next.players[next.activePlayerIndex].id !== playerId) {
    throw new Error('It is not that player’s turn');
  }
  const player = next.players[next.activePlayerIndex];
  const legal = getLegalActions(next, playerId);
  const oldCurrentBet = next.currentBet;

  if (player.isHuman) {
    if (legal.canFold) next.stats.heroFacedBets += 1;
    if (action.type === 'fold') next.stats.heroFolds += 1;
    if (action.type === 'call') next.stats.heroCalls += 1;
    if (action.type === 'raise') next.stats.heroRaises += 1;
  }

  if (action.type === 'fold' && legal.canFold) {
    player.folded = true;
    player.lastAction = 'Fold';
  } else if (action.type === 'check' && legal.canCheck) {
    player.lastAction = 'Check';
  } else if (action.type === 'call' && legal.canCall) {
    const paid = takeChips(player, legal.callAmount);
    player.lastAction = player.allIn ? `All in · ${paid}` : `Call · ${paid}`;
  } else if (action.type === 'raise' && legal.canRaise && action.amount !== undefined) {
    const target = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(action.amount)));
    const paid = takeChips(player, target - player.streetBet);
    next.currentBet = player.streetBet;
    next.lastAggressorId = player.id;
    const raiseSize = next.currentBet - oldCurrentBet;
    const fullRaise = raiseSize >= next.minRaise;
    if (fullRaise) {
      next.minRaise = raiseSize;
      next.actedSinceFullRaise = [player.id];
      next.pendingPlayerIds = next.players.filter((candidate) => candidate.id !== player.id && canAct(candidate)).map((candidate) => candidate.id);
    }
    player.lastAction = player.allIn ? `All in · ${player.streetBet}` : `${oldCurrentBet > 0 ? 'Raise' : 'Bet'} · ${player.streetBet}`;
    if (paid <= 0) throw new Error('Raise must add chips');
  } else {
    throw new Error(`Illegal action: ${action.type}`);
  }

  if (!next.actedSinceFullRaise.includes(player.id)) next.actedSinceFullRaise.push(player.id);
  next.pendingPlayerIds = next.pendingPlayerIds.filter((id) => id !== player.id);
  // A short all-in can increase the call amount without reopening raising.
  next.players.filter((candidate) => canAct(candidate) && candidate.streetBet < next.currentBet).forEach((candidate) => {
    if (!next.pendingPlayerIds.includes(candidate.id)) next.pendingPlayerIds.push(candidate.id);
  });
  next.lastActionId += 1;
  next.message = `${player.name} · ${player.lastAction}`;

  const remaining = next.players.filter((candidate) => !candidate.folded && (candidate.chips > 0 || candidate.committed > 0));
  if (remaining.length === 1) return settle(next);
  if (next.pendingPlayerIds.length === 0) return finishRound(next);
  next.activePlayerIndex = orderedPending(next, state.activePlayerIndex!);
  return next;
}

export function startNextHand(state: GameState, rng: () => number = Math.random): GameState {
  if (state.phase === 'betting') return state;
  const playable = state.players.filter(canPlay);
  if (playable.length < 2) return { ...state, phase: 'matchComplete', activePlayerIndex: null };
  const dealerIndex = nextSeat(state.players, state.dealerIndex, canPlay);
  return beginHand(cloneState(state), dealerIndex, rng);
}

export function restartMatch(rng: () => number = Math.random): GameState {
  return createGame(rng);
}

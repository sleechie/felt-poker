import { describe, expect, it } from 'vitest';
import { createGame } from '../engine';
import { seededRandom } from '../deck';
import { decideBotAction } from '../npc';

describe('NPC decisions', () => {
  it('always returns a legal action for the active bot', () => {
    const state = createGame(seededRandom(11));
    const bot = state.players[state.activePlayerIndex!];
    expect(bot.isHuman).toBe(false);
    const decision = decideBotAction(state, bot.id, seededRandom(99));
    expect(['fold', 'call', 'raise']).toContain(decision.action.type);
    expect(decision.equity).toBeGreaterThanOrEqual(0);
    expect(decision.equity).toBeLessThanOrEqual(1);
  });
});


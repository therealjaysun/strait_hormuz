import { describe, it, expect } from 'vitest';
import { calculateWarScore } from './ScoringEngine.js';
import { generateAIPlacement } from './AIPlacement.js';

// Test helpers
function makeTanker(id, name, isDestroyed, hasEscaped) {
  return {
    id: `tanker_${id}`,
    assetId: 'tanker',
    name,
    faction: 'ATTACKER',
    type: 'TANKER',
    hp: isDestroyed ? 0 : 100,
    maxHp: 100,
    isDestroyed,
    hasEscaped,
    cost: 0,
    detectedBy: new Set(),
  };
}

const TANKER_NAMES = [
  'VLCC Pacific Glory', 'VLCC Arabian Star', 'VLCC Gulf Meridian',
  'VLCC Coral Dawn', 'VLCC Jade Horizon',
];

function buildSimResult(overrides = {}) {
  const tankers = TANKER_NAMES.map((name, i) =>
    makeTanker(i, name, false, true)
  );

  return {
    winner: 'ATTACKER',
    winReason: 'TANKERS_ESCAPED',
    gameTime: 300,
    events: [],
    entities: [...tankers],
    destroyedEntities: [],
    playerFaction: 'ATTACKER',
    difficulty: 'ADVISORY',
    ...overrides,
  };
}

describe('Phase 8 — Edge Cases', () => {
  describe('zero placement game', () => {
    it('scoring handles empty entities gracefully', () => {
      const tankers = TANKER_NAMES.map((n, i) => makeTanker(i, n, true, false));
      const result = buildSimResult({
        entities: [...tankers],
        destroyedEntities: [...tankers],
        winner: 'DEFENDER',
        events: [],
      });
      const score = calculateWarScore(result);

      // Should not throw and should produce valid results
      expect(score.defenderEffectiveness.score).toBeGreaterThanOrEqual(0);
      expect(score.defenderEffectiveness.score).toBeLessThanOrEqual(100);
      expect(score.attackerEffectiveness.score).toBeGreaterThanOrEqual(0);
      expect(score.attackerEffectiveness.score).toBeLessThanOrEqual(100);
    });

    it('scoring handles zero losses on both sides', () => {
      const result = buildSimResult({ events: [] });
      const score = calculateWarScore(result);

      // Division by zero: exchange rate should be handled
      expect(score.defenderAmmo.hitRate).toBe(0);
      expect(score.attackerAmmo.hitRate).toBe(0);
      expect(Number.isFinite(score.defenderEffectiveness.score)).toBe(true);
      expect(Number.isFinite(score.attackerEffectiveness.score)).toBe(true);
    });

    it('scoring handles zero budget spent', () => {
      const result = buildSimResult();
      const score = calculateWarScore(result);

      expect(score.defenderBudget.spent).toBe(0);
      expect(score.attackerBudget.spent).toBe(0);
    });
  });

  describe('AI placement works for all difficulties', () => {
    function seededRng(seed = 42) {
      let s = seed;
      return () => {
        s = (s * 16807 + 0) % 2147483647;
        return s / 2147483647;
      };
    }

    for (const difficulty of ['ADVISORY', 'ELEVATED', 'SEVERE', 'CRITICAL']) {
      for (const faction of ['DEFENDER', 'ATTACKER']) {
        it(`${faction} ${difficulty} generates valid placements`, () => {
          const rng = seededRng(42);
          const budget = faction === 'DEFENDER' ? 1500 : 2000;
          const result = generateAIPlacement(faction, difficulty, budget, rng);

          expect(result).toHaveProperty('placements');
          expect(result).toHaveProperty('route');
          expect(Array.isArray(result.placements)).toBe(true);
          expect(result.placements.length).toBeGreaterThan(0);
        });
      }
    }
  });

  describe('score clamping under extreme conditions', () => {
    it('all tankers destroyed with max losses gives valid scores', () => {
      const tankers = TANKER_NAMES.map((n, i) => makeTanker(i, n, true, false));
      const events = [];
      // Many combat events
      for (let i = 0; i < 50; i++) {
        events.push({
          type: 'COMBAT_HIT',
          data: { attackerFaction: 'DEFENDER', attackerId: 'd1' },
          gameTime: i,
        });
      }

      const result = buildSimResult({
        entities: [...tankers],
        destroyedEntities: [...tankers],
        winner: 'DEFENDER',
        events,
      });
      const score = calculateWarScore(result);

      expect(score.defenderEffectiveness.score).toBeGreaterThanOrEqual(0);
      expect(score.defenderEffectiveness.score).toBeLessThanOrEqual(100);
      expect(score.attackerEffectiveness.score).toBeGreaterThanOrEqual(0);
      expect(score.attackerEffectiveness.score).toBeLessThanOrEqual(100);
    });
  });

  describe('tactical summary robustness', () => {
    it('generates summary for attacker win', () => {
      const result = buildSimResult({ winner: 'ATTACKER' });
      const score = calculateWarScore(result);
      expect(typeof score.tacticalSummary).toBe('string');
      expect(score.tacticalSummary.length).toBeGreaterThan(10);
    });

    it('generates summary for defender win', () => {
      const tankers = TANKER_NAMES.map((n, i) => makeTanker(i, n, true, false));
      const result = buildSimResult({
        entities: [...tankers],
        destroyedEntities: [...tankers],
        winner: 'DEFENDER',
      });
      const score = calculateWarScore(result);
      expect(typeof score.tacticalSummary).toBe('string');
      expect(score.tacticalSummary.length).toBeGreaterThan(10);
    });
  });
});

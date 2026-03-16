import { describe, it, expect } from 'vitest';
import { calculateWarScore } from './ScoringEngine.js';

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

function makeEntity(id, faction, assetId, cost, isDestroyed = false) {
  return {
    id,
    assetId,
    name: assetId,
    faction,
    type: 'SURFACE',
    hp: isDestroyed ? 0 : 50,
    maxHp: 50,
    isDestroyed,
    hasEscaped: false,
    cost,
    detectedBy: new Set(),
    isDecoy: false,
    isDrone: false,
    isRadar: false,
    isCoastalMissile: false,
  };
}

const TANKER_NAMES = [
  'VLCC Pacific Glory', 'VLCC Arabian Star', 'VLCC Gulf Meridian',
  'VLCC Coral Dawn', 'VLCC Jade Horizon',
];

function buildSimResult(overrides = {}) {
  const tankers = TANKER_NAMES.map((name, i) =>
    makeTanker(i, name, false, true) // all escaped by default
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

describe('ScoringEngine — calculateWarScore', () => {
  describe('tanker status', () => {
    it('all tankers escaped', () => {
      const result = buildSimResult();
      const score = calculateWarScore(result);

      expect(score.tankerSummary.escaped).toBe(5);
      expect(score.tankerSummary.destroyed).toBe(0);
      expect(score.tankerSummary.passageRate).toBe(1);
      expect(score.tankerSummary.deliveredBarrels).toBe(10000000);
      expect(score.tankerSummary.destroyedBarrels).toBe(0);
    });

    it('all tankers destroyed', () => {
      const tankers = TANKER_NAMES.map((name, i) => makeTanker(i, name, true, false));
      const result = buildSimResult({
        entities: [...tankers],
        destroyedEntities: [...tankers],
        winner: 'DEFENDER',
      });
      const score = calculateWarScore(result);

      expect(score.tankerSummary.escaped).toBe(0);
      expect(score.tankerSummary.destroyed).toBe(5);
      expect(score.tankerSummary.passageRate).toBe(0);
      expect(score.tankerSummary.deliveredBarrels).toBe(0);
      expect(score.tankerSummary.destroyedBarrels).toBe(10000000);
    });

    it('mixed tanker status', () => {
      const tankers = [
        makeTanker(0, TANKER_NAMES[0], false, true),  // escaped
        makeTanker(1, TANKER_NAMES[1], true, false),   // destroyed
        makeTanker(2, TANKER_NAMES[2], false, true),   // escaped
        makeTanker(3, TANKER_NAMES[3], true, false),   // destroyed
        makeTanker(4, TANKER_NAMES[4], false, false),  // in transit
      ];
      const result = buildSimResult({ entities: tankers });
      const score = calculateWarScore(result);

      expect(score.tankerSummary.escaped).toBe(2);
      expect(score.tankerSummary.destroyed).toBe(2);
      expect(score.tankerSummary.inTransit).toBe(1);
      expect(score.tankerSummary.passageRate).toBe(0.4);
    });
  });

  describe('military losses', () => {
    it('computes losses by faction', () => {
      const entities = [
        ...TANKER_NAMES.map((n, i) => makeTanker(i, n, false, true)),
        makeEntity('def1', 'DEFENDER', 'coastal_radar', 100, true),
        makeEntity('def2', 'DEFENDER', 'coastal_radar', 100, true),
        makeEntity('atk1', 'ATTACKER', 'arleigh_burke_ddg', 300, true),
      ];
      const destroyedEntities = entities.filter(e => e.isDestroyed && e.type !== 'TANKER');

      const result = buildSimResult({ entities, destroyedEntities });
      const score = calculateWarScore(result);

      expect(score.defenderLosses.totalCost).toBe(200);
      expect(score.attackerLosses.totalCost).toBe(300);
    });

    it('handles no losses', () => {
      const result = buildSimResult();
      const score = calculateWarScore(result);

      expect(score.defenderLosses.totalCost).toBe(0);
      expect(score.defenderLosses.items.length).toBe(0);
      expect(score.attackerLosses.totalCost).toBe(0);
    });
  });

  describe('ammo expenditure', () => {
    it('counts hits and misses by faction', () => {
      const events = [
        { type: 'COMBAT_HIT', data: { attackerFaction: 'DEFENDER', attackerId: 'd1' }, gameTime: 10 },
        { type: 'COMBAT_HIT', data: { attackerFaction: 'DEFENDER', attackerId: 'd1' }, gameTime: 11 },
        { type: 'COMBAT_MISS', data: { attackerFaction: 'DEFENDER', attackerId: 'd1' }, gameTime: 12 },
        { type: 'COMBAT_HIT', data: { attackerFaction: 'ATTACKER', attackerId: 'a1' }, gameTime: 15 },
        { type: 'COMBAT_MISS', data: { attackerFaction: 'ATTACKER', attackerId: 'a1' }, gameTime: 16 },
        { type: 'COMBAT_MISS', data: { attackerFaction: 'ATTACKER', attackerId: 'a1' }, gameTime: 17 },
      ];

      const result = buildSimResult({ events });
      const score = calculateWarScore(result);

      expect(score.defenderAmmo.totalFired).toBe(3);
      expect(score.defenderAmmo.hits).toBe(2);
      expect(score.defenderAmmo.hitRate).toBeCloseTo(2 / 3);

      expect(score.attackerAmmo.totalFired).toBe(3);
      expect(score.attackerAmmo.hits).toBe(1);
      expect(score.attackerAmmo.hitRate).toBeCloseTo(1 / 3);
    });

    it('handles zero shots', () => {
      const result = buildSimResult({ events: [] });
      const score = calculateWarScore(result);

      expect(score.defenderAmmo.totalFired).toBe(0);
      expect(score.defenderAmmo.hitRate).toBe(0);
    });
  });

  describe('effectiveness assessment', () => {
    it('attacker gets high score when all tankers escape', () => {
      const entities = [
        ...TANKER_NAMES.map((n, i) => makeTanker(i, n, false, true)),
        makeEntity('atk1', 'ATTACKER', 'arleigh_burke_ddg', 300, false),
      ];
      const result = buildSimResult({ entities });
      const score = calculateWarScore(result);

      // Oil delivery rate = 1.0 → very high score
      expect(score.attackerEffectiveness.score).toBeGreaterThanOrEqual(40);
      expect(score.attackerEffectiveness.components.oilRate).toBe(100);
    });

    it('defender gets high score when all tankers destroyed', () => {
      const tankers = TANKER_NAMES.map((n, i) => makeTanker(i, n, true, false));
      const defAsset = makeEntity('def1', 'DEFENDER', 'coastal_radar', 100, false);
      const entities = [...tankers, defAsset];
      const destroyedEntities = tankers;

      const result = buildSimResult({
        entities,
        destroyedEntities,
        winner: 'DEFENDER',
      });
      const score = calculateWarScore(result);

      expect(score.defenderEffectiveness.score).toBeGreaterThanOrEqual(40);
      expect(score.defenderEffectiveness.components.oilRate).toBe(100);
    });
  });

  describe('letter grades', () => {
    it('maps scores to correct grades', () => {
      const result = buildSimResult();
      const score = calculateWarScore(result);

      // The grade should be a valid letter grade
      const validGrades = ['S', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
      expect(validGrades).toContain(score.attackerEffectiveness.grade);
      expect(validGrades).toContain(score.defenderEffectiveness.grade);
    });
  });

  describe('edge cases', () => {
    it('handles division by zero — no losses on either side', () => {
      const result = buildSimResult({ events: [] });
      const score = calculateWarScore(result);

      // Should not throw, exchange rate should handle 0/0
      expect(score.defenderEffectiveness.score).toBeGreaterThanOrEqual(0);
      expect(score.attackerEffectiveness.score).toBeGreaterThanOrEqual(0);
    });

    it('handles zero budget spent', () => {
      const result = buildSimResult({ events: [] });
      const score = calculateWarScore(result);

      expect(score.defenderBudget.spent).toBe(0);
      expect(score.attackerBudget.spent).toBe(0);
    });
  });

  describe('tactical summary', () => {
    it('generates non-empty string', () => {
      const result = buildSimResult();
      const score = calculateWarScore(result);

      expect(typeof score.tacticalSummary).toBe('string');
      expect(score.tacticalSummary.length).toBeGreaterThan(20);
    });

    it('mentions attacker win when attacker wins', () => {
      const result = buildSimResult({ winner: 'ATTACKER' });
      const score = calculateWarScore(result);

      expect(score.tacticalSummary).toContain('Coalition');
    });

    it('mentions defender win when defender wins', () => {
      const tankers = TANKER_NAMES.map((n, i) => makeTanker(i, n, true, false));
      const result = buildSimResult({
        entities: [...tankers],
        destroyedEntities: [...tankers],
        winner: 'DEFENDER',
      });
      const score = calculateWarScore(result);

      expect(score.tacticalSummary).toContain('Iranian');
    });
  });

  describe('score clamping', () => {
    it('scores are between 0 and 100', () => {
      // Test with extreme values
      const tankers = TANKER_NAMES.map((n, i) => makeTanker(i, n, true, false));
      const result = buildSimResult({
        entities: [...tankers],
        destroyedEntities: [...tankers],
        winner: 'DEFENDER',
      });
      const score = calculateWarScore(result);

      expect(score.defenderEffectiveness.score).toBeGreaterThanOrEqual(0);
      expect(score.defenderEffectiveness.score).toBeLessThanOrEqual(100);
      expect(score.attackerEffectiveness.score).toBeGreaterThanOrEqual(0);
      expect(score.attackerEffectiveness.score).toBeLessThanOrEqual(100);
    });
  });
});

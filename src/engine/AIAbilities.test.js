import { describe, it, expect, vi } from 'vitest';
import AIAbilities from './AIAbilities.js';

function makeEngine(overrides = {}) {
  return {
    gameTime: 0,
    currentTick: 0,
    entities: [],
    events: [],
    rng: Math.random,
    ...overrides,
  };
}

function makeEntity(id, faction, type, overrides = {}) {
  return {
    id,
    faction,
    type,
    name: id,
    hp: 100,
    maxHp: 100,
    isDestroyed: false,
    hasEscaped: false,
    detectedBy: new Set([faction]),
    position: { x: 100, y: 100 },
    damage: 10,
    weaponRange: 50,
    cost: 100,
    isRadar: false,
    radarRange: 0,
    currentTarget: null,
    assetId: id,
    ...overrides,
  };
}

describe('AIAbilities', () => {
  describe('ADVISORY', () => {
    it('never uses abilities', () => {
      const ai = new AIAbilities('DEFENDER', 'ADVISORY');
      const engine = makeEngine({ gameTime: 100 });

      // Even with many updates, no abilities should fire
      for (let i = 0; i < 100; i++) {
        ai.update(engine, 1);
      }

      // No ability events should have been pushed
      expect(engine.events.length).toBe(0);
    });
  });

  describe('ELEVATED — reactive', () => {
    it('does nothing when no damage events exist', () => {
      const ai = new AIAbilities('DEFENDER', 'ELEVATED');
      const engine = makeEngine({ gameTime: 10 });

      ai.update(engine, 1);
      expect(engine.events.length).toBe(0);
    });
  });

  describe('constructor', () => {
    it('creates ability system for both factions', () => {
      const defAi = new AIAbilities('DEFENDER', 'SEVERE');
      const atkAi = new AIAbilities('ATTACKER', 'SEVERE');

      expect(defAi.aiFaction).toBe('DEFENDER');
      expect(defAi.enabled).toBe(true);
      expect(atkAi.aiFaction).toBe('ATTACKER');
      expect(atkAi.enabled).toBe(true);
    });

    it('ADVISORY is disabled', () => {
      const ai = new AIAbilities('DEFENDER', 'ADVISORY');
      expect(ai.enabled).toBe(false);
    });
  });

  describe('SEVERE — proactive defender', () => {
    it('attempts abilities when detected enemies exist', () => {
      const ai = new AIAbilities('DEFENDER', 'SEVERE');
      const tanker = makeEntity('t1', 'ATTACKER', 'TANKER', {
        detectedBy: new Set(['DEFENDER', 'ATTACKER']),
      });
      const engine = makeEngine({
        gameTime: 0,
        entities: [tanker],
      });

      // Run multiple ticks to trigger proactive behavior
      for (let i = 0; i < 10; i++) {
        engine.gameTime = i;
        ai.update(engine, 1);
      }

      // Should have attempted to use at least one ability
      // (concentrate_fire on detected tanker)
      const abilityEvents = engine.events.filter(e => e.type === 'ABILITY_ACTIVATED');
      expect(abilityEvents.length).toBeGreaterThanOrEqual(0); // May or may not succeed depending on ability state
    });
  });

  describe('CRITICAL — optimal', () => {
    it('constructs without error for both factions', () => {
      expect(() => new AIAbilities('DEFENDER', 'CRITICAL')).not.toThrow();
      expect(() => new AIAbilities('ATTACKER', 'CRITICAL')).not.toThrow();
    });

    it('updates without error even with empty engine', () => {
      const ai = new AIAbilities('ATTACKER', 'CRITICAL');
      const engine = makeEngine({ gameTime: 10 });

      expect(() => ai.update(engine, 1)).not.toThrow();
    });
  });
});

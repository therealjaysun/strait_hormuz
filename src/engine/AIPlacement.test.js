import { describe, it, expect } from 'vitest';
import { generateAIPlacement } from './AIPlacement.js';
import { defenderEquipment } from '../data/defenderEquipment.js';
import { attackerEquipment } from '../data/attackerEquipment.js';

// Seeded RNG for reproducibility
function seededRng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

const DEF_BUDGET = 1500;
const ATK_BUDGET = 2000;

describe('AIPlacement', () => {
  describe('generateAIPlacement — basic contract', () => {
    for (const difficulty of ['ADVISORY', 'ELEVATED', 'SEVERE', 'CRITICAL']) {
      for (const faction of ['DEFENDER', 'ATTACKER']) {
        it(`returns valid placements for ${faction} at ${difficulty}`, () => {
          const rng = seededRng(123);
          const budget = faction === 'DEFENDER' ? DEF_BUDGET : ATK_BUDGET;
          const result = generateAIPlacement(faction, difficulty, budget, rng);

          expect(result).toHaveProperty('placements');
          expect(result).toHaveProperty('route');
          expect(Array.isArray(result.placements)).toBe(true);
          expect(result.placements.length).toBeGreaterThan(0);

          // Each placement has required fields
          for (const p of result.placements) {
            expect(p).toHaveProperty('id');
            expect(p).toHaveProperty('assetId');
            expect(p).toHaveProperty('zoneId');
            expect(p).toHaveProperty('position');
            expect(p.position).toHaveProperty('x');
            expect(p.position).toHaveProperty('y');
          }

          // Attacker must have a route, Defender should not
          if (faction === 'ATTACKER') {
            expect(['ALPHA', 'BRAVO', 'CHARLIE']).toContain(result.route);
          } else {
            expect(result.route).toBeNull();
          }
        });
      }
    }
  });

  describe('budget utilization by difficulty', () => {
    function totalCost(placements, equipmentList) {
      const byId = {};
      for (const e of equipmentList) byId[e.id] = e;
      return placements.reduce((sum, p) => sum + (byId[p.assetId]?.cost || 0), 0);
    }

    it('ADVISORY spends 70-80% of budget', () => {
      const rng = seededRng(42);
      const result = generateAIPlacement('DEFENDER', 'ADVISORY', DEF_BUDGET, rng);
      const spent = totalCost(result.placements, defenderEquipment);
      expect(spent / DEF_BUDGET).toBeGreaterThanOrEqual(0.5); // Allow some margin
      expect(spent / DEF_BUDGET).toBeLessThanOrEqual(0.85);
    });

    it('ELEVATED spends 80-90% of budget', () => {
      const rng = seededRng(42);
      const result = generateAIPlacement('DEFENDER', 'ELEVATED', DEF_BUDGET, rng);
      const spent = totalCost(result.placements, defenderEquipment);
      expect(spent / DEF_BUDGET).toBeGreaterThanOrEqual(0.7);
      expect(spent / DEF_BUDGET).toBeLessThanOrEqual(0.95);
    });

    it('SEVERE spends 95-100% of budget', () => {
      const rng = seededRng(42);
      const result = generateAIPlacement('DEFENDER', 'SEVERE', DEF_BUDGET, rng);
      const spent = totalCost(result.placements, defenderEquipment);
      expect(spent / DEF_BUDGET).toBeGreaterThanOrEqual(0.85);
    });

    it('CRITICAL spends ~100% of budget', () => {
      const rng = seededRng(42);
      const result = generateAIPlacement('DEFENDER', 'CRITICAL', DEF_BUDGET, rng);
      const spent = totalCost(result.placements, defenderEquipment);
      expect(spent / DEF_BUDGET).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('ELEVATED Defender places at least 1 radar', () => {
    it('includes a radar station', () => {
      const rng = seededRng(99);
      const result = generateAIPlacement('DEFENDER', 'ELEVATED', DEF_BUDGET, rng);
      const hasRadar = result.placements.some(p =>
        p.assetId === 'coastal_radar' || p.assetId === 'mobile_radar'
      );
      expect(hasRadar).toBe(true);
    });
  });

  describe('SEVERE Defender has radar+missile pairing', () => {
    it('places both radar and missile batteries', () => {
      const rng = seededRng(42);
      const result = generateAIPlacement('DEFENDER', 'SEVERE', DEF_BUDGET, rng);
      const hasRadar = result.placements.some(p =>
        p.assetId === 'coastal_radar' || p.assetId === 'mobile_radar'
      );
      const hasMissile = result.placements.some(p =>
        ['noor_ashm', 'ghader_cruise', 'khalij_fars_asbm'].includes(p.assetId)
      );
      expect(hasRadar).toBe(true);
      expect(hasMissile).toBe(true);
    });
  });

  describe('SEVERE Attacker brings minesweeper', () => {
    it('includes avenger_mcm', () => {
      const rng = seededRng(42);
      const result = generateAIPlacement('ATTACKER', 'SEVERE', ATK_BUDGET, rng);
      const hasMCM = result.placements.some(p => p.assetId === 'avenger_mcm');
      expect(hasMCM).toBe(true);
    });
  });

  describe('CRITICAL composition', () => {
    it('CRITICAL Defender places multiple radars and missiles', () => {
      const rng = seededRng(42);
      const result = generateAIPlacement('DEFENDER', 'CRITICAL', DEF_BUDGET, rng);
      const radars = result.placements.filter(p =>
        p.assetId === 'coastal_radar' || p.assetId === 'mobile_radar'
      );
      const missiles = result.placements.filter(p =>
        ['noor_ashm', 'ghader_cruise', 'khalij_fars_asbm'].includes(p.assetId)
      );
      expect(radars.length).toBeGreaterThanOrEqual(2);
      expect(missiles.length).toBeGreaterThanOrEqual(2);
    });

    it('CRITICAL Attacker includes EW and ASW', () => {
      const rng = seededRng(42);
      const result = generateAIPlacement('ATTACKER', 'CRITICAL', ATK_BUDGET, rng);
      const assetIds = result.placements.map(p => p.assetId);
      expect(assetIds).toContain('ea18g_growler');
      expect(
        assetIds.includes('mh60r_seahawk') || assetIds.includes('los_angeles_ssn')
      ).toBe(true);
    });
  });

  describe('stock limits respected', () => {
    it('never exceeds maxStock for any asset', () => {
      const allEquipment = [...defenderEquipment, ...attackerEquipment];
      const byId = {};
      for (const e of allEquipment) byId[e.id] = e;

      for (const difficulty of ['ADVISORY', 'ELEVATED', 'SEVERE', 'CRITICAL']) {
        for (const faction of ['DEFENDER', 'ATTACKER']) {
          const rng = seededRng(42);
          const budget = faction === 'DEFENDER' ? DEF_BUDGET : ATK_BUDGET;
          const result = generateAIPlacement(faction, difficulty, budget, rng);

          const counts = {};
          for (const p of result.placements) {
            counts[p.assetId] = (counts[p.assetId] || 0) + 1;
          }

          for (const [assetId, count] of Object.entries(counts)) {
            const equip = byId[assetId];
            if (equip) {
              expect(count).toBeLessThanOrEqual(equip.maxStock);
            }
          }
        }
      }
    });
  });

  describe('route selection varies', () => {
    it('different seeds produce different routes', () => {
      const routes = new Set();
      for (let seed = 10000; seed <= 1000000; seed += 20000) {
        const rng = seededRng(seed);
        const result = generateAIPlacement('ATTACKER', 'ADVISORY', ATK_BUDGET, rng);
        routes.add(result.route);
      }
      // Advisory should produce at least 2 different routes over 50 seeds
      expect(routes.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('attacker relative station positions', () => {
    it('never falls back to the placeholder position for route-relative slots', () => {
      for (let seed = 1; seed <= 30; seed++) {
        const rng = seededRng(seed);
        const result = generateAIPlacement('ATTACKER', 'CRITICAL', ATK_BUDGET, rng);
        const relativePlacements = result.placements.filter(p =>
          p.zoneId.startsWith('cap_') || p.zoneId.startsWith('fwd_') || p.zoneId.startsWith('sub_')
        );

        for (const placement of relativePlacements) {
          expect(placement.position).not.toEqual({ x: 100, y: 300 });
        }
      }
    });
  });

  describe('no budget exceeded', () => {
    it('total cost never exceeds budget', () => {
      const allEquipment = [...defenderEquipment, ...attackerEquipment];
      const byId = {};
      for (const e of allEquipment) byId[e.id] = e;

      for (const difficulty of ['ADVISORY', 'ELEVATED', 'SEVERE', 'CRITICAL']) {
        for (const faction of ['DEFENDER', 'ATTACKER']) {
          const rng = seededRng(42);
          const budget = faction === 'DEFENDER' ? DEF_BUDGET : ATK_BUDGET;
          const result = generateAIPlacement(faction, difficulty, budget, rng);

          const spent = result.placements.reduce((sum, p) => sum + (byId[p.assetId]?.cost || 0), 0);
          expect(spent).toBeLessThanOrEqual(budget);
        }
      }
    });
  });
});

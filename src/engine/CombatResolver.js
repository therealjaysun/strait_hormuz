// CombatResolver — damage calculation, targeting AI, combat resolution
// GDD Section 7.2.3

import { COMBAT, MAP } from '../data/constants.js';
import { distance } from '../utils/geometry.js';

const NM_TO_WORLD = MAP.NM_TO_WORLD;

export default class CombatResolver {
  constructor(rng) {
    this.rng = rng;
  }

  /**
   * Select target for an entity from detected enemies.
   * Priority: 1) incoming drones/threats, 2) nearest combatant, 3) highest value
   */
  selectTarget(entity, detectedEnemies) {
    const weaponRangeWU = entity.weaponRange * NM_TO_WORLD;
    const inRange = detectedEnemies.filter(e =>
      !e.isDestroyed && distance(entity.position, e.position) <= weaponRangeWU
    );

    if (inRange.length === 0) return null;

    // Priority 1: incoming drones or entities targeting us
    const threats = inRange.filter(e => e.isDrone || e.currentTarget === entity.id);
    if (threats.length > 0) return this.closest(entity, threats);

    // Priority 2: tankers (for Defender), combatants (for Attacker)
    if (entity.faction === 'DEFENDER') {
      const tankers = inRange.filter(e => e.type === 'TANKER');
      if (tankers.length > 0) return this.closest(entity, tankers);
    }

    // Priority 3: nearest combatant
    const combatants = inRange.filter(e => e.type !== 'TANKER');
    if (combatants.length > 0) return this.closest(entity, combatants);

    // Fallback: highest value
    return inRange.sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
  }

  /**
   * Resolve a single combat engagement between attacker and target.
   * Returns event object or null if cannot fire.
   */
  resolveCombat(attacker, target, jammers) {
    if (attacker.reloadCooldown > 0) return null;
    if (attacker.isWinchester) return null;
    if (attacker.weaponRange === 0) return null;
    if (attacker.damage === 0) return null;

    // Check weapon range
    const weaponRangeWU = attacker.weaponRange * NM_TO_WORLD;
    if (distance(attacker.position, target.position) > weaponRangeWU) return null;

    const hitProb = this.calculateHitProbability(attacker, target, jammers);
    const roll = this.rng();

    // Consume ammo
    if (attacker.ammo !== Infinity) {
      attacker.ammo--;
      if (attacker.ammo <= 0) {
        attacker.ammo = 0;
        attacker.isWinchester = true;
      }
    }
    attacker.reloadCooldown = attacker.reloadTime;

    if (roll < hitProb) {
      let cmMitigation = COMBAT.CM_MITIGATION[target.countermeasures] || 0;
      // Emergency Evasion ability boost
      if (target.cmBoost) cmMitigation = Math.min(1, cmMitigation + target.cmBoost);
      const finalDamage = Math.round(attacker.damage * (1 - cmMitigation));
      target.hp -= finalDamage;

      const destroyed = target.hp <= 0;
      if (destroyed) {
        target.hp = 0;
        target.isDestroyed = true;
      }

      return {
        type: 'COMBAT_HIT',
        attackerId: attacker.id,
        targetId: target.id,
        damage: finalDamage,
        destroyed,
        attackerName: attacker.name,
        targetName: target.name,
      };
    }

    return {
      type: 'COMBAT_MISS',
      attackerId: attacker.id,
      targetId: target.id,
      attackerName: attacker.name,
      targetName: target.name,
    };
  }

  /**
   * Calculate hit probability with modifiers.
   * Base 80%, -30% if jammed, -10% if fast mover. Floor at 10%.
   */
  calculateHitProbability(attacker, target, jammers) {
    let prob = COMBAT.BASE_HIT_PROBABILITY;

    // EW jamming penalty — check if attacker is in enemy jammer radius
    for (const j of jammers) {
      if (j.faction === attacker.faction) continue;
      if (j.isDestroyed) continue;
      if (distance(attacker.position, j.position) <= j.jammingRadius * NM_TO_WORLD) {
        prob += COMBAT.EW_JAMMING_PENALTY;
        break;
      }
    }

    // Fast mover penalty
    if (target.speed > COMBAT.FAST_MOVER_THRESHOLD) {
      prob += COMBAT.FAST_MOVER_PENALTY;
    }

    return Math.max(0.10, prob);
  }

  /**
   * Find the closest entity to a reference entity.
   */
  closest(ref, entities) {
    let best = null;
    let bestDist = Infinity;
    for (const e of entities) {
      const d = distance(ref.position, e.position);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }
}

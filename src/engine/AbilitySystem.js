// AbilitySystem — player intervention abilities with cooldowns and effects
// GDD Section 7.3

import { ABILITIES, MAP } from '../data/constants.js';
import { distance } from '../utils/geometry.js';

const NM_TO_WORLD = MAP.NM_TO_WORLD;

export default class AbilitySystem {
  constructor(playerFaction) {
    this.playerFaction = playerFaction;
    const defs = ABILITIES[playerFaction] || [];

    // Initialize ability states
    this.abilities = defs.map(def => ({
      ...def,
      cooldownRemaining: 0,
      usesRemaining: def.maxUses ?? Infinity,
      isReady: true,
      isExpended: false,
    }));
  }

  /**
   * Update cooldowns each tick.
   */
  update(deltaTime) {
    for (const ability of this.abilities) {
      if (ability.cooldownRemaining > 0) {
        ability.cooldownRemaining = Math.max(0, ability.cooldownRemaining - deltaTime);
        if (ability.cooldownRemaining === 0 && !ability.isExpended) {
          ability.isReady = true;
        }
      }
    }
  }

  /**
   * Activate an ability. Returns an event object or null if invalid.
   */
  activate(abilityId, engine, target) {
    const ability = this.abilities.find(a => a.id === abilityId);
    if (!ability || !ability.isReady || ability.isExpended) return null;

    // Apply effect
    const event = this.applyEffect(ability, engine, target);
    if (!event) return null;

    // Start cooldown
    ability.cooldownRemaining = ability.cooldown;
    ability.isReady = false;

    // Decrement uses
    if (ability.usesRemaining !== Infinity) {
      ability.usesRemaining--;
      if (ability.usesRemaining <= 0) {
        ability.isExpended = true;
        ability.isReady = false;
      }
    }

    return event;
  }

  /**
   * Apply the effect of an ability.
   */
  applyEffect(ability, engine, target) {
    switch (ability.id) {
      case 'concentrate_fire':
        return this.concentrateFire(engine, target);
      case 'scramble_reserves':
        return this.scrambleReserves(engine);
      case 'activate_decoys':
        return this.activateDecoys(engine, target);
      case 'emergency_evasion':
        return this.emergencyEvasion(engine, target);
      case 'tomahawk_strike':
        return this.tomahawkStrike(engine, target);
      case 'smoke_screen':
        return this.smokeScreen(engine, target);
      default:
        return null;
    }
  }

  // --- Defender Abilities ---

  concentrateFire(engine, targetEntity) {
    if (!targetEntity || targetEntity.isDestroyed) return null;

    const radius = 10 * NM_TO_WORLD;
    const nearby = engine.entities.filter(e =>
      e.faction === 'DEFENDER' && !e.isDestroyed &&
      distance(e.position, targetEntity.position) <= radius
    );

    for (const e of nearby) {
      e.forcedTarget = targetEntity.id;
      e.forcedTargetExpiry = engine.gameTime + 15;
    }

    return {
      type: 'ABILITY_ACTIVATED',
      abilityName: 'CONCENTRATE FIRE',
      details: `${nearby.length} assets targeting ${targetEntity.name}`,
      targetPosition: { ...targetEntity.position },
    };
  }

  scrambleReserves(engine) {
    // Spawn 2 Thondar FAC at a random naval zone position
    const spawnX = 200 + engine.rng() * 300;
    const spawnY = 100 + engine.rng() * 400;

    for (let i = 0; i < 2; i++) {
      const id = `reserve_fac_${engine.entities.length}`;
      engine.entities.push({
        id,
        assetId: 'thondar_fac',
        name: `Reserve FAC-${i + 1}`,
        faction: 'DEFENDER',
        type: 'SURFACE',
        position: { x: spawnX + i * 20, y: spawnY },
        homePosition: { x: spawnX + i * 20, y: spawnY },
        rotation: 0,
        speed: 45,
        hp: 30,
        maxHp: 30,
        damage: 60,
        weaponRange: 8,
        radarRange: 15,
        reloadTime: 10,
        ammo: 8,
        maxAmmo: 8,
        signature: 'LOW',
        countermeasures: 'BASIC',
        isDestroyed: false,
        hasEscaped: false,
        isWinchester: false,
        currentTarget: null,
        reloadCooldown: 0,
        detectedBy: new Set(),
        assignedZone: null,
        cost: 0,
        isDrone: false,
        isJamming: false,
        jammingRadius: 0,
        isMinesweeper: false,
        sweepRadius: 0,
        isASW: false,
        sonarRange: 0,
        isRadar: false,
        isCoastalMissile: false,
        category: 'NAVAL',
        patrolAngle: null,
        engageTarget: null,
        signatureBoostUntil: 0,
      });
    }

    return {
      type: 'ABILITY_ACTIVATED',
      abilityName: 'SCRAMBLE RESERVES',
      details: '2 Thondar FAC deployed',
      targetPosition: { x: spawnX, y: spawnY },
    };
  }

  activateDecoys(engine, point) {
    if (!point) return null;

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const offset = 2 * NM_TO_WORLD;
      const id = `decoy_${engine.entities.length}`;
      engine.entities.push({
        id,
        assetId: 'decoy',
        name: `Decoy-${i + 1}`,
        faction: 'DEFENDER',
        type: 'SURFACE',
        position: {
          x: point.x + Math.cos(angle) * offset,
          y: point.y + Math.sin(angle) * offset,
        },
        homePosition: { ...point },
        rotation: 0,
        speed: 0,
        hp: 1,
        maxHp: 1,
        damage: 0,
        weaponRange: 0,
        radarRange: 0,
        reloadTime: 0,
        ammo: 0,
        maxAmmo: 0,
        signature: 'HIGH',
        countermeasures: 'NONE',
        isDestroyed: false,
        hasEscaped: false,
        isWinchester: false,
        currentTarget: null,
        reloadCooldown: 0,
        detectedBy: new Set(),
        assignedZone: null,
        cost: 0,
        isDrone: false,
        isJamming: false,
        jammingRadius: 0,
        isMinesweeper: false,
        sweepRadius: 0,
        isASW: false,
        sonarRange: 0,
        isRadar: false,
        isCoastalMissile: false,
        category: 'DECOY',
        patrolAngle: null,
        engageTarget: null,
        signatureBoostUntil: 0,
        isDecoy: true,
        expiresAt: engine.gameTime + 20,
      });
    }

    return {
      type: 'ABILITY_ACTIVATED',
      abilityName: 'ACTIVATE DECOYS',
      details: '3 radar decoys deployed',
      targetPosition: { ...point },
    };
  }

  // --- Attacker Abilities ---

  emergencyEvasion(engine, tankerEntity) {
    if (!tankerEntity || tankerEntity.type !== 'TANKER' || tankerEntity.isDestroyed) return null;

    tankerEntity.cmBoost = 0.50;
    tankerEntity.cmBoostExpiry = engine.gameTime + 15;

    return {
      type: 'ABILITY_ACTIVATED',
      abilityName: 'EMERGENCY EVASION',
      details: `${tankerEntity.name} evasive maneuver`,
      targetPosition: { ...tankerEntity.position },
    };
  }

  tomahawkStrike(engine, targetEntity) {
    if (!targetEntity || targetEntity.type !== 'FIXED' || targetEntity.isDestroyed) return null;

    const dmg = 200;
    targetEntity.hp -= dmg;
    const destroyed = targetEntity.hp <= 0;
    if (destroyed) {
      targetEntity.hp = 0;
      targetEntity.isDestroyed = true;
      engine.destroyedEntities.push(targetEntity);
    }

    return {
      type: 'ABILITY_ACTIVATED',
      abilityName: 'TOMAHAWK STRIKE',
      details: `${targetEntity.name} struck — ${dmg} DMG${destroyed ? ' — DESTROYED' : ''}`,
      targetPosition: { ...targetEntity.position },
      damage: dmg,
      destroyed,
      targetId: targetEntity.id,
      targetName: targetEntity.name,
    };
  }

  smokeScreen(engine, point) {
    if (!point) return null;

    const radius = 5 * NM_TO_WORLD;
    const nearby = engine.entities.filter(e =>
      e.faction === 'ATTACKER' && !e.isDestroyed &&
      distance(e.position, point) <= radius
    );

    for (const e of nearby) {
      e.signatureOverride = 'LOW';
      e.signatureOverrideExpiry = engine.gameTime + 20;
    }

    // Store smoke zone for rendering
    if (!engine.smokeZones) engine.smokeZones = [];
    engine.smokeZones.push({
      position: { ...point },
      radius,
      expiresAt: engine.gameTime + 20,
    });

    return {
      type: 'ABILITY_ACTIVATED',
      abilityName: 'SMOKE SCREEN',
      details: `${nearby.length} assets concealed`,
      targetPosition: { ...point },
    };
  }

  /**
   * Process per-tick ability effects (expiring overrides, decoy cleanup).
   */
  processTickEffects(engine) {
    for (const entity of engine.entities) {
      // Expire forced targets
      if (entity.forcedTarget && entity.forcedTargetExpiry && engine.gameTime > entity.forcedTargetExpiry) {
        entity.forcedTarget = null;
        entity.forcedTargetExpiry = null;
      }

      // Expire CM boosts
      if (entity.cmBoost && entity.cmBoostExpiry && engine.gameTime > entity.cmBoostExpiry) {
        entity.cmBoost = 0;
        entity.cmBoostExpiry = null;
      }

      // Expire signature overrides
      if (entity.signatureOverride && entity.signatureOverrideExpiry && engine.gameTime > entity.signatureOverrideExpiry) {
        entity.signatureOverride = null;
        entity.signatureOverrideExpiry = null;
      }

      // Expire decoys
      if (entity.isDecoy && entity.expiresAt && engine.gameTime > entity.expiresAt) {
        entity.isDestroyed = true;
      }
    }

    // Clean up expired smoke zones
    if (engine.smokeZones) {
      engine.smokeZones = engine.smokeZones.filter(z => engine.gameTime < z.expiresAt);
    }
  }

  /**
   * Get ability states for UI rendering.
   */
  getAbilityStates() {
    return this.abilities.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      cooldown: a.cooldown,
      cooldownRemaining: a.cooldownRemaining,
      isReady: a.isReady,
      isExpended: a.isExpended,
      requiresTarget: a.requiresTarget,
      usesRemaining: a.usesRemaining,
    }));
  }
}

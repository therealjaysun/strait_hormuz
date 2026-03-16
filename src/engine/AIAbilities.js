// AIAbilities — AI ability usage during simulation, scaled by difficulty
// GDD Section 9.1

import AbilitySystem from './AbilitySystem.js';
import { distance } from '../utils/geometry.js';
import { MAP } from '../data/constants.js';

const NM_TO_WORLD = MAP.NM_TO_WORLD;

/**
 * AI ability controller — wraps an AbilitySystem and decides when to use abilities.
 */
export default class AIAbilities {
  constructor(aiFaction, difficulty) {
    this.aiFaction = aiFaction;
    this.difficulty = difficulty;
    this.abilitySystem = new AbilitySystem(aiFaction);
    this.lastDamageCheck = 0;
    this.assetsLostSinceLastCheck = 0;
    this.enabled = difficulty !== 'ADVISORY';
  }

  /**
   * Called every simulation tick. Updates cooldowns and decides ability usage.
   */
  update(engine, deltaTime) {
    if (!this.enabled) return;

    this.abilitySystem.update(deltaTime);
    this.abilitySystem.processTickEffects(engine);

    switch (this.difficulty) {
      case 'ELEVATED':
        this.updateReactive(engine);
        break;
      case 'SEVERE':
        this.updateProactive(engine);
        break;
      case 'CRITICAL':
        this.updateOptimal(engine);
        break;
    }
  }

  // ── ELEVATED: reactive — use abilities after taking damage ──

  updateReactive(engine) {
    // Check for recent losses every 5 game seconds
    if (engine.gameTime - this.lastDamageCheck < 5) return;
    this.lastDamageCheck = engine.gameTime;

    const recentDestroyedEvents = engine.events.filter(e =>
      e.type === 'ASSET_DESTROYED' &&
      e.data.faction === this.aiFaction &&
      e.gameTime > engine.gameTime - 10
    );

    if (recentDestroyedEvents.length === 0) return;

    // React to losses
    if (this.aiFaction === 'DEFENDER') {
      this.tryDefenderReactive(engine, recentDestroyedEvents);
    } else {
      this.tryAttackerReactive(engine, recentDestroyedEvents);
    }
  }

  tryDefenderReactive(engine, recentEvents) {
    // Concentrate Fire on the entity that destroyed our asset
    const cf = this.abilitySystem.abilities.find(a => a.id === 'concentrate_fire');
    if (cf && cf.isReady && !cf.isExpended) {
      const destroyerName = recentEvents[0].data.destroyedBy;
      const target = engine.entities.find(e =>
        e.name === destroyerName && !e.isDestroyed &&
        e.faction !== this.aiFaction &&
        e.detectedBy.has(this.aiFaction)
      );
      if (target) {
        this.activateAbility('concentrate_fire', engine, target);
        return;
      }
    }

    // Scramble Reserves if we lost assets
    const sr = this.abilitySystem.abilities.find(a => a.id === 'scramble_reserves');
    if (sr && sr.isReady && !sr.isExpended) {
      this.activateAbility('scramble_reserves', engine, null);
    }
  }

  tryAttackerReactive(engine, recentEvents) {
    // Emergency Evasion on damaged tanker
    const ee = this.abilitySystem.abilities.find(a => a.id === 'emergency_evasion');
    if (ee && ee.isReady && !ee.isExpended) {
      const damagedTanker = engine.entities.find(e =>
        e.type === 'TANKER' && !e.isDestroyed && !e.hasEscaped && e.hp < e.maxHp
      );
      if (damagedTanker) {
        this.activateAbility('emergency_evasion', engine, damagedTanker);
        return;
      }
    }

    // Smoke Screen near damaged tankers
    const ss = this.abilitySystem.abilities.find(a => a.id === 'smoke_screen');
    if (ss && ss.isReady && !ss.isExpended) {
      const tankerUnderFire = engine.entities.find(e =>
        e.type === 'TANKER' && !e.isDestroyed && !e.hasEscaped && e.hp < e.maxHp
      );
      if (tankerUnderFire) {
        this.activateAbility('smoke_screen', engine, { ...tankerUnderFire.position });
        return;
      }
    }
  }

  // ── SEVERE: proactive — use abilities on cooldown when targets exist ──

  updateProactive(engine) {
    if (this.aiFaction === 'DEFENDER') {
      this.proactiveDefender(engine);
    } else {
      this.proactiveAttacker(engine);
    }
  }

  proactiveDefender(engine) {
    // Concentrate Fire on highest-value detected enemy
    const cf = this.abilitySystem.abilities.find(a => a.id === 'concentrate_fire');
    if (cf && cf.isReady && !cf.isExpended) {
      const enemies = engine.entities.filter(e =>
        e.faction !== this.aiFaction && !e.isDestroyed &&
        e.type !== 'MINE' &&
        e.detectedBy.has(this.aiFaction)
      );
      if (enemies.length > 0) {
        // Prioritize tankers, then highest cost
        const target = enemies.sort((a, b) => {
          if (a.type === 'TANKER' && b.type !== 'TANKER') return -1;
          if (b.type === 'TANKER' && a.type !== 'TANKER') return 1;
          return (b.cost || 0) - (a.cost || 0);
        })[0];
        this.activateAbility('concentrate_fire', engine, target);
        return;
      }
    }

    // Scramble Reserves
    const sr = this.abilitySystem.abilities.find(a => a.id === 'scramble_reserves');
    if (sr && sr.isReady && !sr.isExpended) {
      this.activateAbility('scramble_reserves', engine, null);
      return;
    }

    // Activate Decoys near enemy fleet
    const ad = this.abilitySystem.abilities.find(a => a.id === 'activate_decoys');
    if (ad && ad.isReady && !ad.isExpended) {
      const tanker = engine.entities.find(e => e.type === 'TANKER' && !e.isDestroyed && !e.hasEscaped);
      if (tanker) {
        // Place decoys ahead of the convoy to draw fire
        this.activateAbility('activate_decoys', engine, {
          x: tanker.position.x + 50,
          y: tanker.position.y + (Math.random() > 0.5 ? 30 : -30),
        });
      }
    }
  }

  proactiveAttacker(engine) {
    // Tomahawk Strike on highest-value radar
    const ts = this.abilitySystem.abilities.find(a => a.id === 'tomahawk_strike');
    if (ts && ts.isReady && !ts.isExpended) {
      const radars = engine.entities.filter(e =>
        e.type === 'FIXED' && !e.isDestroyed &&
        e.isRadar &&
        e.detectedBy.has(this.aiFaction)
      );
      if (radars.length > 0) {
        // Target the one with largest radar range
        const target = radars.sort((a, b) => b.radarRange - a.radarRange)[0];
        this.activateAbility('tomahawk_strike', engine, target);
        return;
      }
    }

    // Emergency Evasion on tanker under fire
    const ee = this.abilitySystem.abilities.find(a => a.id === 'emergency_evasion');
    if (ee && ee.isReady && !ee.isExpended) {
      const tankerUnderFire = engine.entities.find(e =>
        e.type === 'TANKER' && !e.isDestroyed && !e.hasEscaped && e.hp < e.maxHp * 0.8
      );
      if (tankerUnderFire) {
        this.activateAbility('emergency_evasion', engine, tankerUnderFire);
        return;
      }
    }

    // Smoke Screen proactively near convoy
    const ss = this.abilitySystem.abilities.find(a => a.id === 'smoke_screen');
    if (ss && ss.isReady && !ss.isExpended) {
      const tanker = engine.entities.find(e => e.type === 'TANKER' && !e.isDestroyed && !e.hasEscaped);
      if (tanker) {
        this.activateAbility('smoke_screen', engine, { ...tanker.position });
      }
    }
  }

  // ── CRITICAL: optimal — times abilities for maximum impact ──

  updateOptimal(engine) {
    if (this.aiFaction === 'DEFENDER') {
      this.optimalDefender(engine);
    } else {
      this.optimalAttacker(engine);
    }
  }

  optimalDefender(engine) {
    // Concentrate Fire when multiple assets can target a high-value enemy
    const cf = this.abilitySystem.abilities.find(a => a.id === 'concentrate_fire');
    if (cf && cf.isReady && !cf.isExpended) {
      const tankers = engine.entities.filter(e =>
        e.type === 'TANKER' && !e.isDestroyed && !e.hasEscaped &&
        e.detectedBy.has(this.aiFaction)
      );
      for (const tanker of tankers) {
        // Count friendly assets that can fire on this tanker
        const radius = 10 * NM_TO_WORLD;
        const nearbyFriendly = engine.entities.filter(e =>
          e.faction === this.aiFaction && !e.isDestroyed &&
          e.damage > 0 && e.weaponRange > 0 &&
          distance(e.position, tanker.position) <= radius
        );
        if (nearbyFriendly.length >= 2) {
          this.activateAbility('concentrate_fire', engine, tanker);
          return;
        }
      }
    }

    // Scramble Reserves when forward screen is engaged
    const sr = this.abilitySystem.abilities.find(a => a.id === 'scramble_reserves');
    if (sr && sr.isReady && !sr.isExpended) {
      const engagedEnemies = engine.entities.filter(e =>
        e.faction !== this.aiFaction && !e.isDestroyed &&
        e.currentTarget !== null &&
        e.detectedBy.has(this.aiFaction)
      );
      if (engagedEnemies.length >= 2) {
        this.activateAbility('scramble_reserves', engine, null);
        return;
      }
    }

    // Activate Decoys to draw fire from high-value assets
    const ad = this.abilitySystem.abilities.find(a => a.id === 'activate_decoys');
    if (ad && ad.isReady && !ad.isExpended) {
      // Place decoys near our most valuable assets under threat
      const threatenedAsset = engine.entities.find(e =>
        e.faction === this.aiFaction && !e.isDestroyed &&
        e.isRadar && e.detectedBy.has(e.faction === 'DEFENDER' ? 'ATTACKER' : 'DEFENDER')
      );
      if (threatenedAsset) {
        this.activateAbility('activate_decoys', engine, {
          x: threatenedAsset.position.x + 30,
          y: threatenedAsset.position.y,
        });
      }
    }
  }

  optimalAttacker(engine) {
    // Tomahawk Strike: target highest-value radar station
    const ts = this.abilitySystem.abilities.find(a => a.id === 'tomahawk_strike');
    if (ts && ts.isReady && !ts.isExpended) {
      const radars = engine.entities.filter(e =>
        e.type === 'FIXED' && !e.isDestroyed && e.isRadar &&
        e.detectedBy.has(this.aiFaction)
      );
      if (radars.length > 0) {
        const target = radars.sort((a, b) => b.radarRange - a.radarRange)[0];
        this.activateAbility('tomahawk_strike', engine, target);
        return;
      }
    }

    // Emergency Evasion on the tanker with lowest HP when under fire
    const ee = this.abilitySystem.abilities.find(a => a.id === 'emergency_evasion');
    if (ee && ee.isReady && !ee.isExpended) {
      const tankers = engine.entities.filter(e =>
        e.type === 'TANKER' && !e.isDestroyed && !e.hasEscaped && e.hp < e.maxHp
      );
      if (tankers.length > 0) {
        const lowestHp = tankers.sort((a, b) => a.hp - b.hp)[0];
        // Only use when tanker is actively taking fire (recent combat events)
        const recentHits = engine.events.filter(e =>
          e.type === 'COMBAT_HIT' && e.data.targetId === lowestHp.id &&
          e.gameTime > engine.gameTime - 5
        );
        if (recentHits.length > 0) {
          this.activateAbility('emergency_evasion', engine, lowestHp);
          return;
        }
      }
    }

    // Smoke Screen when missiles are incoming toward convoy
    const ss = this.abilitySystem.abilities.find(a => a.id === 'smoke_screen');
    if (ss && ss.isReady && !ss.isExpended) {
      // Check for recent hits on attacker assets
      const recentHits = engine.events.filter(e =>
        e.type === 'COMBAT_HIT' &&
        e.data.attackerFaction === 'DEFENDER' &&
        e.gameTime > engine.gameTime - 5
      );
      if (recentHits.length >= 2) {
        // Deploy smoke on the convoy center
        const tanker = engine.entities.find(e =>
          e.type === 'TANKER' && !e.isDestroyed && !e.hasEscaped
        );
        if (tanker) {
          this.activateAbility('smoke_screen', engine, { ...tanker.position });
        }
      }
    }
  }

  // ── Shared ──

  activateAbility(abilityId, engine, target) {
    const event = this.abilitySystem.activate(abilityId, engine, target);
    if (event) {
      engine.events.push({
        tick: engine.currentTick,
        gameTime: engine.gameTime,
        type: event.type,
        data: event,
      });
    }
  }
}

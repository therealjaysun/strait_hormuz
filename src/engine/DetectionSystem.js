// DetectionSystem — radar/sonar detection, fog of war, EW jamming
// GDD Section 7.2.2

import { MAP, DETECTION_DELAY, SIGNATURE_RANGE_MULTIPLIER } from '../data/constants.js';
import { distance } from '../utils/geometry.js';

const NM_TO_WORLD = MAP.NM_TO_WORLD;

// Tracking memory — seconds before a lost contact fades
const TRACKING_MEMORY = 10;

function isDetectionEligible(entity) {
  return entity.type !== 'AIR' || entity.missionPhase !== 'TRANSIT';
}

export default class DetectionSystem {
  constructor() {
    // Map: targetId → { faction, detectedAt (gameTime), confirmed }
    this.pendingDetections = new Map();
    // Map: targetId → { faction, lastSeenAt (gameTime) }
    this.trackingMemory = new Map();
  }

  /**
   * Run detection for all entities. Updates entity.detectedBy sets.
   */
  update(entities, gameTime) {
    // Gather jammers
    const jammers = entities.filter(e => !e.isDestroyed && e.isJamming && isDetectionEligible(e));

    for (const detector of entities) {
      if (detector.isDestroyed || detector.radarRange === 0) continue;
      if (!isDetectionEligible(detector)) continue;

      const radarRangeWU = this.getEffectiveRadarRange(detector, jammers);

      for (const target of entities) {
        if (target.faction === detector.faction) continue;
        if (target.isDestroyed) continue;
        if (!isDetectionEligible(target)) continue;

        // Submarines: only detectable by ASW assets
        if (target.type === 'SUBSURFACE') {
          if (!detector.isASW && target.type === 'SUBSURFACE') {
            // Los Angeles SSN can detect subs (it's a sub with isASW-like capability via radarRange)
            // P-8 and MH-60R have isASW flag
            // Regular surface radar cannot detect subs
            if (!detector.isASW && detector.type !== 'SUBSURFACE') continue;
          }
        }

        // Mines are invisible to radar
        if (target.type === 'MINE') continue;

        const dist = distance(detector.position, target.position);
        // Use signature override (from Smoke Screen ability) if active
        const sig = target.signatureOverride || target.signature;
        const sigMult = SIGNATURE_RANGE_MULTIPLIER[sig] || 1;
        const effectiveRange = radarRangeWU * sigMult;

        if (dist <= effectiveRange) {
          this.processDetection(detector, target, gameTime);
        }
      }
    }

    // Expire tracking memory
    this.expireTracking(entities, gameTime);
  }

  /**
   * Get effective radar range in world units, accounting for EW jamming.
   */
  getEffectiveRadarRange(detector, jammers) {
    let rangeWU = detector.radarRange * NM_TO_WORLD;

    // Check if detector is within any jammer's radius
    for (const jammer of jammers) {
      if (jammer.faction === detector.faction) continue; // Friendly jammer doesn't affect us
      const dist = distance(detector.position, jammer.position);
      if (dist <= jammer.jammingRadius * NM_TO_WORLD) {
        rangeWU *= 0.5; // 50% range reduction
        break; // Only one jamming penalty applies
      }
    }

    return rangeWU;
  }

  /**
   * Check if a specific position is jammed by an enemy Growler.
   */
  isPositionJammed(position, faction, jammers) {
    for (const jammer of jammers) {
      if (jammer.faction === faction) continue;
      if (jammer.isDestroyed) continue;
      const dist = distance(position, jammer.position);
      if (dist <= jammer.jammingRadius * NM_TO_WORLD) {
        return true;
      }
    }
    return false;
  }

  /**
   * Process a detection event — handle delay by signature.
   */
  processDetection(detector, target, gameTime) {
    const delay = DETECTION_DELAY[target.signature] || 0;
    const key = `${target.id}::${detector.faction}`;

    if (delay === 0) {
      // Instant detection
      if (!target.detectedBy.has(detector.faction)) {
        target.detectedBy.add(detector.faction);
        this.trackingMemory.set(key, { targetId: target.id, faction: detector.faction, lastSeenAt: gameTime });
        return { type: 'CONTACT_DETECTED', detector, target };
      }
      this.trackingMemory.set(key, { targetId: target.id, faction: detector.faction, lastSeenAt: gameTime });
      return null;
    }

    // Delayed detection
    if (!this.pendingDetections.has(key)) {
      this.pendingDetections.set(key, { faction: detector.faction, detectedAt: gameTime });
    }

    const pending = this.pendingDetections.get(key);
    if (gameTime - pending.detectedAt >= delay) {
      if (!target.detectedBy.has(detector.faction)) {
        target.detectedBy.add(detector.faction);
        this.trackingMemory.set(key, { targetId: target.id, faction: detector.faction, lastSeenAt: gameTime });
        this.pendingDetections.delete(key);
        return { type: 'CONTACT_DETECTED', detector, target };
      }
      this.trackingMemory.set(key, { targetId: target.id, faction: detector.faction, lastSeenAt: gameTime });
    }

    return null;
  }

  /**
   * Expire contacts that are no longer in radar range for > TRACKING_MEMORY seconds.
   */
  expireTracking(entities, gameTime) {
    for (const [key, tracking] of this.trackingMemory.entries()) {
      if (gameTime - tracking.lastSeenAt > TRACKING_MEMORY) {
        const target = entities.find(e => e.id === tracking.targetId);
        if (target && target.detectedBy.has(tracking.faction)) {
          target.detectedBy.delete(tracking.faction);
        }
        this.trackingMemory.delete(key);
      }
    }
  }

  /**
   * Check if a target position is covered by any friendly radar.
   * Used for coastal missile batteries that need radar to fire.
   */
  hasRadarCoverage(targetPosition, faction, entities, jammers) {
    for (const e of entities) {
      if (e.isDestroyed) continue;
      if (e.faction !== faction) continue;
      if (e.radarRange === 0) continue;
      if (!isDetectionEligible(e)) continue;

      const rangeWU = this.getEffectiveRadarRange(e, jammers);
      if (distance(e.position, targetPosition) <= rangeWU) {
        return true;
      }
    }
    return false;
  }
}

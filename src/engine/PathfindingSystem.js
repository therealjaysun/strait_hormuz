// PathfindingSystem — convoy movement, escort formation, patrol patterns
// GDD Sections 7.2.1, 11.3

import { ROUTES } from '../data/mapData.js';
import { MAP } from '../data/constants.js';
import { distance, angleBetween, lerpPoint, segmentLength } from '../utils/geometry.js';

const NM_TO_WORLD = MAP.NM_TO_WORLD;

// Tanker spacing along route (world units between each tanker)
const TANKER_SPACING = 40;
// Convoy speed in knots
const CONVOY_SPEED_KT = 25;
// Convoy speed in world units per second
const CONVOY_SPEED = CONVOY_SPEED_KT * NM_TO_WORLD / 3600;

// Formation offsets from convoy center (world units)
const FORMATION_OFFSETS = {
  convoy_lead: { dx: 50, dy: 0 },
  convoy_port: { dx: 0, dy: -35 },
  convoy_starboard: { dx: 0, dy: 35 },
  convoy_rear: { dx: -50, dy: 0 },
  convoy_center: { dx: 0, dy: 0 },
  fwd_0: { dx: 120, dy: -20 },
  fwd_1: { dx: 120, dy: 20 },
  fwd_2: { dx: 160, dy: -30 },
  fwd_3: { dx: 160, dy: 30 },
};

export default class PathfindingSystem {
  constructor(routeKey) {
    this.routeKey = routeKey;
    this.waypoints = ROUTES[routeKey].waypoints;
    this.routeLength = segmentLength(this.waypoints);
  }

  /**
   * Initialize tanker starting positions along the route.
   * Returns array of { progress, position, rotation } for 5 tankers.
   */
  initTankerPositions() {
    const positions = [];
    for (let i = 0; i < 5; i++) {
      // Tankers start staggered at the west edge
      const distOffset = i * TANKER_SPACING;
      const progress = Math.max(0, -distOffset / this.routeLength);
      positions.push({
        progress: Math.abs(progress),
        startDelay: distOffset / CONVOY_SPEED, // seconds until this tanker enters
      });
    }
    return positions;
  }

  /**
   * Advance a tanker along the route.
   * @returns true if tanker has escaped (reached end)
   */
  updateTankerPosition(tanker, deltaTime) {
    if (tanker.isDestroyed || tanker.hasEscaped) return false;

    // If tanker hasn't entered yet, decrement delay
    if (tanker.startDelay > 0) {
      tanker.startDelay -= deltaTime;
      if (tanker.startDelay > 0) return false;
      // Overflow into movement
      deltaTime = -tanker.startDelay;
      tanker.startDelay = 0;
    }

    const advanceDist = CONVOY_SPEED * deltaTime;
    tanker.distanceTraveled = (tanker.distanceTraveled || 0) + advanceDist;
    tanker.progress = tanker.distanceTraveled / this.routeLength;

    if (tanker.progress >= 1.0) {
      tanker.hasEscaped = true;
      tanker.progress = 1.0;
      tanker.position = { ...this.waypoints[this.waypoints.length - 1] };
      return true;
    }

    // Find position along route
    const pos = this.getPositionAtProgress(tanker.progress);
    const nextPos = this.getPositionAtProgress(Math.min(1, tanker.progress + 0.01));
    tanker.position = pos;
    tanker.rotation = angleBetween(pos, nextPos);
    return false;
  }

  /**
   * Get the average position of all active tankers (convoy center).
   */
  getConvoyCenter(tankers) {
    const active = tankers.filter(t => !t.isDestroyed && !t.hasEscaped && t.startDelay <= 0);
    if (active.length === 0) return this.getPositionAtProgress(0);
    const sum = active.reduce((acc, t) => ({ x: acc.x + t.position.x, y: acc.y + t.position.y }), { x: 0, y: 0 });
    return { x: sum.x / active.length, y: sum.y / active.length };
  }

  /**
   * Get the lead tanker's progress (for escort formation reference).
   */
  getLeadTankerProgress(tankers) {
    let maxProgress = 0;
    for (const t of tankers) {
      if (!t.isDestroyed && !t.hasEscaped && t.startDelay <= 0) {
        maxProgress = Math.max(maxProgress, t.progress || 0);
      }
    }
    return maxProgress;
  }

  /**
   * Update escort formation positions relative to the convoy.
   */
  updateEscortPosition(escort, tankers, deltaTime) {
    if (escort.isDestroyed) return;

    const offset = FORMATION_OFFSETS[escort.assignedZone];
    if (!offset) return; // Not a formation escort

    const center = this.getConvoyCenter(tankers);
    const leadProgress = this.getLeadTankerProgress(tankers);
    const heading = leadProgress < 1
      ? angleBetween(
          this.getPositionAtProgress(Math.max(0, leadProgress - 0.01)),
          this.getPositionAtProgress(Math.min(1, leadProgress + 0.01))
        )
      : 0;

    // Rotate offset by convoy heading
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    const targetX = center.x + offset.dx * cos - offset.dy * sin;
    const targetY = center.y + offset.dx * sin + offset.dy * cos;

    // Move toward target position at escort's speed
    const speedWU = escort.speed * NM_TO_WORLD / 3600;
    const maxMove = speedWU * deltaTime;
    const dx = targetX - escort.position.x;
    const dy = targetY - escort.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < maxMove) {
      escort.position = { x: targetX, y: targetY };
    } else {
      escort.position = {
        x: escort.position.x + (dx / dist) * maxMove,
        y: escort.position.y + (dy / dist) * maxMove,
      };
    }
    escort.rotation = angleBetween(escort.position, { x: targetX, y: targetY });
  }

  /**
   * Update mobile defender assets — patrol within zone area.
   */
  updatePatrolAsset(entity, deltaTime, rng) {
    if (entity.isDestroyed) return;

    // If entity has a target and is engaging, move toward it
    if (entity.engageTarget) {
      const speedWU = entity.speed * NM_TO_WORLD / 3600;
      const maxMove = speedWU * deltaTime;
      const dx = entity.engageTarget.x - entity.position.x;
      const dy = entity.engageTarget.y - entity.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxMove) {
        entity.position = {
          x: entity.position.x + (dx / dist) * maxMove,
          y: entity.position.y + (dy / dist) * maxMove,
        };
      }
      entity.rotation = angleBetween(entity.position, entity.engageTarget);
      return;
    }

    // Orbit patrol around home position
    if (!entity.patrolAngle) {
      entity.patrolAngle = rng() * Math.PI * 2;
    }

    const orbitSpeed = entity.type === 'AIR' ? 0.3 : 0.05; // radians per second
    const orbitRadius = entity.type === 'AIR' ? 40 : 15;
    entity.patrolAngle += orbitSpeed * deltaTime;

    const home = entity.homePosition || entity.position;
    const targetX = home.x + Math.cos(entity.patrolAngle) * orbitRadius;
    const targetY = home.y + Math.sin(entity.patrolAngle) * orbitRadius;

    const speedWU = Math.min(entity.speed * NM_TO_WORLD / 3600, 15); // cap patrol movement
    const maxMove = speedWU * deltaTime;
    const dx = targetX - entity.position.x;
    const dy = targetY - entity.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      const move = Math.min(maxMove, dist);
      entity.position = {
        x: entity.position.x + (dx / dist) * move,
        y: entity.position.y + (dy / dist) * move,
      };
      entity.rotation = angleBetween(entity.position, { x: targetX, y: targetY });
    }
  }

  /**
   * Get world position at a given progress (0-1) along the route.
   */
  getPositionAtProgress(progress) {
    const clamped = Math.max(0, Math.min(1, progress));
    let targetDist = clamped * this.routeLength;

    for (let i = 1; i < this.waypoints.length; i++) {
      const segLen = distance(this.waypoints[i - 1], this.waypoints[i]);
      if (targetDist <= segLen) {
        const t = segLen > 0 ? targetDist / segLen : 0;
        return lerpPoint(this.waypoints[i - 1], this.waypoints[i], t);
      }
      targetDist -= segLen;
    }
    return { ...this.waypoints[this.waypoints.length - 1] };
  }

  /**
   * Get route progress (0-1) for end condition checks.
   */
  getRouteProgress(entity) {
    return entity.progress || 0;
  }
}

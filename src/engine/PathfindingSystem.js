// PathfindingSystem — convoy movement, escort formation, patrol patterns
// GDD Sections 7.2.1, 11.3

import { ROUTES } from '../data/mapData.js';
import { MAP, SIMULATION } from '../data/constants.js';
import { distance, angleBetween, lerpPoint, segmentLength } from '../utils/geometry.js';

const NM_TO_WORLD = MAP.NM_TO_WORLD;
const AIR_ARRIVAL_RADIUS = SIMULATION.AIR_STATION_ARRIVAL_RADIUS;
const SURFACE_MOVEMENT_MULTIPLIER = SIMULATION.SURFACE_MOVEMENT_MULTIPLIER;
const ASSET_MOVEMENT_MULTIPLIER = SIMULATION.ASSET_MOVEMENT_SPEED_MULTIPLIER;

// Tanker spacing along route (world units between each tanker)
const TANKER_SPACING = 40;
// Convoy speed in knots
const CONVOY_SPEED_KT = 25 * SURFACE_MOVEMENT_MULTIPLIER * ASSET_MOVEMENT_MULTIPLIER;
// Convoy speed in world units per second
const CONVOY_SPEED = CONVOY_SPEED_KT * NM_TO_WORLD / 3600;

// Formation offsets around the moving convoy envelope.
const FORMATION_OFFSETS = {
  convoy_lead: { along: 95, lateral: 0 },
  convoy_port: { along: 25, lateral: -60 },
  convoy_starboard: { along: -5, lateral: 60 },
  convoy_rear: { along: -125, lateral: 0 },
  convoy_center: { along: -70, lateral: 28 },
  fwd_0: { along: 150, lateral: -28 },
  fwd_1: { along: 150, lateral: 28 },
  fwd_2: { along: 205, lateral: -42 },
  fwd_3: { along: 205, lateral: 42 },
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
      // Tankers start staggered west of the map and continuously ingress.
      const distOffset = i * TANKER_SPACING;
      const progress = -distOffset / this.routeLength;
      positions.push({
        progress,
        distanceTraveled: progress * this.routeLength,
        startDelay: 0,
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
    const pos = this.getPositionAtProgress(tanker.progress, true);
    const nextPos = this.getPositionAtProgress(tanker.progress + 0.01, true);
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

    const leadProgress = this.getLeadTankerProgress(tankers);
    const formationProgress = leadProgress + (offset.along / this.routeLength);
    const target = this.getOffsetPositionAtProgress(formationProgress, offset.lateral);
    const heading = this.getHeadingAtProgress(formationProgress);
    const targetX = target.x;
    const targetY = target.y;

    // Move toward target position at escort's speed
    const speedWU = escort.speed * SURFACE_MOVEMENT_MULTIPLIER * ASSET_MOVEMENT_MULTIPLIER * NM_TO_WORLD / 3600;
    const maxMove = speedWU * deltaTime;
    const dx = targetX - escort.position.x;
    const dy = targetY - escort.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const previousPosition = { ...escort.position };

    if (dist < maxMove) {
      escort.position = { x: targetX, y: targetY };
    } else {
      escort.position = {
        x: escort.position.x + (dx / dist) * maxMove,
        y: escort.position.y + (dy / dist) * maxMove,
      };
    }
    escort.rotation = dist > 0.001
      ? angleBetween(previousPosition, { x: targetX, y: targetY })
      : heading;

  }

  getFormationPositionAtProgress(zoneId, progress = 0) {
    const offset = FORMATION_OFFSETS[zoneId];
    if (!offset) {
      return this.getPositionAtProgress(progress, true);
    }

    return this.getOffsetPositionAtProgress(progress + (offset.along / this.routeLength), offset.lateral);
  }

  moveTowardPoint(entity, targetPosition, deltaTime, arrivalRadius = 1) {
    const movementMultiplier = entity.type === 'AIR'
      ? ASSET_MOVEMENT_MULTIPLIER
      : SURFACE_MOVEMENT_MULTIPLIER * ASSET_MOVEMENT_MULTIPLIER;
    const speedWU = entity.speed * movementMultiplier * NM_TO_WORLD / 3600;
    const maxMove = speedWU * deltaTime;
    const dx = targetPosition.x - entity.position.x;
    const dy = targetPosition.y - entity.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= arrivalRadius) {
      entity.position = { ...targetPosition };
      return true;
    }

    const heading = angleBetween(entity.position, targetPosition);
    entity.rotation = heading;

    if (dist <= maxMove) {
      entity.position = { ...targetPosition };
      return true;
    }

    entity.position = {
      x: entity.position.x + (dx / dist) * maxMove,
      y: entity.position.y + (dy / dist) * maxMove,
    };
    return false;
  }

  updateTransitAsset(entity, targetPosition, deltaTime) {
    if (entity.isDestroyed || !targetPosition) return false;
    return this.moveTowardPoint(entity, targetPosition, deltaTime, AIR_ARRIVAL_RADIUS);
  }

  getHeadingAtProgress(progress) {
    const current = this.getPositionAtProgress(progress, true);
    const next = this.getPositionAtProgress(progress + 0.01, true);
    return angleBetween(current, next);
  }

  getOffsetPositionAtProgress(progress, lateralOffset = 0) {
    const anchor = this.getPositionAtProgress(progress, true);
    const heading = this.getHeadingAtProgress(progress);
    return {
      x: anchor.x - Math.sin(heading) * lateralOffset,
      y: anchor.y + Math.cos(heading) * lateralOffset,
    };
  }

  projectPointOntoRoute(point) {
    let best = {
      progress: 0,
      position: { ...this.waypoints[0] },
      distance: Infinity,
      heading: this.getHeadingAtProgress(0),
      segmentIndex: 0,
    };

    let traversed = 0;
    for (let i = 1; i < this.waypoints.length; i++) {
      const start = this.waypoints[i - 1];
      const end = this.waypoints[i];
      const segDx = end.x - start.x;
      const segDy = end.y - start.y;
      const segLenSq = segDx * segDx + segDy * segDy;
      const segLen = Math.sqrt(segLenSq);
      const rawT = segLenSq > 0
        ? ((point.x - start.x) * segDx + (point.y - start.y) * segDy) / segLenSq
        : 0;
      const t = Math.max(0, Math.min(1, rawT));
      const projected = {
        x: start.x + segDx * t,
        y: start.y + segDy * t,
      };
      const dist = distance(point, projected);

      if (dist < best.distance) {
        best = {
          progress: (traversed + segLen * t) / this.routeLength,
          position: projected,
          distance: dist,
          heading: angleBetween(start, end),
          segmentIndex: i - 1,
        };
      }

      traversed += segLen;
    }

    return best;
  }

  getLateralOffsetForPoint(point) {
    const projection = this.projectPointOntoRoute(point);
    const dx = point.x - projection.position.x;
    const dy = point.y - projection.position.y;
    const lateralOffset = -dx * Math.sin(projection.heading) + dy * Math.cos(projection.heading);
    return { ...projection, lateralOffset };
  }

  getConvoyArrivalTime(progress) {
    return (Math.max(0, progress) * this.routeLength) / CONVOY_SPEED;
  }

  updateRouteFollowingAsset(entity, deltaTime) {
    if (entity.isDestroyed) return;

    const speedWU = entity.speed * SURFACE_MOVEMENT_MULTIPLIER * ASSET_MOVEMENT_MULTIPLIER * NM_TO_WORLD / 3600;
    entity.routeDistanceTraveled = (entity.routeDistanceTraveled || 0) + speedWU * deltaTime;
    entity.routeProgress = entity.routeDistanceTraveled / this.routeLength;
    entity.position = this.getOffsetPositionAtProgress(
      entity.routeProgress || 0,
      entity.routeLateralOffset || 0
    );
    entity.rotation = this.getHeadingAtProgress(entity.routeProgress || 0);
  }

  /**
   * Update mobile defender assets — patrol within zone area.
   */
  updatePatrolAsset(entity, deltaTime, rng) {
    if (entity.isDestroyed) return;

    // If entity has a target and is engaging, move toward it
    if (entity.engageTarget) {
      this.moveTowardPoint(entity, entity.engageTarget, deltaTime);
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

    const dx = targetX - entity.position.x;
    const dy = targetY - entity.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      this.moveTowardPoint(entity, { x: targetX, y: targetY }, deltaTime);
    }
  }

  /**
   * Get world position at a given progress (0-1) along the route.
   */
  getPositionAtProgress(progress, allowExtrapolation = false) {
    if (allowExtrapolation && progress > 1) {
      const extraDist = (progress - 1) * this.routeLength;
      const end = this.waypoints[this.waypoints.length - 1];
      const prev = this.waypoints[this.waypoints.length - 2];
      const heading = angleBetween(prev, end);
      return {
        x: end.x + Math.cos(heading) * extraDist,
        y: end.y + Math.sin(heading) * extraDist,
      };
    }

    if (allowExtrapolation && progress < 0) {
      const extraDist = Math.abs(progress) * this.routeLength;
      const start = this.waypoints[0];
      const next = this.waypoints[1];
      const heading = angleBetween(start, next);
      return {
        x: start.x - Math.cos(heading) * extraDist,
        y: start.y - Math.sin(heading) * extraDist,
      };
    }

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

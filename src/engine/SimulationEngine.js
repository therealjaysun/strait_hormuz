// SimulationEngine — master orchestrator for the battle simulation
// GDD Sections 7.1, 7.2.5, 11.3

import { SIMULATION, MAP, COMBAT, AIR_MISSION_PHASES } from '../data/constants.js';
import { defenderEquipment } from '../data/defenderEquipment.js';
import { attackerEquipment } from '../data/attackerEquipment.js';
import { getAirLaunchSource } from '../data/mapData.js';
import { createRNG } from '../utils/random.js';
import { distance, angleBetween } from '../utils/geometry.js';
import PathfindingSystem from './PathfindingSystem.js';
import DetectionSystem from './DetectionSystem.js';
import CombatResolver from './CombatResolver.js';
import MineSystem from './MineSystem.js';

const NM_TO_WORLD = MAP.NM_TO_WORLD;
const ATTACKER_INGRESS_PROGRESS = -0.18;
const MISSILE_SPEED_KT = COMBAT.BASE_MISSILE_SPEED_KT * COMBAT.MISSILE_SPEED_FACTOR;
const MISSILE_SPEED_WU_PER_SEC = MISSILE_SPEED_KT * NM_TO_WORLD / 3600;

// Tanker names from GDD 8.2.1
const TANKER_NAMES = [
  'VLCC Pacific Glory',
  'VLCC Arabian Star',
  'VLCC Gulf Meridian',
  'VLCC Coral Dawn',
  'VLCC Jade Horizon',
];

// Equipment lookup by id
const EQUIPMENT_BY_ID = {};
for (const e of defenderEquipment) EQUIPMENT_BY_ID[e.id] = e;
for (const e of attackerEquipment) EQUIPMENT_BY_ID[e.id] = e;

// Entity type mapping from equipment category
function getEntityType(equipData) {
  if (equipData.entityType) return equipData.entityType;
  if (equipData.category === 'MINE_LAYER') return 'SURFACE';
  if (equipData.category === 'COASTAL_MISSILE' || equipData.category === 'RADAR') return 'FIXED';
  if (equipData.category === 'AERIAL' || equipData.category === 'DRONE' || equipData.category === 'EW') return 'AIR';
  if (equipData.category === 'SUBMARINE') return 'SUBSURFACE';
  return 'SURFACE';
}

function isAirEntity(entity) {
  return entity.type === 'AIR';
}

function isAirOperational(entity) {
  return !isAirEntity(entity) || entity.missionPhase === AIR_MISSION_PHASES.ON_STATION;
}

function isPositionOnScreen(position, margin = 0) {
  if (!position) return false;
  return position.x >= -margin
    && position.x <= MAP.WIDTH + margin
    && position.y >= -margin
    && position.y <= MAP.HEIGHT + margin;
}

function isAttackerFormationZone(zoneId) {
  return !!zoneId && (zoneId.startsWith('convoy_') || zoneId.startsWith('fwd_'));
}

// Name counters for entity display names
function createNameGenerator() {
  const counters = {};
  return function getName(equipData) {
    const prefix = equipData.name.split(' ')[0];
    counters[equipData.id] = (counters[equipData.id] || 0) + 1;
    return `${prefix}-${counters[equipData.id]}`;
  };
}

export default class SimulationEngine {
  constructor(config) {
    const {
      playerFaction,
      difficulty,
      playerPlacements,
      aiPlacements,
      selectedRoute,
      aiRoute,
      tankerAllocation,
      rngSeed = Date.now(),
    } = config;

    this.rng = createRNG(rngSeed);
    this.tickRate = SIMULATION.TICK_RATE;
    this.speedMultiplier = SIMULATION.DEFAULT_SPEED;
    this.currentTick = 0;
    this.gameTime = 0;
    this.isRunning = false;
    this.isComplete = false;
    this.winner = null;
    this.winReason = null;
    this.playerFaction = playerFaction;
    this.difficulty = difficulty;
    this.timeLimit = SIMULATION.TIME_LIMIT;

    // Determine which route the convoy uses
    // If player is attacker, their selected route is the convoy route
    // If player is defender, the AI chose the route
    this.convoyRoute = playerFaction === 'ATTACKER' ? selectedRoute : aiRoute;
    this.tankerAllocation = tankerAllocation;

    // Initialize subsystems — create pathfinding for each active route
    this.pathfindingSystems = {};
    if (tankerAllocation) {
      for (const [routeKey, count] of Object.entries(tankerAllocation)) {
        if (count > 0) {
          this.pathfindingSystems[routeKey] = new PathfindingSystem(routeKey);
        }
      }
    }
    // Primary pathfinding for escorts and fallback
    this.pathfinding = this.pathfindingSystems[this.convoyRoute] || new PathfindingSystem(this.convoyRoute);
    if (!this.pathfindingSystems[this.convoyRoute]) {
      this.pathfindingSystems[this.convoyRoute] = this.pathfinding;
    }

    this.detection = new DetectionSystem();
    this.combat = new CombatResolver(this.rng);
    this.mines = new MineSystem();

    // Entity state
    this.entities = [];
    this.events = [];
    this.destroyedEntities = [];
    this.pendingShots = [];

    // Initialize all entities
    this.initializeEntities(config);
  }

  /**
   * Create entity objects from placement data + 5 tankers.
   */
  initializeEntities(config) {
    const getName = createNameGenerator();
    let entityCounter = 0;

    const defenderPlacements = config.playerFaction === 'DEFENDER'
      ? config.playerPlacements
      : config.aiPlacements;
    const attackerPlacements = config.playerFaction === 'ATTACKER'
      ? config.playerPlacements
      : config.aiPlacements;

    // Create defender entities
    for (const placement of defenderPlacements) {
      const equipData = EQUIPMENT_BY_ID[placement.assetId];
      if (!equipData) continue;

      // Drone swarms expand into individual drone entities
      if (equipData.isDrone) {
        const droneCount = equipData.droneCount || 6;
        for (let d = 0; d < droneCount; d++) {
          this.entities.push(this.createEntity(
            `entity_${entityCounter++}`,
            equipData,
            'DEFENDER',
            {
              x: placement.position.x + (d - droneCount / 2) * 5,
              y: placement.position.y + (this.rng() - 0.5) * 10,
            },
            placement.zoneId,
            true, // isDrone flag
          ));
        }
        continue;
      }

      this.entities.push(this.createEntity(
        `entity_${entityCounter++}`,
        equipData,
        'DEFENDER',
        { ...placement.position },
        placement.zoneId,
      ));
    }

    // Create attacker entities (escorts, aircraft, etc.)
    for (const placement of attackerPlacements) {
      const equipData = EQUIPMENT_BY_ID[placement.assetId];
      if (!equipData) continue;

      this.entities.push(this.createEntity(
        `entity_${entityCounter++}`,
        equipData,
        'ATTACKER',
        { ...placement.position },
        placement.zoneId,
      ));
    }

    // Create tankers — distribute across routes based on tankerAllocation
    let tankerIdx = 0;
    const routeAssignments = [];
    if (this.tankerAllocation) {
      for (const [routeKey, count] of Object.entries(this.tankerAllocation)) {
        for (let j = 0; j < count && tankerIdx < 5; j++) {
          routeAssignments.push(routeKey);
          tankerIdx++;
        }
      }
    }
    // Fill remaining with primary route
    while (routeAssignments.length < 5) {
      routeAssignments.push(this.convoyRoute);
    }

    for (let i = 0; i < 5; i++) {
      const tankerRoute = routeAssignments[i];
      const pf = this.pathfindingSystems[tankerRoute] || this.pathfinding;
      const tankerPositions = pf.initTankerPositions();
      // Stagger tankers on same route
      const sameRouteBefore = routeAssignments.slice(0, i).filter(r => r === tankerRoute).length;
      const tankerStart = tankerPositions[sameRouteBefore] || { progress: 0, distanceTraveled: 0, startDelay: 0 };
      const startPos = pf.getPositionAtProgress(tankerStart.progress, true);
      this.entities.push({
        id: `tanker_${i}`,
        assetId: 'tanker',
        name: TANKER_NAMES[i],
        faction: 'ATTACKER',
        type: 'TANKER',
        position: { ...startPos },
        rotation: pf.getHeadingAtProgress(tankerStart.progress),
        speed: 15,
        baseSpeed: 15,
        hp: 100,
        maxHp: 100,
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
        assignedRoute: tankerRoute,
        progress: tankerStart.progress,
        distanceTraveled: tankerStart.distanceTraveled,
        startDelay: tankerStart.startDelay,
        cost: 0,
      });
    }

    // Initialize mine system from mine layer entities
    const mineLayers = this.entities.filter(e =>
      e.assetId === 'mine_layer' && !e.isDestroyed
    );
    this.mines.initMines(mineLayers);

    // Create mine entities for rendering (invisible type)
    for (const mine of this.mines.mines) {
      this.entities.push({
        id: mine.id,
        assetId: 'mine',
        name: 'Sea Mine',
        faction: 'DEFENDER',
        type: 'MINE',
        position: { ...mine.position },
        rotation: 0,
        speed: 0,
        baseSpeed: 0,
        hp: 1,
        maxHp: 1,
        damage: COMBAT.MINE_DAMAGE,
        weaponRange: 0,
        radarRange: 0,
        reloadTime: 0,
        ammo: 0,
        maxAmmo: 0,
        signature: 'LOW',
        countermeasures: 'NONE',
        isDestroyed: false,
        isWinchester: false,
        currentTarget: null,
        reloadCooldown: 0,
        detectedBy: new Set(),
        assignedZone: null,
        isMine: true,
        mineRef: mine,
        cost: 0,
      });
    }
  }

  /**
   * Create a single entity from equipment data.
   */
  createEntity(id, equipData, faction, position, zoneId, isDroneUnit = false) {
    const type = isDroneUnit ? 'AIR' : getEntityType(equipData);
    const stationPosition = { ...position };
    const pf = this.pathfindingSystems[this.convoyRoute] || this.pathfinding;
    const attackerFormationAsset = faction === 'ATTACKER' && isAttackerFormationZone(zoneId);
    const attackerRouteFollower = faction === 'ATTACKER'
      && type !== 'AIR'
      && type !== 'TANKER'
      && type !== 'FIXED'
      && !attackerFormationAsset;
    const launchSource = type === 'AIR'
      ? getAirLaunchSource(equipData.id, faction, zoneId, stationPosition)
      : null;
    const routeProjection = attackerRouteFollower || faction === 'ATTACKER'
      ? pf.getLateralOffsetForPoint(stationPosition)
      : null;
    const attackerAirIngressSpawn = faction === 'ATTACKER' && type === 'AIR'
      ? routeProjection
        ? pf.getOffsetPositionAtProgress(ATTACKER_INGRESS_PROGRESS, routeProjection.lateralOffset)
        : { x: -120, y: stationPosition.y }
      : null;
    const launchPosition = attackerAirIngressSpawn
      ? { ...attackerAirIngressSpawn }
      : launchSource ? { ...launchSource.position } : { ...position };
    const syncedLaunchDelay = faction === 'ATTACKER' && type === 'AIR' && routeProjection
      ? Math.max(
          0,
          pf.getConvoyArrivalTime(routeProjection.progress)
            - (distance(launchPosition, stationPosition) / Math.max(1, equipData.speed * NM_TO_WORLD / 3600))
        )
      : 0;
    const startsOnStation = type !== 'AIR'
      || distance(launchPosition, stationPosition) <= SIMULATION.AIR_STATION_ARRIVAL_RADIUS;
    const attackerRouteSpawn = attackerRouteFollower && routeProjection
      ? pf.getOffsetPositionAtProgress(ATTACKER_INGRESS_PROGRESS, routeProjection.lateralOffset)
      : null;
    const attackerFormationSpawn = attackerFormationAsset
      ? pf.getFormationPositionAtProgress(zoneId, ATTACKER_INGRESS_PROGRESS)
      : null;
    const initialRotation = type === 'AIR' && !startsOnStation
      ? angleBetween(launchPosition, stationPosition)
      : attackerFormationAsset || attackerRouteFollower || attackerAirIngressSpawn
        ? pf.getHeadingAtProgress(ATTACKER_INGRESS_PROGRESS)
        : 0;

    const entity = {
      id,
      assetId: equipData.id,
      name: isDroneUnit ? `Shahed-${id.split('_')[1]}` : equipData.name,
      faction,
      type,
      position: type === 'AIR'
        ? { ...launchPosition }
        : attackerFormationSpawn ? { ...attackerFormationSpawn }
          : attackerRouteSpawn ? { ...attackerRouteSpawn }
          : { ...position },
      homePosition: { ...stationPosition },
      stationPosition: { ...stationPosition },
      launchPosition: type === 'AIR' ? { ...launchPosition } : null,
      launchSourceId: launchSource?.id || null,
      launchSourceName: launchSource?.name || null,
      missionPhase: type === 'AIR'
        ? (startsOnStation ? AIR_MISSION_PHASES.ON_STATION : AIR_MISSION_PHASES.TRANSIT)
        : null,
      launchDelay: type === 'AIR' ? syncedLaunchDelay : 0,
      rotation: initialRotation,
      speed: equipData.speed,
      baseSpeed: equipData.speed,
      hp: isDroneUnit ? 10 : equipData.hp,
      maxHp: isDroneUnit ? 10 : equipData.hp,
      damage: isDroneUnit ? 80 : equipData.damage,
      weaponRange: isDroneUnit ? 0 : equipData.weaponRange,
      radarRange: isDroneUnit ? 0 : equipData.radarRange,
      reloadTime: equipData.reloadTime,
      ammo: isDroneUnit ? 1 : equipData.ammo,
      maxAmmo: isDroneUnit ? 1 : equipData.ammo,
      signature: isDroneUnit ? 'LOW' : equipData.signature,
      countermeasures: equipData.countermeasures || 'NONE',
      isDestroyed: false,
      hasEscaped: false,
      isWinchester: false,
      currentTarget: null,
      reloadCooldown: 0,
      detectedBy: new Set(),
      assignedZone: zoneId,
      assignedRoute: faction === 'ATTACKER' ? this.convoyRoute : null,
      routeProgress: attackerRouteFollower ? ATTACKER_INGRESS_PROGRESS : null,
      routeDistanceTraveled: attackerRouteFollower ? ATTACKER_INGRESS_PROGRESS * pf.routeLength : null,
      routeLateralOffset: attackerRouteFollower && routeProjection ? routeProjection.lateralOffset : 0,
      routeTargetProgress: routeProjection ? routeProjection.progress : null,
      followsAssignedRoute: attackerRouteFollower,
      cost: isDroneUnit ? 0 : equipData.cost,
      // Special flags
      isDrone: isDroneUnit,
      isJamming: equipData.isEW || false,
      jammingRadius: equipData.jammingRadius || 0,
      isMinesweeper: equipData.isMinesweeper || false,
      sweepRadius: equipData.sweepRadius || 0,
      isASW: equipData.isASW || false,
      sonarRange: equipData.sonarRange || 0,
      isRadar: equipData.category === 'RADAR',
      isCoastalMissile: equipData.category === 'COASTAL_MISSILE',
      category: equipData.category,
      // Patrol state
      patrolAngle: null,
      engageTarget: null,
      // Ghadir sub: signature boost after firing
      signatureBoostUntil: 0,
      hasEnteredScreen: isPositionOnScreen(
        type === 'AIR'
          ? launchPosition
          : attackerFormationSpawn || attackerRouteSpawn || position
      ),
      mobilityKilled: false,
    };

    return entity;
  }

  /**
   * Set simulation speed multiplier (1, 2, 4, 8).
   */
  setSpeed(multiplier) {
    if (SIMULATION.SPEEDS.includes(multiplier)) {
      this.speedMultiplier = multiplier;
    }
  }

  /**
   * Execute one simulation tick.
   * deltaTime = (1 / tickRate) * speedMultiplier in game seconds.
   */
  tick() {
    if (this.isComplete) return;

    this.currentTick++;
    const deltaTime = (1 / this.tickRate) * this.speedMultiplier;
    this.gameTime += deltaTime;

    const tankers = this.entities.filter(e => e.type === 'TANKER');
    const escorts = this.entities.filter(e =>
      e.faction === 'ATTACKER' && e.type !== 'TANKER' && e.type !== 'AIR' && e.type !== 'MINE'
      && !e.isDestroyed && e.assignedZone
      && isAttackerFormationZone(e.assignedZone)
    );
    const jammers = this.entities.filter(e => !e.isDestroyed && e.isJamming && isAirOperational(e));
    const newEvents = [];

    for (const entity of this.entities) {
      if (!entity.hasEnteredScreen && isPositionOnScreen(entity.position)) {
        entity.hasEnteredScreen = true;
      }
    }

    // 1. Update convoy (tanker) positions — each tanker uses its assigned route
    for (const tanker of tankers) {
      const pf = (tanker.assignedRoute && this.pathfindingSystems[tanker.assignedRoute]) || this.pathfinding;
      const escaped = pf.updateTankerPosition(tanker, deltaTime);
      if (escaped) {
        newEvents.push({
          tick: this.currentTick,
          gameTime: this.gameTime,
          type: 'TANKER_ESCAPED',
          data: { entityId: tanker.id, name: tanker.name },
        });
      }
    }

    // 2. Update escort positions (formation)
    for (const escort of escorts) {
      this.pathfinding.updateEscortPosition(escort, tankers, deltaTime);
    }

    // 3. Update mobile assets (patrol patterns, drone homing)
    for (const entity of this.entities) {
      if (entity.isDestroyed) continue;
      if (entity.type === 'TANKER') continue;
      if (entity.type === 'MINE') continue;
      if (entity.type === 'FIXED') continue;

      // Escorts handled above
      if (entity.faction === 'ATTACKER' && entity.assignedZone &&
          isAttackerFormationZone(entity.assignedZone)) {
        continue;
      }

      if (entity.followsAssignedRoute) {
        const routePf = (entity.assignedRoute && this.pathfindingSystems[entity.assignedRoute]) || this.pathfinding;
        routePf.updateRouteFollowingAsset(entity, deltaTime);
        continue;
      }

      // Defender drones launch directly into an intercept profile.
      if (entity.isDrone && !entity.isDestroyed) {
        if (entity.launchDelay > 0) {
          entity.launchDelay = Math.max(0, entity.launchDelay - deltaTime);
          entity.engageTarget = null;
          continue;
        }
        this.updateDroneHoming(entity, deltaTime);
        continue;
      }

      // Air ingress before station-keeping/engagement
      if (isAirEntity(entity) && entity.missionPhase === AIR_MISSION_PHASES.TRANSIT) {
        if (entity.launchDelay > 0) {
          entity.launchDelay = Math.max(0, entity.launchDelay - deltaTime);
          entity.engageTarget = null;
          continue;
        }
        entity.engageTarget = null;
        const arrived = this.pathfinding.updateTransitAsset(
          entity,
          entity.stationPosition || entity.homePosition,
          deltaTime
        );
        if (arrived) {
          const station = entity.stationPosition || entity.homePosition || entity.position;
          entity.position = { ...station };
          entity.homePosition = { ...station };
          entity.missionPhase = AIR_MISSION_PHASES.ON_STATION;
          entity.patrolAngle = null;
        }
        continue;
      }

      this.pathfinding.updatePatrolAsset(entity, deltaTime, this.rng);
    }

    // 4. Run detection system
    const detectionEvents = [];
    this.detection.update(this.entities, this.gameTime);
    // Detection events are handled internally; we check for new detections via entity state

    // 5. Target acquisition
    for (const entity of this.entities) {
      if (!isAirOperational(entity)) {
        entity.currentTarget = null;
        continue;
      }
      if (!entity.hasEnteredScreen) {
        entity.currentTarget = null;
        entity.engageTarget = null;
        continue;
      }
      if (entity.isDestroyed || entity.weaponRange === 0 || entity.damage === 0) continue;

      // Coastal missiles need radar coverage
      if (entity.isCoastalMissile) {
        const hasRadar = this.detection.hasRadarCoverage(
          entity.position, entity.faction, this.entities, jammers
        );
        if (!hasRadar) {
          entity.currentTarget = null;
          continue;
        }
      }

      // Get detected enemies
      const detectedEnemies = this.entities.filter(e =>
        e.faction !== entity.faction &&
        !e.isDestroyed &&
        e.type !== 'MINE' &&
        isAirOperational(e) &&
        e.hasEnteredScreen &&
        e.detectedBy.has(entity.faction)
      );

      // Forced target from Concentrate Fire ability
      let target;
      if (entity.forcedTarget && entity.forcedTargetExpiry && this.gameTime <= entity.forcedTargetExpiry) {
        target = this.entities.find(e => e.id === entity.forcedTarget && !e.isDestroyed);
      }
      if (!target) {
        target = this.combat.selectTarget(entity, detectedEnemies);
      }
      entity.currentTarget = target ? target.id : null;

      // Set engage target for mobile assets to move toward
      if (target && entity.speed > 0 && entity.type !== 'FIXED') {
        entity.engageTarget = { ...target.position };
      } else if (!target) {
        entity.engageTarget = null;
      }
    }

    // 6. Combat resolution
    for (const entity of this.entities) {
      if (entity.isDestroyed || !entity.currentTarget) continue;
      if (entity.isDrone) continue; // Drones deal damage on impact, not here

      const target = this.entities.find(e => e.id === entity.currentTarget);
      if (!target || target.isDestroyed) {
        entity.currentTarget = null;
        continue;
      }

      if (!target.hasEnteredScreen || !isPositionOnScreen(entity.position) || !isPositionOnScreen(target.position)) {
        continue;
      }

      const result = this.combat.resolveCombat(entity, target, jammers);
      if (result) {
        const shotDistance = distance(entity.position, target.position);
        const travelTime = shotDistance / Math.max(MISSILE_SPEED_WU_PER_SEC, 0.01);
        this.pendingShots.push({
          ...result,
          impactAt: this.gameTime + travelTime,
          attackerFaction: entity.faction,
          attackerPosition: { ...entity.position },
          targetPosition: { ...target.position },
          travelTime,
          visualDurationMs: (travelTime / Math.max(this.speedMultiplier, 0.001)) * 1000,
        });

        newEvents.push({
          tick: this.currentTick,
          gameTime: this.gameTime,
          type: 'WEAPON_FIRED',
          data: {
            attackerId: entity.id,
            targetId: target.id,
            attackerFaction: entity.faction,
            attackerPosition: { ...entity.position },
            targetPosition: { ...target.position },
            hit: result.willHit,
            visualDurationMs: (travelTime / Math.max(this.speedMultiplier, 0.001)) * 1000,
          },
        });

        // Ghadir sub: boost signature after firing
        if (entity.assetId === 'ghadir_sub') {
          entity.signatureBoostUntil = this.gameTime + 5;
          entity.signature = 'MED';
        }

        // WINCHESTER event
        if (entity.isWinchester && entity.ammo !== Infinity) {
          newEvents.push({
            tick: this.currentTick,
            gameTime: this.gameTime,
            type: 'WINCHESTER',
            data: { entityId: entity.id, name: entity.name },
          });
        }
      }
    }

    // 6b. Resolve missile impacts whose travel time has elapsed
    this.resolvePendingShots(newEvents);

    // 7. Mine checks
    const mineDetonations = this.mines.checkDetonations(this.entities);
    for (const det of mineDetonations) {
      // Add position data for effects renderer
      const mineEntity = this.entities.find(e => e.id === det.mineId);
      if (mineEntity) det.position = { ...mineEntity.position };

      newEvents.push({
        tick: this.currentTick,
        gameTime: this.gameTime,
        type: det.type,
        data: det,
      });
      if (det.destroyed) {
        const target = this.entities.find(e => e.id === det.entityId);
        if (target) {
          newEvents.push({
            tick: this.currentTick,
            gameTime: this.gameTime,
            type: 'ASSET_DESTROYED',
            data: {
              entityId: target.id,
              name: target.name,
              faction: target.faction,
              destroyedBy: 'Sea Mine',
              position: { ...target.position },
              maxHp: target.maxHp,
            },
          });
          this.destroyedEntities.push(target);
        }
      }
    }

    const sweepEvents = this.mines.sweepMines(this.entities, this.gameTime);
    for (const evt of sweepEvents) {
      newEvents.push({
        tick: this.currentTick,
        gameTime: this.gameTime,
        type: evt.type,
        data: evt,
      });
    }

    // Sync mine entity state with mine system
    for (const entity of this.entities) {
      if (entity.isMine && entity.mineRef) {
        if (entity.mineRef.isDetonated) {
          entity.isDestroyed = true;
        }
      }
    }

    // 8. Update cooldowns
    for (const entity of this.entities) {
      if (entity.isDestroyed) continue;
      if (entity.reloadCooldown > 0) {
        entity.reloadCooldown = Math.max(0, entity.reloadCooldown - deltaTime);
      }
      // Restore Ghadir signature after boost expires
      if (entity.signatureBoostUntil > 0 && this.gameTime > entity.signatureBoostUntil) {
        entity.signature = 'LOW';
        entity.signatureBoostUntil = 0;
      }
    }

    // 9. Process ability effects (placeholder — Phase 6 adds abilities)

    // 10. Check end conditions
    const endResult = this.checkEndConditions();
    if (endResult) {
      this.isComplete = true;
      this.isRunning = false;
      this.winner = endResult.winner;
      this.winReason = endResult.reason;
      newEvents.push({
        tick: this.currentTick,
        gameTime: this.gameTime,
        type: 'SIMULATION_END',
        data: endResult,
      });
    }

    // 11. Emit events
    for (const evt of newEvents) {
      this.events.push(evt);
    }
  }

  resolvePendingShots(newEvents) {
    const remainingShots = [];

    for (const shot of this.pendingShots) {
      if (shot.impactAt > this.gameTime) {
        remainingShots.push(shot);
        continue;
      }

      const target = this.entities.find(e => e.id === shot.targetId);
      const attacker = this.entities.find(e => e.id === shot.attackerId);

      if (!target || target.isDestroyed) {
        newEvents.push({
          tick: this.currentTick,
          gameTime: this.gameTime,
          type: 'COMBAT_MISS',
          data: {
            ...shot,
            attackerName: attacker?.name || shot.attackerName,
            targetName: target?.name || shot.targetName,
          },
        });
        continue;
      }

      if (!shot.willHit) {
        newEvents.push({
          tick: this.currentTick,
          gameTime: this.gameTime,
          type: 'COMBAT_MISS',
          data: {
            ...shot,
            attackerName: attacker?.name || shot.attackerName,
            targetName: target.name,
            targetPosition: { ...target.position },
          },
        });
        continue;
      }

      target.hp -= shot.damage;
      const destroyed = target.hp <= 0;
      const criticalHit = !destroyed
        && target.baseSpeed > 0
        && (shot.damage >= target.maxHp * 0.35 || target.hp <= target.maxHp * 0.25);
      if (destroyed) {
        target.hp = 0;
        target.isDestroyed = true;
      } else if (criticalHit) {
        target.speed = 0;
        target.mobilityKilled = true;
      }

      newEvents.push({
        tick: this.currentTick,
        gameTime: this.gameTime,
        type: 'COMBAT_HIT',
        data: {
          ...shot,
          destroyed,
          criticalHit,
          attackerName: attacker?.name || shot.attackerName,
          targetName: target.name,
          targetPosition: { ...target.position },
        },
      });

      if (destroyed) {
        newEvents.push({
          tick: this.currentTick,
          gameTime: this.gameTime,
          type: 'ASSET_DESTROYED',
          data: {
            entityId: target.id,
            name: target.name,
            faction: target.faction,
            destroyedBy: attacker?.name || shot.attackerName,
            position: { ...target.position },
            maxHp: target.maxHp,
          },
        });
        this.destroyedEntities.push(target);
      }
    }

    this.pendingShots = remainingShots;
  }

  /**
   * Drone homing — drones move toward nearest detected enemy (or nearest tanker for defender drones).
   * On contact, deal damage and self-destruct.
   */
  updateDroneHoming(drone, deltaTime) {
    // Launch straight toward the incoming attacker stream rather than a pre-planned patrol station.
    let target = null;
    let bestDist = Infinity;

    for (const e of this.entities) {
      if (e.faction === drone.faction) continue;
      if (e.isDestroyed) continue;
      if (e.type === 'MINE') continue;
      const incomingWeight = e.faction === 'ATTACKER' ? Math.max(0, e.position.x) : e.position.x;
      const d = distance(drone.position, e.position);
      const weightedDistance = drone.faction === 'DEFENDER'
        ? (e.type === 'TANKER' ? d * 0.45 : d * 0.8) + incomingWeight * 0.15
        : d;
      if (weightedDistance < bestDist) {
        bestDist = weightedDistance;
        target = e;
      }
    }

    if (!target) return;

    // Move toward target
    const speedWU = drone.speed * NM_TO_WORLD / 3600;
    const maxMove = speedWU * deltaTime;
    const dx = target.position.x - drone.position.x;
    const dy = target.position.y - drone.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= maxMove || dist < 3) {
      if (!target.hasEnteredScreen) {
        drone.position = {
          x: drone.position.x + (dx / Math.max(dist, 0.001)) * Math.min(maxMove, dist),
          y: drone.position.y + (dy / Math.max(dist, 0.001)) * Math.min(maxMove, dist),
        };
        drone.rotation = Math.atan2(dy, dx);
        return;
      }
      // Impact! Deal damage and self-destruct
      target.hp -= drone.damage;
      const destroyed = target.hp <= 0;
      const criticalHit = !destroyed
        && target.baseSpeed > 0
        && (drone.damage >= target.maxHp * 0.35 || target.hp <= target.maxHp * 0.25);
      if (destroyed) {
        target.hp = 0;
        target.isDestroyed = true;
      } else if (criticalHit) {
        target.speed = 0;
        target.mobilityKilled = true;
      }
      drone.isDestroyed = true;

      this.events.push({
        tick: this.currentTick,
        gameTime: this.gameTime,
        type: 'COMBAT_HIT',
        data: {
          type: 'COMBAT_HIT',
          attackerId: drone.id,
          targetId: target.id,
          attackerName: drone.name,
          targetName: target.name,
          attackerFaction: drone.faction,
          targetPosition: { ...target.position },
          damage: drone.damage,
          destroyed,
          criticalHit,
          isDroneImpact: true,
        },
      });

      if (destroyed) {
        this.events.push({
          tick: this.currentTick,
          gameTime: this.gameTime,
          type: 'ASSET_DESTROYED',
          data: {
            entityId: target.id,
            name: target.name,
            faction: target.faction,
            destroyedBy: drone.name,
            position: { ...target.position },
            maxHp: target.maxHp,
          },
        });
        this.destroyedEntities.push(target);
      }
    } else {
      drone.position = {
        x: drone.position.x + (dx / dist) * maxMove,
        y: drone.position.y + (dy / dist) * maxMove,
      };
      drone.rotation = Math.atan2(dy, dx);
    }
  }

  /**
   * Check end conditions — GDD 7.2.5
   */
  checkEndConditions() {
    const tankers = this.entities.filter(e => e.type === 'TANKER');
    const escaped = tankers.filter(e => e.hasEscaped);
    const destroyed = tankers.filter(e => e.isDestroyed);
    const remaining = tankers.filter(e => !e.isDestroyed && !e.hasEscaped);

    // All tankers resolved (destroyed or escaped)
    if (remaining.length === 0) {
      if (escaped.length > 0) {
        return { winner: 'ATTACKER', reason: 'TANKERS_ESCAPED', escaped: escaped.length, destroyed: destroyed.length };
      }
      return { winner: 'DEFENDER', reason: 'ALL_TANKERS_DESTROYED', escaped: 0, destroyed: 5 };
    }

    // All tankers destroyed
    if (destroyed.length === 5) {
      return { winner: 'DEFENDER', reason: 'ALL_TANKERS_DESTROYED', escaped: 0, destroyed: 5 };
    }

    // Time limit
    if (this.gameTime >= this.timeLimit) {
      // Tankers past 75% count as escaped
      for (const t of remaining) {
        const pf = (t.assignedRoute && this.pathfindingSystems[t.assignedRoute]) || this.pathfinding;
        const progress = pf.getRouteProgress(t);
        if (progress >= SIMULATION.TANKER_ESCAPE_THRESHOLD) {
          t.hasEscaped = true;
        } else {
          t.isDestroyed = true;
        }
      }

      const finalEscaped = tankers.filter(e => e.hasEscaped).length;
      const finalDestroyed = tankers.filter(e => e.isDestroyed).length;

      return {
        winner: finalEscaped > 0 ? 'ATTACKER' : 'DEFENDER',
        reason: 'TIME_LIMIT',
        escaped: finalEscaped,
        destroyed: finalDestroyed,
      };
    }

    return null; // Simulation continues
  }

  /**
   * Start the simulation loop.
   */
  start() {
    this.isRunning = true;
  }

  /**
   * Pause the simulation.
   */
  pause() {
    this.isRunning = false;
  }

  /**
   * Get summary of current state for UI/debugging.
   */
  getSnapshot() {
    const tankers = this.entities.filter(e => e.type === 'TANKER');
    return {
      tick: this.currentTick,
      gameTime: this.gameTime,
      isComplete: this.isComplete,
      winner: this.winner,
      winReason: this.winReason,
      tankersEscaped: tankers.filter(e => e.hasEscaped).length,
      tankersDestroyed: tankers.filter(e => e.isDestroyed).length,
      tankersRemaining: tankers.filter(e => !e.isDestroyed && !e.hasEscaped).length,
      totalEntities: this.entities.length,
      activeEntities: this.entities.filter(e => !e.isDestroyed).length,
      eventsCount: this.events.length,
    };
  }
}

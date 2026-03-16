import { describe, it, expect } from 'vitest';
import SimulationEngine from './SimulationEngine.js';
import { AIR_MISSION_PHASES } from '../data/constants.js';

function makeEngine(overrides = {}) {
  return new SimulationEngine({
    playerFaction: 'ATTACKER',
    difficulty: 'ADVISORY',
    playerPlacements: [],
    aiPlacements: [],
    selectedRoute: 'ALPHA',
    aiRoute: 'ALPHA',
    tankerAllocation: { ALPHA: 5, BRAVO: 0, CHARLIE: 0 },
    rngSeed: 123,
    ...overrides,
  });
}

function tickUntil(engine, predicate, maxTicks = 250) {
  for (let i = 0; i < maxTicks; i++) {
    if (predicate()) return true;
    engine.tick();
  }
  return predicate();
}

describe('SimulationEngine air launch and transit', () => {
  it('spawns attacker air assets at launch sources and waits for launch timing', () => {
    const station = { x: 420, y: 185 };
    const engine = makeEngine({
      playerPlacements: [
        { id: 'p1', assetId: 'fa18e_hornet', zoneId: 'cap_0', position: station },
      ],
    });

    const hornet = engine.entities.find(e => e.assetId === 'fa18e_hornet');
    expect(hornet).toBeTruthy();
    expect(hornet.missionPhase).toBe(AIR_MISSION_PHASES.TRANSIT);
    expect(hornet.launchSourceId).toBe('carrier_group');
    expect(hornet.position.x).toBeLessThan(0);
    expect(hornet.stationPosition).toEqual(station);
    expect(hornet.homePosition).toEqual(station);
    expect(hornet.launchDelay).toBeGreaterThan(0);

    engine.tick();
    expect(hornet.position.x).toBeLessThan(0);
    expect(hornet.missionPhase).toBe(AIR_MISSION_PHASES.TRANSIT);
  });

  it('keeps transit aircraft out of detection and combat until on station', () => {
    const station = { x: 430, y: 180 };
    const engine = makeEngine({
      playerPlacements: [
        { id: 'p1', assetId: 'p8_poseidon', zoneId: 'cap_0', position: station },
      ],
      aiPlacements: [
        { id: 'd1', assetId: 'coastal_radar', zoneId: 'coastal_2', position: { x: 468, y: 66 } },
      ],
    });

    const patrolAircraft = engine.entities.find(e => e.assetId === 'p8_poseidon');
    patrolAircraft.launchDelay = 0;
    expect(patrolAircraft.currentTarget).toBeNull();

    engine.tick();

    expect(patrolAircraft.missionPhase).toBe(AIR_MISSION_PHASES.TRANSIT);
    expect(patrolAircraft.detectedBy.has('DEFENDER')).toBe(false);
    expect(patrolAircraft.currentTarget).toBeNull();

    engine.setSpeed(8);
    const arrived = tickUntil(engine, () => patrolAircraft.missionPhase === AIR_MISSION_PHASES.ON_STATION, 500);
    expect(arrived).toBe(true);

    const detected = tickUntil(engine, () => patrolAircraft.detectedBy.has('DEFENDER'), 4);

    expect(detected).toBe(true);
  });

  it('moves attacker non-air assets left-to-right along the route instead of spawning on station', () => {
    const station = { x: 750, y: 360 };
    const engine = makeEngine({
      playerPlacements: [
        { id: 'p1', assetId: 'los_angeles_ssn', zoneId: 'oman_2', position: station },
      ],
    });

    const sub = engine.entities.find(e => e.assetId === 'los_angeles_ssn');
    expect(sub.followsAssignedRoute).toBe(true);
    expect(sub.position.x).toBeLessThan(station.x);

    const startProgress = sub.routeProgress;
    const startX = sub.position.x;
    engine.setSpeed(8);
    engine.tick();
    engine.tick();
    engine.tick();

    expect(sub.routeProgress).toBeGreaterThan(startProgress);
    expect(sub.position.x).toBeGreaterThan(startX);
  });

  it('spawns convoy formation escorts from the western ingress instead of their station marker', () => {
    const station = { x: 130, y: 230 };
    const engine = makeEngine({
      playerPlacements: [
        { id: 'p1', assetId: 'cyclone_pc', zoneId: 'convoy_lead', position: station },
      ],
    });

    const escort = engine.entities.find(e => e.assetId === 'cyclone_pc');
    expect(escort.followsAssignedRoute).toBe(false);
    expect(escort.position.x).toBeLessThan(station.x);
  });

  it('keeps follow-on tankers moving even before they enter the visible map', () => {
    const engine = makeEngine();
    const secondTanker = engine.entities.find(e => e.id === 'tanker_1');
    expect(secondTanker.startDelay).toBe(0);
    expect(secondTanker.position.x).toBeLessThanOrEqual(0);

    const startX = secondTanker.position.x;
    engine.setSpeed(8);
    engine.tick();
    engine.tick();

    expect(secondTanker.position.x).toBeGreaterThan(startX);
  });

  it('launches defender drones from launch sites before they begin homing', () => {
    const engine = makeEngine({
      playerFaction: 'DEFENDER',
      playerPlacements: [
        { id: 'p1', assetId: 'shahed_136_swarm', zoneId: 'island_qeshm', position: { x: 542, y: 160 } },
      ],
    });

    const drones = engine.entities.filter(e => e.assetId === 'shahed_136_swarm');
    expect(drones).toHaveLength(6);

    for (const drone of drones) {
      expect(drone.missionPhase).toBe(AIR_MISSION_PHASES.TRANSIT);
      expect(drone.launchSourceId).toBe('qeshm_launch_site');
      expect(drone.position.x).toBeCloseTo(542, 4);
      expect(drone.position.y).toBeCloseTo(110, 4);
    }
  });
});

# PHASE 5: Simulation Engine — Core Game Logic

## Objective

Build the headless simulation engine that drives the entire battle: convoy movement along routes, radar/sonar detection and fog of war, combat resolution with damage/countermeasures/ammo tracking, mine mechanics, and end condition evaluation. This phase is pure game logic with no rendering — it produces a stream of events and state updates that Phase 6 will visualize.

## Prerequisites

- **Phase 1** complete (equipment data with all stats, constants, utility functions)
- **Phase 4** complete (placement state format that the engine consumes)

## GDD Reference Sections

- **Section 7.1** — Simulation Overview (accelerated real-time, limited intervention)
- **Section 7.2.1** — Convoy Movement (spawn west, proceed east, 15kt, single file)
- **Section 7.2.2** — Detection & Fog of War (radar coverage, signature-based detection delay, sub detection, mine invisibility)
- **Section 7.2.3** — Combat Resolution (damage formula, targeting priority, countermeasure mitigation, hit probability, ammo depletion, WINCHESTER)
- **Section 7.2.4** — Mine Detonation (trigger radius 0.2nm, 150 damage, minesweeper detection, friendly fire)
- **Section 7.2.5** — Simulation End Conditions (1 tanker escapes = Attacker wins, all 5 destroyed = Defender wins, time limit + 75% rule)
- **Section 11.3** — Game Loop (10 ticks/second, tick pipeline, frame pipeline)

## Files to Create

| File | Purpose |
|------|---------|
| `src/engine/SimulationEngine.js` | Master simulation orchestrator — tick loop, state management, event dispatch |
| `src/engine/CombatResolver.js` | Damage calculation, hit probability, countermeasure mitigation, targeting AI |
| `src/engine/DetectionSystem.js` | Radar/sonar detection, fog of war, signature-based detection delay |
| `src/engine/PathfindingSystem.js` | Convoy waypoint movement, escort formation positioning |
| `src/engine/MineSystem.js` | Mine field state, proximity detonation, minesweeper sweeping |

## Detailed Requirements

### SimulationEngine.js — Master Orchestrator

The simulation engine runs at **10 ticks per second** (100ms per tick), decoupled from the rendering frame rate.

#### Initialization
```js
class SimulationEngine {
  constructor(config) {
    // config: {
    //   playerFaction: 'DEFENDER' | 'ATTACKER',
    //   difficulty: 'ADVISORY' | 'ELEVATED' | 'SEVERE' | 'CRITICAL',
    //   playerPlacements: [...],  // From planning phase
    //   aiPlacements: [...],      // From AI placement
    //   selectedRoute: 'ALPHA' | 'BRAVO' | 'CHARLIE',
    //   rngSeed: number,          // For deterministic simulation
    // }

    this.tickRate = 10;         // Ticks per second
    this.speedMultiplier = 4;   // Default 4x speed
    this.currentTick = 0;
    this.gameTime = 0;          // Seconds elapsed (in game time)
    this.isRunning = false;
    this.isComplete = false;
    this.winner = null;         // 'DEFENDER' | 'ATTACKER' | null

    // Initialize subsystems
    this.pathfinding = new PathfindingSystem(config.selectedRoute);
    this.detection = new DetectionSystem();
    this.combat = new CombatResolver(this.rng);
    this.mines = new MineSystem();

    // Entity state
    this.entities = [];         // All active entities (assets + tankers)
    this.events = [];           // Event log entries
    this.destroyedEntities = []; // Destroyed entity records

    // Initialize entities from placements
    this.initializeEntities(config);
  }
}
```

#### Entity State Shape
Every asset in the simulation is an entity:
```js
{
  id: 'entity_001',
  assetId: 'arleigh_burke_ddg',   // Links to equipment data
  name: 'DDG-52',                  // Display name (generated)
  faction: 'ATTACKER',
  type: 'SURFACE',                 // 'SURFACE' | 'SUBSURFACE' | 'AIR' | 'FIXED' | 'MINE' | 'TANKER'

  // Position
  position: { x: 100, y: 300 },
  rotation: 0,                     // Radians, direction of travel
  speed: 30,                       // Current speed in knots (from asset data)

  // Combat stats (copied from equipment data)
  hp: 200,
  maxHp: 200,
  damage: 140,
  weaponRange: 80,                 // nm (converted to world units)
  radarRange: 150,                 // nm (converted to world units)
  reloadTime: 20,                  // seconds
  ammo: 96,
  maxAmmo: 96,
  signature: 'HIGH',
  countermeasures: 'ADVANCED',

  // State
  isDestroyed: false,
  isWinchester: false,             // Ammo depleted
  currentTarget: null,             // Entity ID of current target
  reloadCooldown: 0,               // Seconds until can fire again
  detectedBy: new Set(),           // Set of faction names that have detected this entity
  assignedZone: null,              // For patrol/formation behavior

  // Special
  mineField: null,                 // For mine layer: { start, end, mines: [...] }
  isDrone: false,                  // For Shahed-136
  isJamming: false,                // For EA-18G Growler
  jammingRadius: 40,               // nm
}
```

#### Tick Pipeline
Each tick executes these steps in order (GDD 11.3):
```
1. updateConvoyPosition()        — Move tankers along route
2. updateEscortPositions()       — Move escorts relative to convoy
3. updateMobileAssets()          — Move patrol craft, aircraft, subs along their patterns
4. runDetectionSystem()          — Radar/sonar checks, update fog of war
5. runTargetAcquisition()        — Each entity selects a target
6. runCombatResolution()         — Fire weapons, resolve damage
7. runMineChecks()               — Check proximity detonation, minesweeper clearing
8. updateCooldowns()             — Decrement ability and reload cooldowns
9. processAbilityEffects()       — Apply active intervention effects
10. checkEndConditions()         — Check for win/loss/time limit
11. emitEvents()                 — Push new events to event log
```

#### Speed Control
- `setSpeed(multiplier)` — 1x, 2x, 4x, 8x
- Speed multiplier affects how much game time passes per tick:
  - At 1x: each tick advances 0.1 seconds of game time
  - At 4x: each tick advances 0.4 seconds of game time
- Rendering interpolation is handled by Phase 6, not the engine

#### Unit Conversion
The engine works in world coordinates (0-1000 x 0-600). Convert nautical miles to world units:
- The strait is ~21nm wide at the narrows. If the map is ~600 units tall, then 1nm ≈ 28.6 world units (600/21).
- Use a conversion constant: `NM_TO_WORLD = 28.6`
- All ranges (radar, weapon) are specified in nm in the data but must be converted to world units for distance checks.
- Speed conversion: knots to world units per second → `speed_wu = speed_kt * NM_TO_WORLD / 3600`

### PathfindingSystem.js — Movement

#### Convoy Movement (GDD 7.2.1)
- 5 tankers spawn at the west edge of the map, spaced along the selected route
- They follow the route waypoints in order, moving at 15 knots (slowest vessel speed)
- Movement: each tick, advance position along the current waypoint segment by `speed * deltaTime`
- When reaching a waypoint, advance to the next segment
- When reaching the final waypoint (east edge), the tanker has **escaped**

```js
class PathfindingSystem {
  constructor(routeKey) {
    this.routeWaypoints = ROUTES[routeKey].waypoints;
  }

  updateConvoyPosition(tankers, deltaTime) {
    for (const tanker of tankers) {
      if (tanker.isDestroyed) continue;
      // Advance along route waypoints
      // Update position and rotation
      // Check if reached end → mark as escaped
    }
  }
}
```

#### Escort Formation
- Escort ships maintain positions relative to the convoy:
  - Lead: ahead of first tanker by offset
  - Port/Starboard: flanking at fixed distance
  - Rear: behind last tanker
  - Center: between tankers
  - Forward Screen: further ahead of lead
- Escorts move with the convoy but can break formation to engage nearby threats (within weapon range)
- After engaging, escorts return to formation position

#### Patrol Patterns
- Aircraft in patrol zones: orbit in circles or figure-8 within their assigned zone
- Submarines: slow patrol pattern within their zone
- Defender naval assets: hold position or patrol within their staging area unless engaging
- Fast Attack Craft: hold in staging area until detection, then move toward detected targets at full speed

### DetectionSystem.js — Radar & Fog of War (GDD 7.2.2)

#### Detection Mechanics
Each entity has a `radarRange`. Every tick, check if any enemy entity falls within radar range:

```js
detectEntities(allEntities) {
  for (const detector of allEntities) {
    if (detector.isDestroyed || detector.radarRange === 0) continue;

    for (const target of allEntities) {
      if (target.faction === detector.faction) continue;
      if (target.isDestroyed) continue;

      const dist = distance(detector.position, target.position);
      const effectiveRange = this.getEffectiveRange(detector, target);

      if (dist <= effectiveRange) {
        this.processDetection(detector, target);
      }
    }
  }
}
```

#### Signature-Based Detection Delay
- LOW signature: detected only within 50% of radar range, with a 3-second delay before confirmed
- MED signature: detected within 75% of radar range, 1-second delay
- HIGH signature: detected at full radar range, instant detection
- Submarines (SUBSURFACE type): only detectable by ASW assets:
  - MH-60R Seahawk dipping sonar: 8nm detection radius
  - P-8 Poseidon sonobuoys: within radar range
  - Los Angeles SSN passive sonar: within radar range
  - Regular surface radar CANNOT detect submarines

#### Detection State
- Each entity has a `detectedBy` set containing factions that have detected it
- Entities not in any enemy's `detectedBy` set are invisible on the fog of war
- When radar coverage is lost (radar station destroyed or moves out of range), targets remain detected for 10 seconds before fading (tracking memory)

#### EA-18G Growler Jamming (GDD 4.2.5)
- Growler has a 40nm jamming radius
- All Defender radar stations within this radius have their effective range reduced by 50%
- This causes Defender missile batteries (which need radar to fire) to lose targeting in jammed areas
- Hit probability for Defender assets in jammed area reduced by an additional 30% (per GDD)

### CombatResolver.js — Damage Calculation (GDD 7.2.3)

#### Damage Formula
```
Final Damage = Base Damage × (1 - CM Mitigation) × Hit Probability

Where:
  CM Mitigation:
    NONE     = 0%
    BASIC    = 20%
    ADVANCED = 40%

  Hit Probability:
    Base:           80%
    EW Jamming:     -30% (if target is in Growler jamming radius)
    Fast Mover:     -10% (if target speed > 100 knots)
    Combined:       max(10%, Base + modifiers)  // Floor at 10%
```

#### Targeting Priority
Each entity selects a target from detected enemies within weapon range, prioritizing:
1. **Incoming missiles/drones** (point defense) — highest priority
2. **Nearest enemy combatant** within weapon range
3. **Highest-value target** in range (by cost)

For tankers, Defender assets specifically target tankers as highest-value when in range.

```js
class CombatResolver {
  selectTarget(entity, detectedEnemies) {
    const inRange = detectedEnemies.filter(e =>
      distance(entity.position, e.position) <= entity.weaponRange
    );

    if (inRange.length === 0) return null;

    // Priority 1: incoming threats (drones, missiles targeting this entity)
    const threats = inRange.filter(e => e.isDrone || e.currentTarget === entity.id);
    if (threats.length > 0) return closest(entity, threats);

    // Priority 2: nearest combatant
    const combatants = inRange.filter(e => e.type !== 'TANKER');
    if (combatants.length > 0) return closest(entity, combatants);

    // Priority 3: highest value (tankers for Defender, expensive assets for Attacker)
    return inRange.sort((a, b) => b.cost - a.cost)[0];
  }

  resolveCombat(attacker, target) {
    if (attacker.reloadCooldown > 0) return null;
    if (attacker.isWinchester) return null;

    const hitProb = this.calculateHitProbability(attacker, target);
    const roll = this.rng();

    if (roll < hitProb) {
      const cmMitigation = COMBAT.CM_MITIGATION[target.countermeasures];
      const damage = Math.round(attacker.damage * (1 - cmMitigation));
      target.hp -= damage;

      if (target.hp <= 0) {
        target.hp = 0;
        target.isDestroyed = true;
      }

      attacker.ammo--;
      if (attacker.ammo <= 0) {
        attacker.isWinchester = true;
      }
      attacker.reloadCooldown = attacker.reloadTime;

      return { type: 'HIT', attacker, target, damage, destroyed: target.isDestroyed };
    } else {
      attacker.ammo--;
      if (attacker.ammo <= 0) attacker.isWinchester = true;
      attacker.reloadCooldown = attacker.reloadTime;

      return { type: 'MISS', attacker, target };
    }
  }
}
```

#### Special Combat Cases
- **Coastal missile batteries:** Cannot fire without radar coverage (check if any friendly radar station covers the target's position). If no radar → skip targeting.
- **Shahed-136 drones:** Each drone is a separate entity. They home toward the nearest detected target autonomously (no radar needed after launch). On impact: deal 80 damage, drone is destroyed. Easily shot down (10 HP each).
- **Ghadir submarine torpedoes:** Very high damage (180), very slow reload (60s), only 4 shots. Submarine must surface briefly to fire (increases signature to MED for 5 seconds after firing).
- **Infinite ammo assets** (CIWS, Cyclone PC): Never go WINCHESTER. Represented as `ammo: Infinity`.

### MineSystem.js — Mines (GDD 7.2.4)

#### Mine State
```js
class MineSystem {
  constructor(mineLayerPlacements) {
    this.mines = [];
    // For each mine layer placement, distribute 12 mines along the mine field segment
    for (const ml of mineLayerPlacements) {
      const segment = ml.mineField; // { start: {x,y}, end: {x,y} }
      for (let i = 0; i < 12; i++) {
        const t = (i + 0.5) / 12; // Evenly distributed along segment
        this.mines.push({
          id: `mine_${this.mines.length}`,
          position: lerpPoint(segment.start, segment.end, t),
          isDetonated: false,
          isRevealed: false,   // True if minesweeper has detected it
          damage: COMBAT.MINE_DAMAGE, // 150
        });
      }
    }
  }
}
```

#### Proximity Detonation
Each tick, check all non-detonated mines against all vessel positions:
```js
checkDetonations(entities) {
  const events = [];
  for (const mine of this.mines) {
    if (mine.isDetonated) continue;
    for (const entity of entities) {
      if (entity.isDestroyed) continue;
      if (entity.type === 'AIR') continue; // Aircraft don't trigger mines
      const dist = distance(mine.position, entity.position);
      if (dist <= COMBAT.MINE_TRIGGER_RADIUS * NM_TO_WORLD) {
        mine.isDetonated = true;
        entity.hp -= mine.damage;
        if (entity.hp <= 0) { entity.hp = 0; entity.isDestroyed = true; }
        events.push({ type: 'MINE_DETONATION', mine, entity, damage: mine.damage });
        break; // Mine is consumed
      }
    }
  }
  return events;
}
```

**Critical:** Mines do NOT discriminate by faction. Defender fast attack craft can trigger their own mines.

#### Minesweeper Detection
- Avenger MCM has mine detection sonar at 3nm sweep radius
- Each tick, check all unrevealed mines against minesweeper positions
- Revealed mines become visible (event emitted) and are safely detonated at 1 per 15 seconds
```js
sweepMines(minesweepers) {
  for (const sweeper of minesweepers) {
    if (sweeper.isDestroyed) continue;
    for (const mine of this.mines) {
      if (mine.isDetonated || mine.isRevealed) continue;
      if (distance(sweeper.position, mine.position) <= COMBAT.MINESWEEPER_SONAR_RANGE * NM_TO_WORLD) {
        mine.isRevealed = true;
        // Queue safe detonation (1 per 15 seconds)
      }
    }
  }
}
```

### End Conditions (GDD 7.2.5)

Check every tick after combat resolution:
```js
checkEndConditions() {
  const tankers = this.entities.filter(e => e.type === 'TANKER');
  const escaped = tankers.filter(e => e.hasEscaped);
  const destroyed = tankers.filter(e => e.isDestroyed);
  const remaining = tankers.filter(e => !e.isDestroyed && !e.hasEscaped);

  // Attacker victory: at least 1 tanker escaped
  if (escaped.length > 0 && remaining.length === 0) {
    return { winner: 'ATTACKER', reason: 'TANKERS_ESCAPED' };
  }

  // Defender victory: all tankers destroyed
  if (destroyed.length === 5) {
    return { winner: 'DEFENDER', reason: 'ALL_TANKERS_DESTROYED' };
  }

  // Time limit (e.g., 30 minutes game time)
  if (this.gameTime >= this.timeLimit) {
    // Tankers past 75% of route count as escaped
    for (const t of remaining) {
      const progress = this.pathfinding.getRouteProgress(t);
      if (progress >= 0.75) t.hasEscaped = true;
    }
    return { winner: escaped.length > 0 ? 'ATTACKER' : 'DEFENDER', reason: 'TIME_LIMIT' };
  }

  return null; // Simulation continues
}
```

### Event System

The engine emits structured events for the event log (Phase 6):
```js
{
  tick: 1432,
  gameTime: 143.2,     // seconds
  type: 'COMBAT_HIT',  // Event types below
  data: { ... },       // Event-specific data
}

// Event types:
// CONTACT_DETECTED   — new enemy detected by radar/sonar
// CONTACT_LOST       — enemy tracking lost
// COMBAT_HIT         — weapon hit target
// COMBAT_MISS        — weapon missed
// ASSET_DESTROYED    — entity HP reached 0
// MINE_DETONATION    — mine triggered
// MINE_REVEALED      — minesweeper detected mine
// WINCHESTER         — entity ammo depleted
// TANKER_ESCAPED     — tanker reached exit
// ABILITY_ACTIVATED  — player/AI used intervention ability
// SIMULATION_END     — simulation concluded
```

## Acceptance Criteria

1. **Engine initializes** from placement data: creates entity objects for all placed assets + 5 tankers
2. **Convoy moves:** Calling `tick()` repeatedly advances tanker positions along the selected route toward the east exit
3. **Escorts follow:** Escort ships maintain formation relative to convoy, moving together
4. **Detection works:** Assets detect enemies within radar range, respecting signature modifiers and sub-detection restrictions
5. **Combat resolves:** Entities fire at detected targets within weapon range, damage applies correctly per formula, ammo depletes, WINCHESTER triggers
6. **Coastal batteries require radar:** A missile battery with no radar coverage in range does NOT fire
7. **Mines work:** Mines detonate on proximity, deal 150 damage, can hit friendly units, minesweeper reveals them
8. **End conditions fire:** Simulation ends when all tankers are destroyed or escaped, or time limit reached
9. **Events emitted:** All significant events are pushed to the events array with correct types and data
10. **Deterministic:** Running the same placements with the same seed produces identical results
11. **Headless testable:** The engine can be run without any DOM/rendering by calling `tick()` in a loop and inspecting state

## Implementation Notes

- **No rendering code in the engine.** The engine is pure logic. Phase 6 reads engine state and renders it. This separation is critical for testability and future features (replay, multiplayer).
- **Use the seeded RNG** from `utils/random.js` for ALL random decisions (hit probability rolls, AI choices). This ensures deterministic replays.
- **NM-to-world conversion** is the trickiest part. Get this right early and test it — if ranges are wrong, the entire game balance collapses. Print radar circles to console/log to verify they match expected sizes.
- **Reload cooldown decrements** by `deltaTime` each tick (not by 1). At 10 ticks/sec and 1x speed, `deltaTime = 0.1s`. A 30s reload takes 300 ticks at 1x.
- **Infinite ammo** should use `Infinity` in JS, which naturally passes checks like `ammo > 0` and `ammo--` (Infinity - 1 = Infinity).
- **Entity naming:** Generate names for display (e.g., "DDG-52", "FAC-3", "VLCC PACIFIC GLORY"). Use the tanker names from GDD Section 8.2.1: Pacific Glory, Arabian Star, Gulf Meridian, Coral Dawn, Jade Horizon.
- **Performance:** With ~50 max entities, the O(n²) detection/combat loops are fine. No need to optimize with spatial partitioning at this scale.
- **The engine exposes its state** for the renderer: `engine.entities`, `engine.events`, `engine.gameTime`, `engine.isComplete`, `engine.winner`. Phase 6 reads these every frame.

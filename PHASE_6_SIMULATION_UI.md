# PHASE 6: Simulation Phase UI — Rendering, Event Log & Abilities

## Objective

Build the complete Simulation Phase visual experience: a 60fps Canvas rendering layer that visualizes the engine state (moving assets, combat effects, radar sweeps), the scrolling event log, speed controls, tanker status HUD, and the player's intervention ability system. After this phase, the player can watch battles play out with full visual feedback and interact via abilities.

## Prerequisites

- **Phase 2** complete (MapCanvas, MapRenderer, AssetRenderer, CRTEffects)
- **Phase 5** complete (SimulationEngine with all subsystems)

## GDD Reference Sections

- **Section 7.3** — Limited Interventions (Defender and Attacker abilities with cooldowns and effects)
- **Section 7.3.1** — Defender Interventions (Concentrate Fire, Scramble Reserves, Activate Decoys)
- **Section 7.3.2** — Attacker Interventions (Emergency Evasion, Tomahawk Strike, Smoke Screen)
- **Section 7.4** — Simulation HUD (layout diagram with time, speed, tankers, event log, abilities)
- **Section 7.4.1** — Event Log (format examples in DEFCON military terse style)
- **Section 10.1** — Visual Effects (missile trails, explosions, contact blips, mine detonations, radar sweeps, smoke, wrecks)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/SimulationPhase/SimulationPhase.jsx` | Create | Main simulation phase container, orchestrates engine + rendering |
| `src/components/SimulationPhase/SimCanvas.jsx` | Create | Canvas component running 60fps render loop over engine state |
| `src/components/SimulationPhase/EventLog.jsx` | Create | Scrolling terse military event log |
| `src/components/SimulationPhase/AbilityBar.jsx` | Create | Three ability buttons with cooldown indicators |
| `src/components/SimulationPhase/SimHUD.jsx` | Create | Top bar: game clock, speed controls, tanker status dots |
| `src/rendering/EffectsRenderer.js` | Create | Visual effects: missiles, explosions, radar sweeps, smoke, wrecks |
| `src/rendering/HUDRenderer.js` | Create | Canvas-based HUD overlays (range circles, labels) |
| `src/engine/AbilitySystem.js` | Create | Intervention ability definitions, activation, effect processing |
| `src/components/Game.jsx` | Modify | Wire simulation phase into game flow |

## Detailed Requirements

### SimulationPhase.jsx — Orchestrator

Manages the connection between the simulation engine and the rendering layer.

```jsx
function SimulationPhase({ gameState, dispatch }) {
  const engineRef = useRef(null);
  const [simState, setSimState] = useState({ entities: [], events: [], gameTime: 0 });

  // Initialize engine on mount
  useEffect(() => {
    engineRef.current = new SimulationEngine({
      playerFaction: gameState.playerFaction,
      difficulty: gameState.difficulty,
      playerPlacements: gameState.playerPlacements,
      aiPlacements: gameState.aiPlacements,
      selectedRoute: gameState.selectedRoute,
      rngSeed: Date.now(),
    });
  }, []);

  // Game loop: tick engine, update React state for HUD/EventLog
  // SimCanvas reads engine state directly via ref (not React state) for performance
}
```

Key responsibilities:
- Create and hold the SimulationEngine instance
- Run engine ticks at the correct rate (10 ticks/sec × speed multiplier)
- Provide engine ref to SimCanvas for direct state reading
- Throttle React state updates for HUD/EventLog (every 5 ticks, not every tick)
- Handle simulation completion → transition to WAR_SCORE phase
- Handle ability activation from AbilityBar

### SimCanvas.jsx — 60fps Rendering

Runs a `requestAnimationFrame` loop that renders the current simulation state every frame.

#### Render Pipeline (per frame):
```
1. Clear canvas
2. Draw static map layer (cached from Phase 2 MapRenderer)
3. Draw radar sweep arcs (EffectsRenderer)
4. Draw detection contacts (blinking blips for detected enemies)
5. Draw asset icons at current positions (AssetRenderer from Phase 2)
6. Draw active effects (missile trails, explosions, smoke)
7. Draw wreck icons for destroyed assets
8. Draw fog of war overlay (dim areas outside own radar coverage)
9. Apply CRT effects (scan lines, bloom, vignette from Phase 2)
```

#### Position Interpolation
The engine ticks at 10Hz but rendering is at 60fps. Interpolate entity positions between ticks for smooth movement:
```js
const alpha = timeSinceLastTick / tickInterval;
const renderX = lerp(entity.prevPosition.x, entity.position.x, alpha);
const renderY = lerp(entity.prevPosition.y, entity.position.y, alpha);
```

#### Entity Rendering Rules
- **Friendly assets:** Always visible with full faction-colored icons
- **Enemy assets (detected):** Blinking vector blips, classification label (`SURFACE`, `SUBSURFACE`, `AIR`, `UNKNOWN`), concentric ring animation on first detection
- **Enemy assets (undetected):** Not rendered (fog of war)
- **Destroyed assets:** Faded icon with "X" overlay, static position (wreck)
- **WINCHESTER assets:** Dimmed icon with "WINCHESTER" label
- **Tankers:** Always visible to player (amber icons), health bar above each

### EffectsRenderer.js — Visual Effects (GDD 10.1)

All effects are vector-based (no raster/sprites). Each effect type has a lifecycle (start, animate, end).

#### Missile/Weapon Trail
- Thin vector line from attacker position to target position
- Color: faction color at 80% opacity
- Fading tail: line fades from bright at the head to transparent at the tail
- Duration: ~1 second, then fade out
- Triggered on every COMBAT_HIT and COMBAT_MISS event

#### Explosion
- Triggered on ASSET_DESTROYED event
- Expanding circle with radial lines emanating from center
- Color: `#ff6600` → `#ff0000` (orange to red)
- Bloom flash: brief bright flash at center (increased shadowBlur)
- Duration: ~1.5 seconds, expanding then fading
- Size proportional to asset HP (tankers explode bigger)

#### Mine Detonation
- Triggered on MINE_DETONATION event
- Large expanding circle with jagged/rough edges (underwater explosion feel)
- Color: `#ff6600` with high bloom
- Concentric rings expanding outward
- Duration: ~2 seconds

#### Radar Sweep
- Each radar-equipped entity shows a rotating arc
- Arc sweeps 360° with rotation speed proportional to radar range (larger range = slower sweep)
- Color: `rgba(0, 255, 136, 0.25)` (green, 25% opacity)
- Fading trail behind the sweep line
- Only shown for friendly assets (player's faction)

#### Contact Blip
- On CONTACT_DETECTED: small pulsing dot at the contact position
- Concentric rings expanding outward from the dot on first detection
- Blip pulses (opacity oscillation) while contact is maintained
- Classification label in small text: `"SURFACE"`, `"SUBSURFACE"`, `"AIR"`

#### Smoke Screen (Ability Effect)
- Animated translucent overlay in a ~5nm zone
- Color: `rgba(136, 136, 136, 0.25)`
- Drifting noise/cloud pattern (can be faked with multiple overlapping translucent circles that slowly drift)
- Duration: 20 seconds (per ability description)

#### Wreck Icon
- Dimmed version of the original asset icon
- "X" drawn over it in the asset's faction color at 50% opacity
- Static position (no movement)
- Persists for the rest of the simulation

#### Effect Manager
```js
class EffectsManager {
  constructor() {
    this.activeEffects = [];
  }

  addEffect(type, data) {
    this.activeEffects.push({
      type,          // 'MISSILE_TRAIL' | 'EXPLOSION' | 'MINE_BLAST' | 'CONTACT_BLIP' | 'SMOKE'
      data,          // Position, color, target, etc.
      startTime: performance.now(),
      duration: EFFECT_DURATIONS[type],
    });
  }

  update(currentTime) {
    // Remove expired effects
    this.activeEffects = this.activeEffects.filter(e =>
      currentTime - e.startTime < e.duration
    );
  }

  render(ctx, currentTime) {
    for (const effect of this.activeEffects) {
      const progress = (currentTime - effect.startTime) / effect.duration;
      this.drawEffect(ctx, effect, progress);
    }
  }
}
```

### EventLog.jsx — Scrolling Event Log (GDD 7.4.1)

A scrolling text panel in the bottom-left showing battle events in DEFCON-style terse military language.

#### Format
```
[14:32:07] MINE DETONATION — GRID 26.42N 56.18E — VLCC PACIFIC GLORY STRUCK — DMG 150
[14:31:45] SPLASH — THONDAR FAC-2 DESTROYED BY DDG-52 SM-2
[14:30:12] NEW CONTACT — SUBSURFACE — BEARING 045 — CLASSIFIED GHADIR
[14:29:58] WINCHESTER — FFG-7 HARPOON MAGAZINE DEPLETED
[14:28:33] ENGAGEMENT — DDG-52 FIRES ON THONDAR FAC-3 — HIT — DMG 112
[14:27:10] MINE REVEALED — GRID 26.38N 56.22E — AVENGER MCM SWEEP
```

#### Event Type → Log Message Mapping
| Engine Event | Log Format |
|-------------|------------|
| CONTACT_DETECTED | `NEW CONTACT — [TYPE] — BEARING [DEG] — CLASSIFIED [NAME]` |
| CONTACT_LOST | `CONTACT LOST — [NAME] — LAST BEARING [DEG]` |
| COMBAT_HIT | `ENGAGEMENT — [ATTACKER] FIRES ON [TARGET] — HIT — DMG [N]` |
| COMBAT_MISS | `ENGAGEMENT — [ATTACKER] FIRES ON [TARGET] — MISS` |
| ASSET_DESTROYED | `SPLASH — [NAME] DESTROYED BY [KILLER]` |
| MINE_DETONATION | `MINE DETONATION — GRID [COORD] — [VICTIM] STRUCK — DMG [N]` |
| MINE_REVEALED | `MINE REVEALED — GRID [COORD] — [SWEEPER] SWEEP` |
| WINCHESTER | `WINCHESTER — [NAME] [WEAPON] MAGAZINE DEPLETED` |
| TANKER_ESCAPED | `PASSAGE CONFIRMED — [NAME] REACHED OPEN WATER` |
| ABILITY_ACTIVATED | `COMMAND — [ABILITY NAME] ACTIVATED — [DETAILS]` |

#### Styling
- Monospace text, `#00ff88` (green), uppercase
- Newest events at the top (reverse chronological)
- Auto-scrolls to show newest event
- Maximum ~50 visible entries (older entries scroll out)
- Container: semi-transparent dark background, thin green border

### AbilityBar.jsx — Intervention Abilities (GDD 7.3)

Three ability buttons displayed in the bottom-right of the simulation screen.

#### Defender Abilities (GDD 7.3.1)
| Ability | Cooldown | Effect |
|---------|----------|--------|
| CONCENTRATE FIRE | 60s | All assets in 10nm radius focus fire on designated target for 15s |
| SCRAMBLE RESERVES | 120s | Deploy 2 Thondar FAC from random naval staging area |
| ACTIVATE DECOYS | 90s | Spawn 3 radar decoy signatures near selected area for 20s |

#### Attacker Abilities (GDD 7.3.2)
| Ability | Cooldown | Effect |
|---------|----------|--------|
| EMERGENCY EVASION | 60s | Selected tanker performs emergency turn, +50% CM for 15s |
| TOMAHAWK STRIKE | 120s | 200 damage to visible fixed emplacement. One use only. |
| SMOKE SCREEN | 90s | All assets in 5nm zone gain LOW signature for 20s |

#### Button Display
```
[CONCENTRATE FIRE  ██░░ 34s]   — Cooldown bar filling up
[SCRAMBLE RESERVES ████ READY]  — Ready to use
[ACTIVATE DECOYS   ██░░ 52s]   — Cooldown bar filling up
```

- Each button shows: ability name + cooldown bar + time remaining OR "READY"
- Ready abilities glow with faction color, clickable
- On cooldown: dimmed, progress bar shows remaining time
- One-use abilities (Tomahawk) show "EXPENDED" after use, permanently dimmed

#### Activation Flow
1. Player clicks a READY ability button
2. Some abilities require a map target:
   - CONCENTRATE FIRE: click an enemy entity on the map
   - TOMAHAWK STRIKE: click a visible fixed emplacement (radar/missile battery)
   - EMERGENCY EVASION: click a tanker
   - SMOKE SCREEN: click a point on the convoy route
   - ACTIVATE DECOYS: click a point on the map
   - SCRAMBLE RESERVES: no target needed (auto-activates)
3. Ability effect is applied in the engine via AbilitySystem
4. Cooldown starts
5. Event emitted to EventLog

### AbilitySystem.js — Ability Logic

```js
const ABILITIES = {
  DEFENDER: [
    {
      id: 'concentrate_fire',
      name: 'CONCENTRATE FIRE',
      cooldown: 60,
      requiresTarget: 'ENTITY',   // Click an entity
      effect: (engine, targetEntity) => {
        // All friendly assets within 10nm of target focus fire on it for 15s
        const nearby = engine.entities.filter(e =>
          e.faction === 'DEFENDER' && !e.isDestroyed &&
          distance(e.position, targetEntity.position) <= 10 * NM_TO_WORLD
        );
        nearby.forEach(e => {
          e.forcedTarget = targetEntity.id;
          e.forcedTargetExpiry = engine.gameTime + 15;
        });
      },
    },
    {
      id: 'scramble_reserves',
      name: 'SCRAMBLE RESERVES',
      cooldown: 120,
      requiresTarget: null,       // Auto-activates
      effect: (engine) => {
        // Spawn 2 Thondar FAC from a random naval staging area
        // Create 2 new entities with Thondar FAC stats
      },
    },
    {
      id: 'activate_decoys',
      name: 'ACTIVATE DECOYS',
      cooldown: 90,
      requiresTarget: 'POINT',    // Click a map location
      effect: (engine, point) => {
        // Spawn 3 decoy entities near point
        // Decoys appear as SURFACE contacts to Attacker radar
        // Decoys expire after 20 seconds
      },
    },
  ],
  ATTACKER: [
    {
      id: 'emergency_evasion',
      name: 'EMERGENCY EVASION',
      cooldown: 60,
      requiresTarget: 'TANKER',
      effect: (engine, tankerEntity) => {
        // Tanker deviates from route temporarily
        // +50% countermeasure rating for 15s
        // (NONE → 50% mitigation, BASIC → 70%, etc.)
      },
    },
    {
      id: 'tomahawk_strike',
      name: 'TOMAHAWK STRIKE',
      cooldown: 120,
      requiresTarget: 'FIXED_EMPLACEMENT',
      maxUses: 1,
      effect: (engine, targetEntity) => {
        // Deal 200 damage to target fixed emplacement
        targetEntity.hp -= 200;
        if (targetEntity.hp <= 0) {
          targetEntity.hp = 0;
          targetEntity.isDestroyed = true;
        }
      },
    },
    {
      id: 'smoke_screen',
      name: 'SMOKE SCREEN',
      cooldown: 90,
      requiresTarget: 'POINT',
      effect: (engine, point) => {
        // All assets within 5nm of point gain LOW signature for 20s
        const nearby = engine.entities.filter(e =>
          e.faction === 'ATTACKER' && !e.isDestroyed &&
          distance(e.position, point) <= 5 * NM_TO_WORLD
        );
        nearby.forEach(e => {
          e.signatureOverride = 'LOW';
          e.signatureOverrideExpiry = engine.gameTime + 20;
        });
      },
    },
  ],
};
```

### SimHUD.jsx — Top Bar

```
┌──────────────────────────────────────────────────────────────┐
│ TIME: 00:14:32    SPEED: [1x] [2x] [■4x] [8x]    TANKERS: ●●●●○ │
└──────────────────────────────────────────────────────────────┘
```

- **Game clock:** `HH:MM:SS` format in monospace
- **Speed controls:** Four buttons (1x, 2x, 4x, 8x). Active speed highlighted. Clicking changes `engine.speedMultiplier`
- **Tanker status:** 5 dots — filled (●) for alive, empty (○) for destroyed, check (✓) for escaped
- Styled as a thin bar across the top of the simulation viewport
- CRT monospace text, green on dark background

## Acceptance Criteria

1. **Simulation plays visually:** After planning phase, simulation starts and shows assets moving on the map
2. **Convoy moves:** Tankers visibly move from west to east along the selected route
3. **Escorts follow:** Escort ships move with the convoy in formation
4. **Detection visualized:** When an enemy enters radar range, a blinking contact blip appears with classification label
5. **Combat visualized:** Weapon trails (lines from attacker to target) appear during combat, explosions appear on asset destruction
6. **Radar sweeps:** Friendly radar-equipped assets show rotating radar sweep arcs
7. **Mine detonation:** Visible explosion effect when a mine triggers, with event log entry
8. **Event log:** Scrolling text shows all major events in DEFCON terse format
9. **Speed controls:** Clicking 1x/2x/4x/8x changes simulation speed noticeably
10. **Tanker status:** HUD dots update as tankers are destroyed or escape
11. **Abilities work:** All 3 abilities for the player's faction are shown, clickable when ready, cooldowns display and count down, effects execute correctly in the engine
12. **Simulation ends:** When end conditions are met, simulation stops and transitions to War Score phase
13. **CRT effects active:** Scan lines, bloom, and vignette are rendered over the simulation
14. **Performance:** Smooth 60fps with ~50 entities and active effects

## Implementation Notes

- **Read engine state directly, not through React state.** SimCanvas should access `engineRef.current.entities` in its rAF loop, not re-render through `setState`. React state updates are too slow for 60fps rendering. Only update React state for HUD elements (clock, tanker dots, event count) at a throttled rate (~5 Hz).
- **Effect lifecycle management.** Effects are triggered by engine events. Listen for new events each tick and spawn corresponding visual effects. Effects self-expire based on duration. Use the EffectsManager class to handle this cleanly.
- **Fog of war overlay.** The simplest approach: render the entire map normally, then draw a semi-transparent dark overlay, then "cut out" circles at each friendly radar position (using `ctx.globalCompositeOperation = 'destination-out'` or similar). This reveals the area under your radar coverage and dims everything else.
- **Ability targeting UX.** When the player clicks an ability that needs a target, enter a "targeting mode" — change cursor, show valid target highlights on map, wait for click. Cancel on right-click or Escape. For entity targets, highlight valid entities (enemy for Concentrate Fire, tanker for Evasion).
- **Tomahawk Strike animation.** Even though it's "instant" in the engine, visually show a missile trail from the edge of the map (or from a ship) to the target, then an explosion. Brief dramatic pause.
- **Decoy entities.** Decoys are temporary entities with faction=DEFENDER, type=SURFACE, high signature, 1 HP. They appear as real contacts to the Attacker's radar. They self-destruct after 20 seconds.
- **Wreck rendering.** Destroyed entities stay on the map. Render them in a separate pass (before live entities) so they appear "under" living units. Use 30% opacity of original icon color.

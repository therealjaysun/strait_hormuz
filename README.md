# HORMUZ

Asymmetric tower defense strategy game set in the Strait of Hormuz. Command either the Iranian Coastal Defense or Coalition Naval Escort forces in a tense naval confrontation over control of one of the world's most critical maritime chokepoints.

Built as a browser-based single-player game with a DEFCON-style CRT vector aesthetic.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npx vitest run
```

The dev server starts at `http://localhost:5173` by default.

## How to Play

### Factions

**Defender (Iranian Coastal Command)** -- Close the strait. Deny passage. Destroy the tankers.
- Coastal missile batteries, radar stations, fast attack craft, submarines, mines, drones
- Goal: Destroy or prevent tanker convoy passage

**Attacker (Coalition Naval Escort)** -- Escort the convoy. Protect the tankers. Keep the oil flowing.
- Destroyers, cruisers, frigates, submarines, aircraft, minesweepers
- Goal: Escort 5 VLCC tankers safely through the strait

### Game Flow

1. **Main Menu** -- Start a new skirmish, view how to play, adjust settings
2. **Faction Select** -- Choose Defender or Attacker, then select difficulty (Advisory / Elevated / Severe / Critical)
3. **Briefing** -- Mission overview with strategic context
4. **Planning Phase** -- Place your assets on the map within your budget. Attacker also selects a convoy route (Alpha/Bravo/Charlie). AI opponent places its forces automatically based on difficulty.
5. **Simulation** -- Watch the engagement unfold in real-time. Use abilities, adjust speed. Press `?` for keyboard shortcuts.
6. **War Score** -- After-action report with effectiveness grades, tanker status, military losses, and tactical summary.

### Difficulty Levels

| Level | AI Behavior |
|-------|-------------|
| **Advisory** | AI uses 70-80% of budget, random route selection, no abilities |
| **Elevated** | AI uses 80-90% of budget, weighted route selection, reactive abilities |
| **Severe** | AI uses 95-100% of budget, analyzed routes, proactive ability usage |
| **Critical** | AI uses ~100% of budget with optimal composition, feint-capable routing, optimal ability timing |

### Keyboard Shortcuts

**Planning Phase:**
| Key | Action |
|-----|--------|
| `1-9` | Select equipment slot |
| `Escape` | Cancel current selection |
| `Delete` / `Backspace` | Remove last placed asset |
| `R` | Cycle route (Attacker only) |
| `Space` | Commence operation |
| `Tab` | Cycle through placed assets |

**Simulation Phase:**
| Key | Action |
|-----|--------|
| `1` / `2` / `3` | Activate ability |
| `[` / `]` | Decrease / increase speed |
| `Space` | Pause / resume |
| `Escape` | Cancel targeting |
| `?` | Toggle shortcut overlay |

### Settings

Accessible from the main menu:
- **Default Speed** -- 1x, 2x, 4x, or 8x simulation speed
- **High Contrast** -- Thicker lines, brighter text, increased scan line visibility
- **Show FPS** -- Toggle FPS and entity count overlay during simulation

## Project Structure

```
src/
  components/           # React UI components
    Game.jsx            # Root game state machine and phase router
    MainMenu.jsx        # Title screen
    FactionSelect.jsx   # Faction + difficulty picker
    Briefing.jsx        # Mission briefing
    Settings.jsx        # Settings screen
    WarScore.jsx        # After-action report
    PlanningPhase/      # Asset placement phase (sidebar, map, zones)
    SimulationPhase/    # Real-time simulation (canvas, HUD, event log, abilities)

  engine/               # Game simulation logic (no rendering)
    SimulationEngine.js # Core 10Hz tick simulation loop
    CombatResolver.js   # Weapon engagement and damage
    DetectionSystem.js  # Radar, signature, and fog of war
    MineSystem.js       # Mine placement, sweeping, detonation
    PathfindingSystem.js# Convoy waypoint navigation
    AbilitySystem.js    # Player abilities with cooldowns
    AIAbilities.js      # AI ability controller (per difficulty)
    AIPlacement.js      # AI asset placement generator
    ScoringEngine.js    # War Score calculation and grading

  rendering/            # Canvas 2D rendering
    MapRenderer.js      # Static map with caching (coastlines, grid, islands, routes)
    AssetRenderer.js    # Vector military unit icons
    EffectsRenderer.js  # Missile trails, explosions, radar sweeps, fog of war
    HUDRenderer.js      # Health bars, entity labels, classification
    CRTEffects.js       # Scan lines, vignette, bloom (cached)
    ZoneRenderer.js     # Placement zone overlays

  data/                 # Static game data
    constants.js        # Simulation params, scoring weights, grade thresholds
    defenderEquipment.js# Iranian equipment catalog (11 assets)
    attackerEquipment.js# Coalition equipment catalog (10 assets)
    mapData.js          # Coastlines, islands, routes, TSS lanes
    placementZones.js   # Valid placement regions per faction
    tankerConvoy.js     # Tanker definitions and cargo values

  utils/                # Shared utilities
    geometry.js         # Distance, angle calculations
    random.js           # Seeded RNG
    formatters.js       # Display formatting
```

## Tech Stack

- **React 18** -- UI framework
- **Vite 6** -- Build tool and dev server
- **Tailwind CSS 3** -- Utility-first styling
- **Canvas 2D** -- All map/simulation rendering (no WebGL)
- **Vitest** -- Test framework

No external game frameworks or physics engines. The simulation runs a deterministic 10Hz tick loop independent of the 60fps render loop.

## Scoring System

The War Score evaluates both factions on a 0-100 scale across four weighted components:

| Component | Weight | Description |
|-----------|--------|-------------|
| Oil Objective | 40% | Tanker passage rate (Attacker) or denial rate (Defender) |
| Cost Efficiency | 25% | Damage dealt relative to budget spent |
| Exchange Rate | 20% | Value of enemy losses vs own losses |
| Survival Rate | 15% | Percentage of own forces surviving |

Letter grades: S (90+), A (80+), B+ (70+), B (60+), C+ (50+), C (40+), D (30+), F (<30)

## Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| >= 1280px | Full layout with sidebar, map, and HUD |
| 1024-1279px | Compact sidebar, scaled elements |
| 768-1023px | Overlay panels, 44px touch targets |
| < 768px | "Rotate device" message, no gameplay |

## Accessibility

- All interactive elements have `aria-label` attributes
- Phase transitions announced via `aria-live` region
- Event log uses `role="log"` with `aria-live="polite"`
- Canvas is `aria-hidden="true"` (event log provides text equivalent)
- Tanker status uses shape + color encoding (not color alone)
- High-contrast mode available in settings

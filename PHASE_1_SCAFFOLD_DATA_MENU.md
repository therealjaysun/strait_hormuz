# PHASE 1: Project Scaffolding, Data Layer & Main Menu

## Objective

Initialize the HORMUZ project from scratch: set up the Vite + React + Tailwind build system, create the full directory structure, transcribe all game data from the GDD into importable JS modules, build utility functions, implement the game phase router, and deliver a CRT-styled main menu screen. This phase establishes every foundation that subsequent phases build on.

## Prerequisites

None — this is the first phase.

## GDD Reference Sections

- **Section 1** — High-Level Concept (game summary, factions)
- **Section 2.1** — Main Menu (layout, button labels)
- **Section 3.1** — Geography (coastline descriptions, islands, lanes)
- **Section 3.3** — War Paths (convoy routes ALPHA/BRAVO/CHARLIE, defender placement zones, attacker placement zones)
- **Section 4.1** — Defender Equipment (all asset stat tables: coastal batteries, radar stations, naval assets, mines, aerial assets)
- **Section 4.2** — Attacker Equipment (all asset stat tables: escort warships, minesweeper, submarine, aerial, EW)
- **Section 4.3** — Tanker Convoy (VLCC and Aframax stats, convoy value)
- **Section 5** — Budget System (budget table per difficulty)
- **Section 10.1** — Color Palette & Typography
- **Section 11.1** — Platform & Stack
- **Section 11.2** — Architecture (directory structure)
- **Section 12** — Game Balance Guidelines (constants, tuning parameters)

## Files to Create

### Build & Config
| File | Purpose |
|------|---------|
| `package.json` | Dependencies: react 18+, react-dom, vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer |
| `vite.config.js` | Vite config with React plugin |
| `tailwind.config.js` | Tailwind config with custom CRT color palette from GDD 10.1 |
| `postcss.config.js` | PostCSS with Tailwind and Autoprefixer |
| `index.html` | Entry HTML with root div, meta viewport, title "HORMUZ" |

### Source — Components
| File | Purpose |
|------|---------|
| `src/App.jsx` | Root React component, mounts `<Game />` |
| `src/components/Game.jsx` | Phase state machine router: `MENU → FACTION_SELECT → BRIEFING → PLANNING → SIMULATION → WAR_SCORE` |
| `src/components/MainMenu.jsx` | CRT-styled title screen with three buttons: NEW SKIRMISH, HOW TO PLAY, SETTINGS |

### Source — Data
| File | Purpose |
|------|---------|
| `src/data/defenderEquipment.js` | All Defender asset definitions from GDD 4.1 |
| `src/data/attackerEquipment.js` | All Attacker asset definitions from GDD 4.2 |
| `src/data/tankerConvoy.js` | Tanker definitions from GDD 4.3 |
| `src/data/mapData.js` | Coastline coordinate stubs, island locations, TSS lanes, route waypoints (ALPHA/BRAVO/CHARLIE) |
| `src/data/placementZones.js` | Zone definitions from GDD 3.3 (types, capacities, positions) |
| `src/data/constants.js` | Game balance constants, budget tables, combat formula values, difficulty settings |

### Source — Utilities
| File | Purpose |
|------|---------|
| `src/utils/geometry.js` | `distance(a, b)`, `isInRange(a, b, range)`, `pointOnArc()`, `lerp()`, `normalizeAngle()` |
| `src/utils/random.js` | Seeded PRNG (mulberry32 or similar) for deterministic simulations |
| `src/utils/formatters.js` | `formatCurrency(n)`, `formatTime(seconds)`, `formatCoordinate(lat, lon)`, `formatDamage(n)` |

### Source — Styles
| File | Purpose |
|------|---------|
| `src/index.css` | Tailwind directives, global CRT styles, font setup, CSS custom properties for palette |

## Detailed Requirements

### Project Initialization
- Use Vite with `@vitejs/plugin-react`
- React 18+ with functional components and hooks only
- Tailwind CSS 3+ for HUD/UI styling
- No TypeScript (plain JSX/JS)
- No router library — phase routing is internal state in `Game.jsx`

### Game Phase Router (`Game.jsx`)
```jsx
// State machine phases:
const PHASES = {
  MENU: 'MENU',
  FACTION_SELECT: 'FACTION_SELECT',
  BRIEFING: 'BRIEFING',
  PLANNING: 'PLANNING',
  SIMULATION: 'SIMULATION',
  WAR_SCORE: 'WAR_SCORE'
};

// Game state shape:
const initialGameState = {
  phase: PHASES.MENU,
  playerFaction: null,    // 'DEFENDER' | 'ATTACKER'
  difficulty: null,       // 'ADVISORY' | 'ELEVATED' | 'SEVERE' | 'CRITICAL'
  playerBudget: 0,
  aiBudget: 0,
  playerPlacements: [],
  aiPlacements: [],
  selectedRoute: null,    // 'ALPHA' | 'BRAVO' | 'CHARLIE'
  simulationResult: null,
};
```

### Main Menu (`MainMenu.jsx`)
- Full-viewport dark background (`#0a0a14`)
- Title "HORMUZ" in large monospace text with phosphor green glow (`#00ff88`)
- Subtitle: "STRAIT OF HORMUZ — TACTICAL COMMAND"
- Three buttons stacked vertically:
  - `[ NEW SKIRMISH ]` → transitions to `FACTION_SELECT`
  - `[ HOW TO PLAY ]` → placeholder (Phase 3)
  - `[ SETTINGS ]` → placeholder
- CRT scan line effect via CSS (repeating-linear-gradient, 2px intervals, 5% opacity)
- Subtle screen curvature vignette via radial-gradient overlay

### Color Palette (CSS Custom Properties)
From GDD Section 10.1:
```css
:root {
  --color-bg: #0a0a14;
  --color-coastline: #00ff88;
  --color-grid: #112211;
  --color-defender: #ff3333;
  --color-attacker: #3399ff;
  --color-tanker: #ffaa00;
  --color-radar: rgba(0, 255, 136, 0.25);
  --color-explosion-start: #ff6600;
  --color-explosion-end: #ff0000;
  --color-text: #00ff88;
  --color-warning: #ff3333;
  --color-mine: #ffff00;
  --color-smoke: rgba(136, 136, 136, 0.25);
}
```

### Typography
- Primary font: `'Courier New', 'Courier', monospace`
- All text rendered uppercase (`text-transform: uppercase`)
- Letter spacing: `0.1em`
- Text glow: `text-shadow: 0 0 10px var(--color-text)`

### Equipment Data Format
Each equipment entry should follow this shape:
```js
export const defenderEquipment = [
  {
    id: 'noor_ashm',
    name: 'Noor AShM Battery',
    category: 'COASTAL_MISSILE',  // For filtering in equipment panel
    faction: 'DEFENDER',
    cost: 150,
    hp: 80,
    speed: 0,
    radarRange: 0,     // nm
    weaponRange: 75,    // nm
    damage: 120,
    reloadTime: 30,     // seconds
    ammo: 6,
    signature: 'LOW',   // 'LOW' | 'MED' | 'HIGH'
    countermeasures: 'NONE', // 'NONE' | 'BASIC' | 'ADVANCED'
    description: 'Anti-ship missile battery. Requires external radar for targeting.',
    placementType: 'COASTAL', // Where this can be placed
    maxStock: 4,        // Max available for purchase
  },
  // ... all other Defender assets
];
```

Transcribe ALL equipment from GDD tables (Sections 4.1.1 through 4.2.5). Include:
- **Defender:** Noor AShM, Khalij Fars ASBM, Ghader Cruise Missile, Coastal Surveillance Radar, Mobile Radar Unit, Thondar FAC, Sina Corvette, Ghadir Sub, Mine Layer, Su-22, Shahed-136 Swarm
- **Attacker:** Arleigh Burke DDG, Ticonderoga CG, Perry FFG, Cyclone PC, Avenger MCM, Los Angeles SSN, F/A-18E, MH-60R Seahawk, P-8 Poseidon, EA-18G Growler
- **Tankers:** VLCC Supertanker (x3), Aframax Tanker (x2)

### Budget & Difficulty Constants
From GDD Section 5:
```js
export const BUDGETS = {
  ADVISORY:  { DEFENDER: 1500, ATTACKER: 2000 },
  ELEVATED:  { DEFENDER: 1800, ATTACKER: 1800 },
  SEVERE:    { DEFENDER: 2000, ATTACKER: 1600 },
  CRITICAL:  { DEFENDER: 2200, ATTACKER: 1400 },
};
```

### Combat Constants
From GDD Sections 7.2.3, 7.2.4, 12:
```js
export const COMBAT = {
  BASE_HIT_PROBABILITY: 0.80,
  EW_JAMMING_PENALTY: -0.30,
  FAST_MOVER_PENALTY: -0.10,
  CM_MITIGATION: { NONE: 0, BASIC: 0.20, ADVANCED: 0.40 },
  MINE_TRIGGER_RADIUS: 0.2,  // nm
  MINE_DAMAGE: 150,
  MINESWEEPER_SONAR_RANGE: 3, // nm
  MINESWEEPER_CLEAR_RATE: 15, // seconds per mine
};
```

### Placement Zone Definitions
From GDD Section 3.3:
```js
export const PLACEMENT_ZONES = {
  defender: {
    coastal: { count: 6, types: ['COASTAL_MISSILE', 'RADAR'], label: 'Iranian Coastline Emplacements' },
    island: { count: 4, names: ['Qeshm', 'Hormuz', 'Larak', 'Hengam'], types: ['MIXED'], label: 'Island Forward Bases' },
    naval: { count: 3, types: ['NAVAL'], label: 'Naval Staging Areas' },
    aerial: { count: 2, types: ['AERIAL'], label: 'Aerial Patrol Zones' },
  },
  attacker: {
    convoy: { count: 5, positions: ['lead', 'port', 'starboard', 'rear', 'center'], types: ['ESCORT'], label: 'Convoy Formation' },
    forwardScreen: { count: 2, types: ['ESCORT', 'MCM'], label: 'Forward Screen' },
    aerial: { count: 2, types: ['AERIAL'], label: 'CAP Zones' },
    submarine: { count: 2, types: ['SUBMARINE'], label: 'Submarine Patrol Zones' },
  },
};
```

### Map Data (Stubs for Phase 2)
Provide coordinate arrays for coastlines, island outlines, and route waypoints. These will be rough approximations refined in Phase 2 when the Canvas renderer is built. Use a normalized coordinate system (0-1000 x, 0-600 y) that maps to the canvas viewport.

```js
export const MAP_BOUNDS = {
  width: 1000,
  height: 600,
  // Real-world approximate bounds for reference:
  // Lat: 25.5°N to 27.0°N
  // Lon: 55.5°E to 57.5°E
};

export const ROUTES = {
  ALPHA: { name: 'Route Alpha', description: 'Northern passage — shorter but more exposed', waypoints: [...] },
  BRAVO: { name: 'Route Bravo', description: 'Central passage — standard TSS outbound lane', waypoints: [...] },
  CHARLIE: { name: 'Route Charlie', description: 'Southern passage — longer but more defensible', waypoints: [...] },
};
```

### Utility Functions

**geometry.js:**
- `distance(p1, p2)` — Euclidean distance between two `{x, y}` points
- `isInRange(p1, p2, range)` — Boolean check if two points are within range
- `lerp(a, b, t)` — Linear interpolation
- `lerpPoint(p1, p2, t)` — Lerp between two `{x, y}` points
- `normalizeAngle(angle)` — Normalize radian angle to [0, 2π]
- `angleBetween(p1, p2)` — Angle from p1 to p2 in radians
- `pointOnCircle(center, radius, angle)` — Point at angle on circle

**random.js:**
- `createRNG(seed)` — Returns a seeded PRNG function (mulberry32). Returns values in [0, 1).
- `randomInt(rng, min, max)` — Random integer in [min, max] using the given RNG
- `randomChoice(rng, array)` — Random element from array
- `randomFloat(rng, min, max)` — Random float in [min, max)

**formatters.js:**
- `formatCurrency(n)` — e.g., `700000000` → `"$700M"`
- `formatBudget(n)` — e.g., `1240` → `"1,240"`
- `formatTime(totalSeconds)` — e.g., `872` → `"14:32"`
- `formatCoordinate(lat, lon)` — e.g., `"26.42N 56.18E"`
- `formatDamage(n)` — e.g., `150` → `"DMG 150"`

## Acceptance Criteria

1. `npm install` succeeds with no errors
2. `npm run dev` starts the Vite dev server and opens the app in browser
3. Main menu displays with:
   - Dark background (`#0a0a14`)
   - "HORMUZ" title with green phosphor glow
   - Three buttons in CRT monospace style
   - Visible CRT scan line effect
   - Vignette darkening at screen edges
4. Clicking "NEW SKIRMISH" transitions the view (to a placeholder or blank screen — faction select is Phase 3)
5. All data files can be imported and contain correct values matching GDD tables:
   - `defenderEquipment` has 11 asset types with correct stats
   - `attackerEquipment` has 10 asset types with correct stats
   - `tankerConvoy` has 2 tanker types (3 VLCC + 2 Aframax) totaling $700M
   - `BUDGETS` matches GDD Section 5 table exactly
   - `COMBAT` constants match GDD Section 7.2.3 values
6. Utility functions work correctly (test in console):
   - `distance({x:0,y:0}, {x:3,y:4})` returns `5`
   - `createRNG(42)` returns deterministic values
   - `formatCurrency(180000000)` returns `"$180M"`
   - `formatTime(872)` returns `"14:32"`

## Implementation Notes

- **Data transcription is the bulk of this phase.** Be meticulous — every stat must match the GDD tables exactly. Future phases (simulation engine, scoring) rely on these values.
- **Use `export const` for all data** — no default exports. This allows tree-shaking and selective imports.
- **Equipment IDs** should be snake_case and unique across all factions (e.g., `noor_ashm`, `arleigh_burke_ddg`).
- **The `category` field on equipment** is critical for the planning phase equipment panel filtering. Categories should be: `COASTAL_MISSILE`, `RADAR`, `NAVAL`, `MINE_LAYER`, `AERIAL`, `ESCORT`, `MCM`, `SUBMARINE`, `EW`, `DRONE`.
- **The `placementType` field** maps to placement zone types and is used to validate placement in Phase 4.
- **Scan line CSS trick:** Use a pseudo-element with `repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)` covering the viewport.
- **Keep MainMenu simple** — no Canvas rendering yet. Pure CSS/Tailwind with the CRT overlay. Canvas comes in Phase 2.
- **Phase router pattern:** `Game.jsx` uses `useState` for the current phase and a `gameState` object via `useReducer`. Each phase component receives the state and a dispatch function. This pattern persists through all phases.

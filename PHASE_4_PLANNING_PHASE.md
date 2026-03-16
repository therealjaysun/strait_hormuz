# PHASE 4: Planning Phase — Equipment Placement & Budget Management

## Objective

Build the complete Planning Phase: the interactive screen where the player selects and places military assets onto the map within placement zones, manages their budget, and (if Attacker) selects a convoy route. This is the primary pre-simulation gameplay loop — the player's decisions here determine the entire battle outcome.

## Prerequisites

- **Phase 1** complete (data layer, game state, constants)
- **Phase 2** complete (MapCanvas, MapRenderer, AssetRenderer, ZoneRenderer, CRTEffects)
- **Phase 3** complete (game state initialization with faction, difficulty, budget)

## GDD Reference Sections

- **Section 5** — Budget System (budgets, budget HUD design)
- **Section 5.1** — Budget HUD (ASCII layout)
- **Section 6.1** — Planning Phase Overview (untimed, fog of war, sidebar + map)
- **Section 6.2** — Interaction Model (select, click, deploy, right-click remove, hover tooltip, route buttons)
- **Section 6.3** — Placement Constraints (zone capacity, mutual exclusivity, mine field drawing, aircraft patrol zones)
- **Section 6.4** — Planning Phase HUD (ASCII layout diagram)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/PlanningPhase/PlanningPhase.jsx` | Create | Main planning phase container — sidebar + map + HUD layout |
| `src/components/PlanningPhase/EquipmentPanel.jsx` | Create | Left sidebar listing available assets with stats, cost, stock |
| `src/components/PlanningPhase/PlacementZone.jsx` | Create | Logic for zone hit-testing, capacity tracking, valid placement checks |
| `src/components/PlanningPhase/BudgetHUD.jsx` | Create | Top-right budget bar and remaining points display |
| `src/components/PlanningPhase/RouteSelector.jsx` | Create | Route selection buttons (Attacker only) |
| `src/components/PlanningPhase/StatTooltip.jsx` | Create | Hover tooltip showing full asset stat block |
| `src/components/PlanningPhase/Minimap.jsx` | Create | Bottom-left minimap showing full map overview |
| `src/components/PlanningPhase/MapCanvas.jsx` | Modify | Add click/hover handlers, placement overlay rendering |
| `src/components/Game.jsx` | Modify | Wire planning phase, manage placement state |

## Detailed Requirements

### PlanningPhase.jsx — Layout Container

Implements the layout from GDD Section 6.4:
```
┌───────────────────────────────────────────────────────┐
│ [ EQUIPMENT PANEL ]          MAP AREA          [BUDGET]│
│ ┌───────────────┐  ┌────────────────────────┐         │
│ │ (sidebar)     │  │                        │  1240 / │
│ │               │  │    STRAIT OF HORMUZ    │  1800   │
│ │               │  │                        │         │
│ │               │  │   (canvas with zones   │         │
│ │               │  │    and placed assets)  │         │
│ │               │  │                        │         │
│ │               │  └────────────────────────┘         │
│ │               │  [MINIMAP]     [ROUTE BTNS]         │
│ └───────────────┘                                     │
│              [ ▶ COMMENCE OPERATION ]                  │
└───────────────────────────────────────────────────────┘
```

- Equipment panel: left sidebar, ~250px wide, scrollable
- Map: fills remaining space, uses MapCanvas from Phase 2
- Budget HUD: top-right overlay on the map
- Minimap: bottom-left below the map, ~150x90px
- Route selector: bottom of map area (Attacker only)
- Commence button: bottom center, prominent CRT-styled button

### EquipmentPanel.jsx — Asset Selection Sidebar

#### Content
- Header: `"EQUIPMENT ROSTER"`
- Category tabs/filters: group assets by category (e.g., COASTAL DEFENSE, RADAR, NAVAL, AERIAL)
- For each asset, display:
  - Name (e.g., "NOOR ASHM BATTERY")
  - Cost in budget points (e.g., "150 PTS")
  - Key stat summary (e.g., "RNG: 75NM  DMG: 120")
  - Remaining stock count (e.g., "STOCK: 3/4")
  - Visual indicator if affordable (dim if insufficient budget)

#### Interaction
- Click an asset to select it for placement (highlights it, cursor changes to indicate placement mode)
- Selected asset stays highlighted until placed or deselected (click again or press Escape)
- Assets with 0 remaining stock are dimmed and unclickable
- Assets that exceed remaining budget are dimmed and unclickable
- Hover shows full stat tooltip (via StatTooltip)

#### Styling
- Dark background matching the game theme
- Green monospace text, uppercase
- Selected item has brighter border glow in faction color
- Scrollable if content exceeds panel height
- Category headers as dividers

### Placement Interaction — Click-to-Place on Map

#### Flow
1. Player clicks an asset in EquipmentPanel → enters placement mode
2. Map highlights valid placement zones (pulsing brighter via ZoneRenderer)
3. Invalid zones dim or show a "full" indicator
4. Player clicks a valid zone → asset is placed at that zone
5. Budget deducts, stock decrements, asset icon appears on the map
6. Player exits placement mode (can select another asset or click empty space)

#### Placement State (useReducer)
```js
const placementReducer = (state, action) => {
  switch (action.type) {
    case 'PLACE_ASSET':
      // Add asset to placements array, deduct budget, decrement stock
    case 'REMOVE_ASSET':
      // Remove asset, refund budget, increment stock
    case 'SELECT_ROUTE':
      // Set selected route (Attacker only)
    case 'CLEAR_ALL':
      // Remove all placements, reset budget
  }
};

// Placement entry shape:
{
  id: 'placement_001',       // Unique placement ID
  assetId: 'noor_ashm',     // Equipment ID from data
  zoneType: 'coastal',      // Zone category
  zoneIndex: 2,             // Which slot within that zone type
  position: { x: 450, y: 120 }, // World coordinates for rendering
}
```

#### Constraints (GDD 6.3)
- Each zone has a maximum capacity (from `placementZones.js`):
  - Coastal slots: 6 total (each holds 1 asset — missile battery OR radar, not both in same slot)
  - Island bases: 4 (one per island, mixed asset types)
  - Naval staging areas: 3 zones (each can hold multiple naval assets up to zone capacity)
  - Aerial patrol zones: 2 zones (each holds 1-2 aircraft)
  - Convoy formation: 5 positions (1 escort per position)
  - Forward screen: 2 slots (escort or MCM)
  - CAP zones: 2 (aerial assets)
  - Sub patrol zones: 2 (submarines)
- Validate `placementType` on the asset matches the zone's accepted types
- Show error feedback (brief flash or message) on invalid placement attempts

#### Right-Click to Remove
- Right-clicking a placed asset on the map removes it
- Budget is refunded in full
- Stock is restored
- Show a brief "ASSET RECALLED" message

### BudgetHUD.jsx

From GDD 5.1:
```
╔═══════════════════════════╗
║  BUDGET: ▮▮▮▮▮▮▮▯▯▯      ║
║  1,240 / 1,800 REMAINING  ║
╚═══════════════════════════╝
```

- Progress bar: filled portion in faction color, unfilled in dark
- Text: remaining / total in monospace
- Updates in real-time as assets are placed/removed
- Positioned as an overlay in the top-right corner of the map area
- Glows when budget is nearly depleted (< 10% remaining)

### RouteSelector.jsx (Attacker Only)

Three route buttons below the map:
```
CONVOY ROUTE: [ ALPHA ] [ BRAVO ] [ CHARLIE ]
```

- Only visible when `playerFaction === 'ATTACKER'`
- Selected route button highlighted with bright outline
- Selecting a route updates the map to show that route prominently (solid bright line) while dimming the others
- Route descriptions shown on hover (from GDD 3.3):
  - ALPHA: "Northern passage — shorter but more exposed"
  - BRAVO: "Central passage — standard TSS outbound lane"
  - CHARLIE: "Southern passage — longer but more defensible"
- Attacker MUST select a route before "Commence Operation" is available

### StatTooltip.jsx

A floating tooltip that appears on hover over any asset (in sidebar or on map):
```
╔═══════════════════════════════╗
║  NOOR ASHM BATTERY            ║
║  ─────────────────────────── ║
║  COST:     150 PTS            ║
║  HP:       80                 ║
║  SPEED:    FIXED              ║
║  RADAR:    0 NM (REQUIRES EXT)║
║  WEAPON:   75 NM              ║
║  DAMAGE:   120                ║
║  RELOAD:   30S                ║
║  AMMO:     6                  ║
║  SIGNATURE: LOW               ║
║  CM:       NONE               ║
╚═══════════════════════════════╝
```

- All stats from the equipment data object
- Positioned near the mouse cursor (offset to avoid obscuring the hovered element)
- CRT-styled border, monospace text
- Speed shows "FIXED" for 0-speed assets, otherwise value + "KT"

### Minimap.jsx

Small overview map in the bottom-left:
- Simplified rendering of coastlines + islands (no grid, no contours)
- Shows placed asset positions as colored dots
- Shows selected route (if Attacker)
- Clicking minimap could pan the main map (stretch goal — skip if time-constrained)

### COMMENCE OPERATION Button

- Large button at the bottom center: `"▶ COMMENCE OPERATION"`
- Disabled (dimmed) until at least one asset is placed
- Disabled until route is selected (Attacker only)
- On click:
  1. Freeze placement state
  2. Trigger AI placement for the opposing side (stub/random in this phase — real AI is Phase 7)
  3. Transition to SIMULATION phase
- Optional: brief "INITIALIZING OPERATION..." animation before transition

### AI Placement Stub

For this phase, implement a simple random AI placement:
- AI randomly selects assets from its faction's equipment list
- Places them in random valid zones until budget is ~80% spent
- This stub will be replaced by the full AI in Phase 7
- Purpose: allow end-to-end testing of the planning → simulation transition

## Acceptance Criteria

1. **Layout matches GDD 6.4:** Sidebar on left, map in center, budget top-right, minimap bottom-left
2. **Equipment panel:** Shows all assets for the selected faction, grouped by category, with correct costs and stats
3. **Placement works:** Click asset in sidebar → click valid zone on map → asset icon appears on map, budget deducts
4. **Budget tracking:** Budget display updates correctly on every place/remove action; cannot overspend
5. **Stock tracking:** Stock counts decrement on placement, increment on removal; cannot exceed max stock
6. **Constraint enforcement:**
   - Cannot place asset in wrong zone type (e.g., submarine in aerial zone)
   - Cannot exceed zone capacity
   - Cannot place when budget insufficient
7. **Right-click removal:** Right-clicking placed asset removes it, refunds budget, restores stock
8. **Route selection (Attacker):** Three route buttons visible, selecting one highlights it on map
9. **Stat tooltip:** Hovering any asset (sidebar or placed) shows full stat block
10. **Commence button:** Disabled until valid state; clicking triggers AI stub and transitions to next phase
11. **Both factions playable:** The entire planning flow works correctly for both Defender and Attacker

## Implementation Notes

- **Zone hit-testing on canvas:** When the player clicks the map during placement mode, convert screen coordinates to world coordinates, then check which zone (if any) contains that point. Zones can be defined as rectangles or polygons with simple point-in-polygon checks.
- **Placement positions within zones:** When an asset is placed in a zone with multiple slots, assign it a specific position within that zone. For convoy formation, positions should be pre-defined (lead, port, starboard, rear, center). For other zones, distribute assets evenly within the zone bounds.
- **Mine Layer special case (GDD 6.3):** When placing a Mine Layer, the player should also define the mine field segment — click two points on a route to define start and end. Mines are distributed evenly along that segment. Store the mine field coordinates in the placement data. (This can be simplified to "mine layer covers the nearest route segment within its zone" if the two-click interaction is too complex for this phase.)
- **Fog of war in planning:** The Defender should NOT see convoy routes during planning (all three shown dimly or hidden). The Attacker should NOT see Defender placement zones or placed assets.
- **State shape matters:** The placement state format defined here will be consumed directly by the Simulation Engine in Phase 5. Ensure the placement entry shape is clean and contains all data the engine needs (asset stats, position, zone info).
- **Keep AI stub dead simple.** Just randomly pick assets and zones. The goal is to have *something* to fight against in Phase 6 testing, not a smart opponent.

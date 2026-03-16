# PHASE 3: Faction Selection, Difficulty, Briefing & How to Play

## Objective

Build the pre-game UI flow: faction selection screen (Defender vs Attacker), difficulty selection, faction-specific mission briefing, and the How to Play tutorial screen. When the player confirms their choices, initialize the full game state (faction, difficulty, budget, available equipment pool) and transition to the Planning Phase.

## Prerequisites

- **Phase 1** complete (Game.jsx phase router, data layer with equipment/budgets/constants, CRT CSS styles)

## GDD Reference Sections

- **Section 2.2** — Faction Selection Screen (layout, descriptions)
- **Section 2.3** — Difficulty Selection (4 tiers with AI behavior descriptions)
- **Section 2.4** — Phase Flow diagram
- **Section 4.1** — Defender Equipment (for briefing equipment summary)
- **Section 4.2** — Attacker Equipment (for briefing equipment summary)
- **Section 5** — Budget System (budget per faction per difficulty)
- **Section 3.3** — War Paths overview (for briefing strategic context)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/FactionSelect.jsx` | Create | Two-panel faction selection + difficulty picker |
| `src/components/Briefing.jsx` | Create | Faction-specific pre-mission briefing overlay |
| `src/components/HowToPlay.jsx` | Create | Tutorial/instructions screen |
| `src/components/Game.jsx` | Modify | Wire new screens into phase router, add game state initialization |

## Detailed Requirements

### FactionSelect.jsx

A full-viewport screen with two side-by-side panels for faction selection, followed by difficulty selection.

#### Layout — Faction Choice
```
╔══════════════════════════════════════════════════════╗
║              SELECT YOUR COMMAND                      ║
╠═════════════════════╦════════════════════════════════╣
║                     ║                                ║
║    ★ DEFENDER ★     ║     ★ ATTACKER ★               ║
║                     ║                                ║
║  IRANIAN COASTAL    ║  COALITION NAVAL               ║
║  COMMAND            ║  ESCORT                        ║
║                     ║                                ║
║  "Close the strait. ║  "Escort the convoy.           ║
║   Deny passage.     ║   Protect the tankers.         ║
║   Destroy the       ║   Keep the oil                 ║
║   tankers."         ║   flowing."                    ║
║                     ║                                ║
║  [ SELECT ]         ║  [ SELECT ]                    ║
╚═════════════════════╩════════════════════════════════╝
```

- Background: `#0a0a14`
- Panel divider: vertical line in `#00ff88` at 20% opacity
- Defender panel accent color: `#ff3333`
- Attacker panel accent color: `#3399ff`
- Hover effect: panel background subtly brightens, border glows in faction color
- CRT scan line overlay active

#### Layout — Difficulty Choice (shown after faction is selected)
```
╔══════════════════════════════════════════════════════╗
║          SELECT THREAT LEVEL                          ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  [ ADVISORY  ]  AI places randomly, no abilities     ║
║  [ ELEVATED  ]  AI uses basic strategy               ║
║  [ SEVERE    ]  AI optimizes placement aggressively  ║
║  [ CRITICAL  ]  AI exploits weaknesses, full ability ║
║                  rotation                             ║
║                                                      ║
║  [ ← BACK ]                                         ║
╚══════════════════════════════════════════════════════╝
```

- Four difficulty buttons stacked vertically
- Each shows the difficulty name and a one-line AI behavior summary (from GDD 2.3)
- Selected difficulty highlights with a brighter border
- Back button returns to faction choice
- On difficulty confirm → transition to Briefing

#### State Management
- `selectedFaction`: `null | 'DEFENDER' | 'ATTACKER'`
- `selectedDifficulty`: `null | 'ADVISORY' | 'ELEVATED' | 'SEVERE' | 'CRITICAL'`
- Two-step flow: first pick faction, then pick difficulty
- On confirm: dispatch to Game.jsx with `{ faction, difficulty }` → Game.jsx initializes full game state and transitions to BRIEFING phase

### Briefing.jsx

A full-screen briefing overlay styled as a military briefing document. Content varies by selected faction.

#### Common Elements
- Header: `"OPERATION HORMUZ — [FACTION] BRIEFING"`
- Subheader: `"CLASSIFICATION: TOP SECRET"`
- CRT styling throughout

#### Defender Briefing Content
```
MISSION: DENY PASSAGE
OBJECTIVE: Destroy or disable all enemy tankers before they
           reach the Gulf of Oman.

STRATEGIC CONTEXT:
The Strait of Hormuz is 21nm wide at its narrowest. You control
the Iranian coastline, four strategic islands, and coastal waters.
The enemy will attempt to escort an oil convoy through the strait.
Your mission is to prevent any tanker from reaching open water.

BUDGET: [X] POINTS (based on difficulty)
AVAILABLE ASSETS:
  COASTAL DEFENSE:
    - Noor AShM Battery (150 pts) — 75nm range, 120 dmg
    - Khalij Fars ASBM (300 pts) — 150nm range, 200 dmg
    - Ghader Cruise Missile (250 pts) — 100nm range, 160 dmg
  RADAR:
    - Coastal Surveillance Radar (100 pts) — 120nm detection
    - Mobile Radar Unit (75 pts) — 80nm detection
  NAVAL:
    - Thondar FAC (100 pts) — Fast attack, swarm tactics
    - Sina Corvette (200 pts) — Missile corvette
    - Ghadir Submarine (250 pts) — Ambush predator
    - Mine Layer (175 pts) — 12 contact mines
  AERIAL:
    - Su-22 Strike Fighter (200 pts) — Anti-ship strikes
    - Shahed-136 Drone Swarm (150 pts) — 6 loitering munitions

KEY INTEL:
  - Coastal batteries REQUIRE radar coverage to fire
  - Mines are invisible until swept or detonated
  - The enemy does not know your placements

                    [ COMMENCE PLANNING ]
```

#### Attacker Briefing Content
Similar structure but with:
- Mission: ESCORT CONVOY
- Objective: Get at least 1 tanker to the Gulf of Oman exit
- Strategic context about protecting the convoy
- Attacker equipment roster with stats
- Key intel about route selection, minesweeper importance, fog of war

#### Interaction
- Scrollable if content exceeds viewport
- Single button at bottom: `"COMMENCE PLANNING"` → transitions to PLANNING phase
- Back button to return to faction/difficulty selection

### HowToPlay.jsx

Tutorial screen accessible from the main menu. Styled as a CRT terminal readout.

#### Content Sections
1. **OVERVIEW** — Game concept in 2-3 sentences
2. **FACTIONS** — Brief description of Defender and Attacker roles
3. **PLANNING PHASE** — How to place assets, budget system, route selection
4. **SIMULATION PHASE** — What happens during auto-battle, speed controls, intervention abilities
5. **WAR SCORE** — How scoring works, letter grades
6. **CONTROLS** — Click to place, right-click to remove, hover for stats, keyboard shortcuts

#### Layout
- Scrollable single-column text with section headers
- Back button returns to main menu
- Styled in monospace with phosphor green text on dark background

### Game.jsx Modifications

Update the phase router to handle the new screens and initialize game state:

```jsx
// New game state initialization on faction + difficulty confirm:
function initializeGame(faction, difficulty) {
  const budgets = BUDGETS[difficulty];
  return {
    phase: PHASES.BRIEFING,
    playerFaction: faction,
    difficulty: difficulty,
    playerBudget: budgets[faction],
    aiBudget: budgets[faction === 'DEFENDER' ? 'ATTACKER' : 'DEFENDER'],
    playerPlacements: [],
    aiPlacements: [],
    selectedRoute: null,
    simulationResult: null,
  };
}
```

Wire up transitions:
- `MENU` → `FACTION_SELECT` (on "New Skirmish" click)
- `MENU` → `HOW_TO_PLAY` (on "How to Play" click)
- `FACTION_SELECT` → `BRIEFING` (on faction + difficulty confirmed)
- `BRIEFING` → `PLANNING` (on "Commence Planning" click)
- Back navigation from FactionSelect, Briefing, HowToPlay → previous screen

## Acceptance Criteria

1. **Main Menu → Faction Select:** Clicking "NEW SKIRMISH" shows the two-panel faction selection screen
2. **Faction panels:** Defender and Attacker panels display with correct faction colors, descriptions matching GDD 2.2
3. **Difficulty selection:** After picking a faction, four difficulty options appear with correct descriptions from GDD 2.3
4. **Briefing screen:** Shows correct faction-specific briefing with:
   - Correct budget for the selected faction + difficulty combination
   - Complete equipment roster with costs matching GDD tables
   - Faction-appropriate mission objectives
5. **How to Play:** Accessible from main menu, contains all gameplay sections, back button works
6. **Game state initialization:** After briefing confirm, `gameState` contains correct `playerFaction`, `difficulty`, `playerBudget`, and `aiBudget` values
7. **Navigation:** Back buttons work at every step (Briefing → FactionSelect → Menu)
8. **CRT styling:** All screens maintain the CRT aesthetic (scan lines, monospace text, green glow, dark background)

## Implementation Notes

- **Keep it CSS/Tailwind only** — no Canvas rendering needed for these screens. They are pure React UI components.
- **The briefing equipment list** should be generated dynamically from the data files (`defenderEquipment.js` / `attackerEquipment.js`), not hardcoded. Group by category and show name, cost, and one key stat.
- **Difficulty descriptions** should be stored in `constants.js` (or inline) — they're short strings from GDD 2.3.
- **Mobile-friendly layout:** FactionSelect should stack vertically on narrow screens (but mobile is officially unsupported, so this is low priority).
- **Transition animations (optional):** A brief fade or scan-line wipe between screens would enhance the CRT feel, but not required for this phase.
- **The `HOW_TO_PLAY` phase** is a separate phase in the router (not a modal over the menu), to keep the component tree simple.

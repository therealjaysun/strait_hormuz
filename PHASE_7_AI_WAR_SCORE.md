# PHASE 7: AI Opponent & War Score

## Objective

Build the intelligent AI opponent that places assets and uses abilities across four difficulty tiers, plus the full War Score after-action report screen with scoring formulas, letter grades, and tactical summary. After this phase, the game is fully playable end-to-end with meaningful opposition and post-battle evaluation.

## Prerequisites

- **Phase 4** complete (placement zone constraints the AI must respect)
- **Phase 5** complete (simulation engine the AI interacts with for abilities)
- **Phase 6** complete (simulation UI that visualizes AI actions)

## GDD Reference Sections

- **Section 8.1** — War Score Overview
- **Section 8.2** — Score Components (tanker status, military losses, budget utilization, ammo expenditure, effectiveness assessment)
- **Section 8.2.1** — Tanker Status table
- **Section 8.2.2** — Military Losses tables
- **Section 8.2.3** — Equipment Deployed / Budget Utilization
- **Section 8.2.4** — Ammo Expenditure
- **Section 8.2.5** — Effectiveness Assessment (Defender and Attacker formulas)
- **Section 8.2.6** — Composite Effectiveness Formula (weights: 40% oil, 25% cost efficiency, 20% exchange rate, 15% survival)
- **Section 8.2.7** — Letter Grades (S/A/B+/B/C+/C/D/F with score ranges)
- **Section 8.3** — War Score Screen Layout (ASCII art)
- **Section 8.4** — Tactical Summary (2-3 sentence generated text)
- **Section 9.1** — AI Placement Logic (4 difficulty tiers)
- **Section 9.2** — AI Route Selection (Attacker AI)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/engine/AIPlacement.js` | Create | AI asset placement logic for all 4 difficulty tiers |
| `src/engine/AIAbilities.js` | Create | AI ability usage during simulation (difficulty-scaled) |
| `src/engine/ScoringEngine.js` | Create | War Score calculation: all metrics and composite score |
| `src/components/WarScore.jsx` | Create | Full after-action report screen |
| `src/components/Game.jsx` | Modify | Wire War Score, replace AI placement stub from Phase 4 |

## Detailed Requirements

### AIPlacement.js — AI Asset Placement (GDD 9.1)

The AI placement system must respect all the same placement constraints as the player (zone types, capacity limits, budget). It produces a placements array in the same format as player placements.

```js
export function generateAIPlacement(aiFaction, difficulty, budget, availableEquipment, placementZones) {
  // Returns: { placements: [...], route: 'ALPHA'|'BRAVO'|'CHARLIE'|null }
}
```

#### ADVISORY (Easy) — GDD 9.1
- **Placement strategy:** Semi-random with slight bias toward obvious zones
- **Budget usage:** 70-80% spent (leaves 20-30% unspent)
- **Asset selection:** Random from available pool, no consideration of synergy
- **Placement logic:**
  - Pick random available asset
  - Pick random valid zone with capacity
  - Place it
  - Repeat until budget target reached
- **Specific behaviors:**
  - Defender: may fail to pair radar with missile batteries (leaving batteries unable to fire)
  - Attacker: may not bring minesweeper
  - No mine field placement optimization

#### ELEVATED (Medium) — GDD 9.1
- **Placement strategy:** Covers primary routes with basic logic
- **Budget usage:** 80-90% spent
- **Asset selection:** Weighted toward high-value assets, ensures basic coverage
- **Placement logic:**
  - Defender: places at least 1 radar station, distributes missile batteries across coastal zones, places some naval assets in staging areas
  - Attacker: always brings at least 1 DDG or CG, fills convoy formation slots first, places at least 1 aerial asset
  - Mine layers target the central route (Bravo) by default
- **Specific behaviors:**
  - Basic asset-zone matching (radar in coastal slots, aircraft in aerial zones)
  - Some coverage of likely engagement areas

#### SEVERE (Hard) — GDD 9.1
- **Placement strategy:** Optimized for maximum coverage overlap
- **Budget usage:** 95-100% spent
- **Asset selection:** Cost-efficient composition, ensures radar coverage for all missile batteries
- **Placement logic:**
  - Defender:
    - First places radar stations to maximize coverage area
    - Then places missile batteries within radar coverage zones
    - Places naval assets in staging areas that cover the most likely routes
    - Mine layers target the route with highest traffic likelihood
    - Aerial assets positioned to cover gaps
  - Attacker:
    - Brings minesweeper in forward screen
    - Balances DDG/CG for air defense with FFG for cost efficiency
    - Includes ASW assets (Seahawk or SSN) to counter submarines
    - Growler EW aircraft for radar jamming
- **Specific behaviors:**
  - Defender AI prioritizes mining Route Bravo (most common player choice)
  - Uses proactive ability usage on cooldown (see AIAbilities)

#### CRITICAL (Expert) — GDD 9.1
- **Placement strategy:** Near-optimal using threat assessment
- **Budget usage:** 100% (fully efficient, may leave only scraps)
- **Asset selection:** Adapts to player faction
- **Placement logic:**
  - Defender (when player is Attacker):
    - Overlapping radar coverage ensuring no blind spots in the strait
    - Missile batteries positioned for maximum overlapping fire zones
    - Submarines pre-positioned for ambush at likely route chokepoints
    - Mines placed on two routes (splits mine layers), not just one
    - Mixed air assets: Su-22 for strike + Shahed drones for saturation
  - Attacker (when player is Defender):
    - Always brings Growler EW + P-8 Poseidon for maximum radar disruption and surveillance
    - Minesweeper + SSN in forward screen
    - Full DDG + CG escort with advanced countermeasures
    - F/A-18E for air superiority
    - MH-60R for ASW
  - **May feint** (Attacker AI on CRITICAL): places forward screen assets suggesting one route but sends convoy through another
- **Specific behaviors:**
  - Aggressive ability timing for maximum impact (see AIAbilities)
  - Exploits weaknesses: if player has no ASW, AI deploys extra subs; if player has no minesweeper, AI deploys extra mines

### AIAbilities.js — AI Ability Usage During Simulation (GDD 9.1)

```js
export function processAIAbilities(engine, aiFaction, difficulty) {
  // Called every simulation tick
  // Decides if/when AI uses its intervention abilities
}
```

#### By Difficulty:
- **ADVISORY:** No ability usage at all
- **ELEVATED:** Uses abilities reactively — only after taking significant damage (e.g., after losing an asset, use Concentrate Fire on the attacker; after tanker takes damage, use Emergency Evasion)
- **SEVERE:** Uses abilities proactively on cooldown whenever a reasonable target exists
- **CRITICAL:** Times abilities for maximum impact:
  - Concentrate Fire: when multiple assets can target a high-value enemy
  - Scramble Reserves: when player's forward screen is engaged and distracted
  - Tomahawk Strike: targets the highest-value radar station (largest coverage)
  - Smoke Screen: when a salvo of missiles is incoming toward the convoy
  - Emergency Evasion: on the tanker with lowest HP when under fire

### AI Route Selection (Attacker AI) — GDD 9.2

When AI plays as Attacker, route selection depends on difficulty:
- **ADVISORY:** Random route
- **ELEVATED:** Avoids the route closest to the most Defender placement zones (basic avoidance)
- **SEVERE:** Analyzes Defender island placements and selects the route with least radar/weapon coverage
- **CRITICAL:** May feint — forward screen on one route, convoy through another. Selects based on full analysis of Defender positions

### ScoringEngine.js — War Score Calculation (GDD 8.2)

```js
export function calculateWarScore(simulationResult) {
  // simulationResult: {
  //   entities: [...],          // All entities at simulation end
  //   events: [...],            // All events
  //   defenderPlacements: [...],
  //   attackerPlacements: [...],
  //   defenderBudget: number,
  //   attackerBudget: number,
  //   gameTime: number,
  // }
  //
  // Returns: {
  //   tankerStatus: [...],
  //   defenderLosses: [...],
  //   attackerLosses: [...],
  //   budgetUtilization: { defender: {...}, attacker: {...} },
  //   ammoExpenditure: { defender: {...}, attacker: {...} },
  //   defenderEffectiveness: { score, grade, components },
  //   attackerEffectiveness: { score, grade, components },
  //   tacticalSummary: string,
  // }
}
```

#### 8.2.1 — Tanker Status
For each of the 5 tankers, record:
- Name (Pacific Glory, Arabian Star, Gulf Meridian, Coral Dawn, Jade Horizon)
- Status: `DESTROYED` | `ESCAPED` | `IN TRANSIT` (if time limit hit and < 75% progress)
- Cargo value ($180M for VLCC, $80M for Aframax)
- Oil barrels (2M for VLCC, 750K for Aframax)

Aggregate:
- Tankers Escaped: N / 5
- Tankers Destroyed: N / 5
- Oil Delivered: sum of escaped tanker barrels + value
- Oil Destroyed: sum of destroyed tanker barrels + value
- Passage Rate: escaped / 5 × 100%

#### 8.2.2 — Military Losses
For each faction, list every destroyed asset:
- Asset name, count destroyed, unit cost, total cost
- Sum total losses by cost

#### 8.2.3 — Budget Utilization
For each faction:
- Total budget, amount spent, amount remaining
- Utilization percentage: spent / budget × 100%

#### 8.2.4 — Ammo Expenditure
For each faction:
- Total rounds fired (sum of all fire events)
- Rounds that hit (sum of HIT events)
- Hit rate: hits / fired × 100%

#### 8.2.5 — Effectiveness Assessment (GDD 8.2.5)

**Defender Effectiveness:**
```
Oil Destruction Rate = destroyed barrels / total barrels
Cost Efficiency = destroyed barrels / budget spent
Military Exchange Rate = attacker losses (cost) / defender losses (cost)
Asset Survival Rate = surviving asset HP / total deployed HP
```

**Attacker Effectiveness:**
```
Oil Delivery Rate = delivered barrels / total barrels
Cost Efficiency = delivered barrels / budget spent
Military Exchange Rate = defender losses (cost) / attacker losses (cost)
Asset Survival Rate = surviving asset HP / total deployed HP
```

#### 8.2.6 — Composite Effectiveness Formula
```
Effectiveness = (
  0.40 × Oil Rate +
  0.25 × Normalized Cost Efficiency +
  0.20 × Normalized Exchange Rate +
  0.15 × Survival Rate
) × 100

Normalization:
  Cost Efficiency: cap at 1.0 (linear scale, higher is better, clamp)
  Exchange Rate: cap at 1.0 (log scale or linear scale with clamp)
```

Produce a score from 0-100.

#### 8.2.7 — Letter Grades
| Score | Grade |
|-------|-------|
| 90-100 | S |
| 80-89 | A |
| 70-79 | B+ |
| 60-69 | B |
| 50-59 | C+ |
| 40-49 | C |
| 30-39 | D |
| 0-29 | F |

#### 8.4 — Tactical Summary Generation
Generate a 2-3 sentence natural-language summary based on battle data:

Determine the **decisive factor** from these candidates:
- Air superiority (if most kills were air-to-surface)
- Mine warfare (if mines caused >30% of tanker damage)
- Submarine ambush (if subs destroyed any high-value targets)
- Missile saturation (if coastal batteries fired majority of shots)
- Electronic warfare (if Growler was active and reduced Defender accuracy)
- Convoy defense (if most Defender assets were destroyed before reaching weapon range)
- Swarm tactics (if FACs dealt majority of Defender damage)

Template:
```
"[Winner faction] [achieved/denied] passage through the Strait of Hormuz.
[Decisive factor description]. [Notable event or stat]."
```

Example outputs:
- "Coalition escort successfully delivered the majority of crude oil cargo despite significant Defender resistance. Attacker air superiority was the decisive factor. All Defender submarines were destroyed before firing a torpedo."
- "Iranian Coastal Command successfully closed the strait, destroying all five tankers. Mine warfare proved devastating, accounting for 60% of total tanker damage. The Coalition minesweeper was sunk early in the engagement."

### WarScore.jsx — After-Action Report Screen (GDD 8.3)

Full-screen results display styled as a military after-action report in CRT vector aesthetic.

#### Layout (GDD 8.3)
```
╔══════════════════════════════════════════════════════════════╗
║                    ★ OPERATION COMPLETE ★                    ║
║                   STRAIT OF HORMUZ — AFTER ACTION REPORT     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  TANKER CONVOY STATUS          ║  MILITARY LOSSES            ║
║  ●●●○○  3/5 PASSED             ║  DEF: 850 pts lost          ║
║  Oil Delivered: $440M           ║  ATK: 500 pts lost          ║
║  Oil Destroyed: $260M           ║  Exchange Rate: 1.70 ATK    ║
║                                 ║                             ║
║  ═══════════════════════════════════════════════════════      ║
║                                                              ║
║  DEFENDER          ║           ATTACKER                      ║
║  Grade: C+ (42)    ║           Grade: B+ (74)                ║
║                    ║                                         ║
║  Oil Denial: 37.1% ║           Oil Delivered: 63.3%          ║
║  Efficiency: 0.31  ║           Efficiency: 2.79              ║
║  Survival:  52.3%  ║           Survival:  71.8%              ║
║                                                              ║
║  ═══════════════════════════════════════════════════════      ║
║                                                              ║
║  TACTICAL SUMMARY:                                           ║
║  "[generated summary text]"                                  ║
║                                                              ║
║            [ PLAY AGAIN ]    [ MAIN MENU ]                   ║
╚══════════════════════════════════════════════════════════════╝
```

#### Sections to Render
1. **Header:** "OPERATION COMPLETE" with star decorations, "AFTER ACTION REPORT" subtitle
2. **Tanker Convoy Status:** Dot indicators + stats (passage rate, oil delivered/destroyed)
3. **Military Losses:** Summary for both sides (total cost lost, exchange rate)
4. **Effectiveness Grades:** Side-by-side display of letter grades with numeric scores and component breakdown
5. **Detailed Tables (expandable/scrollable):**
   - Individual tanker status table
   - Defender asset losses table
   - Attacker asset losses table
   - Budget utilization table
   - Ammo expenditure table
6. **Tactical Summary:** Generated text in quotes
7. **Action Buttons:** "PLAY AGAIN" (→ Faction Select) and "MAIN MENU" (→ Main Menu)

#### Styling
- CRT aesthetic throughout (monospace, uppercase, green/amber text, dark background)
- Letter grades in large text with glow:
  - S grade: gold glow (`#ffaa00`)
  - A grade: green glow (`#00ff88`)
  - B+/B: blue-green
  - C+/C: yellow (`#ffaa00`)
  - D: orange (`#ff6600`)
  - F: red (`#ff3333`)
- Player's side highlighted (brighter border/background)
- Data should animate in (typewriter effect or sequential reveal) for dramatic presentation
- Tables use monospace alignment with ASCII-style borders

### Game.jsx Modifications

- Replace the AI placement stub (from Phase 4) with the real `generateAIPlacement()` call
- After simulation ends, compute war score via `calculateWarScore()`
- Pass war score data to `WarScore.jsx`
- Wire "Play Again" → FACTION_SELECT and "Main Menu" → MENU transitions

## Acceptance Criteria

1. **AI places assets intelligently at SEVERE/CRITICAL:** Observable that the AI creates logical defensive or escort compositions (radar + missile pairings for Defender, minesweeper + escorts for Attacker)
2. **AI difficulty is distinct:**
   - ADVISORY: visibly poor placement, gaps in coverage, budget left unspent
   - ELEVATED: reasonable placement, most budget used
   - SEVERE: tight placement, overlapping coverage, full budget
   - CRITICAL: adapted composition, no exploitable gaps, full budget
3. **AI uses abilities during simulation:**
   - ADVISORY: no ability usage
   - ELEVATED: abilities used reactively after damage
   - SEVERE/CRITICAL: proactive ability usage visible in event log
4. **AI route selection (when AI is Attacker):** AI selects sensible routes, not always the same one
5. **War Score displays correctly:**
   - Tanker status matches actual simulation outcome
   - Military losses accurately reflect destroyed assets
   - Budget utilization matches spent amounts
   - Hit rates calculated correctly from events
   - Effectiveness scores computed per the formula
   - Letter grades match score ranges from GDD
6. **Tactical summary is coherent:** Generated text accurately describes what happened in the battle
7. **Navigation works:** "Play Again" starts a new faction selection, "Main Menu" returns to title
8. **Full end-to-end game:** Player can complete an entire game loop: Menu → Faction → Difficulty → Briefing → Planning → Simulation → War Score → Play Again

## Implementation Notes

- **AI placement is the hardest part of this phase.** Start with ADVISORY (random) since you already have the stub from Phase 4. Then build ELEVATED on top of it. SEVERE and CRITICAL are refinements.
- **AI placement should use the same validation** as player placement — call the same zone constraint checks. Don't let the AI cheat by placing in invalid spots.
- **Scoring normalization** needs careful thought. Cost efficiency and exchange rate can have wildly different scales. Normalize them to 0-1 range:
  - Cost efficiency: use `min(rawValue / expectedMax, 1.0)` where expectedMax is calibrated by playtesting
  - Exchange rate: use `min(rawValue, 3.0) / 3.0` (cap at 3:1 ratio)
- **Tactical summary templates.** Pre-write ~10 template sentences for different decisive factors. Select the appropriate one based on battle statistics. This is much more reliable than trying to generate truly dynamic text.
- **War Score data animation.** Consider revealing data sequentially (tanker status first, then losses, then grades) with brief delays. This creates a dramatic "results revealing" feel consistent with the military briefing aesthetic.
- **The AI feint mechanic** (CRITICAL Attacker AI) is optional — implement only if time allows. It's a nice touch but not essential for gameplay.
- **Test scoring edge cases:**
  - All tankers destroyed (100% Defender oil denial, 0% Attacker delivery)
  - All tankers escape with no losses (100% Attacker delivery, 0% Defender effectiveness)
  - No military losses on either side (exchange rate = 0/0 — handle division by zero)
  - Time limit reached with tankers at various progress percentages

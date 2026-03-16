# HORMUZ — Game Design Document & Technical Specification

**Version:** 1.0  
**Date:** March 15, 2026  
**Platform:** Browser-based (React SPA)  
**Visual Style:** DEFCON-faithful CRT vector aesthetic  
**Genre:** Asymmetric Tower Defense / Auto-Battler with Limited Real-Time Interventions

---

## 1. HIGH-LEVEL CONCEPT

**HORMUZ** is a single-player asymmetric tower defense game set in the Strait of Hormuz — the world's most critical oil chokepoint. The player chooses one of two factions:

- **DEFENDER (Iranian Coastal Command):** Close the strait. Destroy or disable oil tankers before they reach open water. Minimize own losses while maximizing economic damage.
- **ATTACKER (Coalition Naval Escort):** Escort oil tankers safely through the strait. Protect the convoy at all costs. Minimize tanker losses and keep the oil flowing.

The player places military assets along predetermined war paths during a **Planning Phase**, then hits **PLAY** to watch the skirmish simulate in real-time with **limited intervention abilities** available on cooldown. After the simulation concludes, a comprehensive **War Score** screen evaluates both sides.

---

## 2. GAME FLOW

### 2.1 Main Menu

```
[ HORMUZ ]
— DEFCON-style title with CRT scan lines —

[ NEW SKIRMISH ]
[ HOW TO PLAY ]
[ SETTINGS ]
```

### 2.2 Faction Selection Screen

Upon selecting **NEW SKIRMISH**, the player chooses a faction:

| Selection       | Description                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------- |
| **DEFENDER**    | "Close the strait. Deny passage. Destroy the tankers."                                        |
| **ATTACKER**    | "Escort the convoy. Protect the tankers. Keep the oil flowing."                               |

A briefing overlay provides the strategic context, budget, and objectives for the chosen side. The AI controls the opposing faction.

### 2.3 Difficulty Selection

| Difficulty      | AI Behavior                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------- |
| **ADVISORY**    | AI places assets semi-randomly with poor coverage; limited use of abilities                    |
| **ELEVATED**    | AI uses basic strategic placement; moderate ability usage                                      |
| **SEVERE**      | AI optimizes placement for maximum coverage/protection; aggressive ability usage               |
| **CRITICAL**    | AI uses near-optimal placement; full ability rotation; exploits weaknesses in player setup     |

### 2.4 Phase Flow

```
FACTION SELECT → BRIEFING → PLANNING PHASE → SIMULATION PHASE → WAR SCORE
```

---

## 3. THE MAP

### 3.1 Geography

The map represents a stylized top-down view of the **Strait of Hormuz**, including:

- **Iranian coastline** (north) — mountainous terrain, coastal emplacements
- **Omani coastline / Musandam Peninsula** (south) — limited terrain features
- **Strait narrows** — approximately 21 nautical miles wide at the chokepoint
- **Inbound Traffic Separation Scheme (TSS) lane** — 2-mile-wide lane (used by incoming tankers; not in play)
- **Outbound TSS lane** — 2-mile-wide lane (the active convoy route)
- **Median buffer zone** — 2-mile separation between lanes
- **Islands:** Qeshm Island, Hormuz Island, Larak Island, Hengam Island — strategic placement zones for the Defender
- **Open Persian Gulf waters** (west / entry point)
- **Gulf of Oman / open ocean** (east / exit point — the convoy's destination)

### 3.2 Visual Treatment

- Dark navy/black ocean background
- Coastlines rendered as bright vector outlines (amber/green phosphor glow)
- Depth contours shown as faint concentric vector lines
- Islands filled with subtle cross-hatch patterns
- Grid overlay with coordinate markers
- CRT scan line effect across entire viewport
- Slight screen curvature vignette
- Phosphor bloom on all bright elements

### 3.3 War Paths (Predetermined Routes)

The game features **predetermined war paths** — fixed lanes and zones where assets can be placed:

#### Convoy Routes (3 selectable by Attacker)
- **ROUTE ALPHA** — Northern passage, closer to Iranian coast (shorter but more exposed)
- **ROUTE BRAVO** — Central passage through the TSS outbound lane (standard, balanced)
- **ROUTE CHARLIE** — Southern passage, hugging Omani waters (longer but more defensible)

The Attacker selects ONE route during planning. The Defender does not know which route is selected until simulation begins (fog of war lifts progressively via radar).

#### Defender Placement Zones
- **Iranian Coastline Emplacements** (6 slots) — fixed positions along the northern shore for anti-ship missile batteries and radar stations
- **Island Forward Bases** (4 slots — one per island) — positions on Qeshm, Hormuz, Larak, Hengam for mixed assets
- **Naval Staging Areas** (3 zones) — sea zones where fast attack craft and submarines can be pre-positioned
- **Aerial Patrol Zones** (2 zones) — airspace sectors where aircraft can be assigned patrol routes

#### Attacker Placement Zones
- **Convoy Formation** (5 positions) — positions within the convoy column (lead, port flank, starboard flank, rear, center) where escort vessels are assigned
- **Forward Screen** (2 slots) — advance positions ahead of the convoy for picket ships
- **Aerial Umbrella Zones** (2 zones) — airspace sectors for CAP (Combat Air Patrol) assignment
- **Submarine Patrol Zones** (2 zones) — subsurface lanes for submarine screening

---

## 4. EQUIPMENT ROSTER

All assets have the following shared stat categories:

| Stat               | Description                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ |
| **Cost**           | Budget points required to deploy (affects War Score efficiency calculation)                 |
| **HP**             | Hit points / structural integrity                                                          |
| **Speed**          | Movement speed in knots (0 for fixed emplacements)                                         |
| **Radar Range**    | Detection radius in nautical miles                                                         |
| **Weapon Range**   | Engagement radius in nautical miles                                                        |
| **Damage**         | Damage per hit                                                                             |
| **Reload Time**    | Seconds between volleys/shots                                                              |
| **Ammo**           | Total ammunition count (∞ for unlimited, e.g. CIWS)                                       |
| **Signature**      | Detectability rating (LOW / MED / HIGH) — affects how early the enemy detects the asset    |
| **Countermeasures** | Defensive systems rating (NONE / BASIC / ADVANCED) — chance to defeat incoming attacks    |

---

### 4.1 DEFENDER EQUIPMENT (Iranian Coastal Command)

#### 4.1.1 Coastal Missile Batteries (Fixed Emplacements)

| Asset                           | Cost | HP  | Speed | Radar | Wpn Range | Dmg | Reload | Ammo | Signature | CM      |
| ------------------------------- | ---- | --- | ----- | ----- | --------- | --- | ------ | ---- | --------- | ------- |
| **Noor AShM Battery**           | 150  | 80  | 0     | 0 nm  | 75 nm     | 120 | 30s    | 6    | LOW       | NONE    |
| **Khalij Fars ASBM Launcher**   | 300  | 100 | 0     | 0 nm  | 150 nm    | 200 | 45s    | 4    | MED       | NONE    |
| **Ghader Cruise Missile Silo**  | 250  | 120 | 0     | 0 nm  | 100 nm    | 160 | 40s    | 4    | LOW       | NONE    |

> **Notes:** Coastal batteries require radar coverage from a separate radar station or naval asset to acquire targets. Without radar lock, they cannot fire. High damage, slow reload, limited ammo — placement and radar pairing is critical.

#### 4.1.2 Radar & Surveillance Stations (Fixed Emplacements)

| Asset                           | Cost | HP  | Speed | Radar   | Wpn Range | Dmg | Reload | Ammo | Signature | CM      |
| ------------------------------- | ---- | --- | ----- | ------- | --------- | --- | ------ | ---- | --------- | ------- |
| **Coastal Surveillance Radar**  | 100  | 40  | 0     | 120 nm  | 0         | 0   | —      | —    | HIGH      | NONE    |
| **Mobile Radar Unit**           | 75   | 30  | 0     | 80 nm   | 0         | 0   | —      | —    | MED       | NONE    |

> **Notes:** Radar stations are force multipliers — they provide targeting data to all friendly assets within their coverage zone. Destroying enemy radar should be an Attacker priority. The Mobile Radar Unit can be placed on islands, adding flexibility.

#### 4.1.3 Naval Assets (Mobile — Sea Zones)

| Asset                           | Cost | HP  | Speed | Radar  | Wpn Range | Dmg | Reload | Ammo | Signature | CM      |
| ------------------------------- | ---- | --- | ----- | ------ | --------- | --- | ------ | ---- | --------- | ------- |
| **Thondar Fast Attack Craft**   | 100  | 30  | 45 kt | 15 nm  | 8 nm      | 60  | 10s    | 8    | LOW       | BASIC   |
| **Sina Missile Corvette**       | 200  | 60  | 28 kt | 30 nm  | 40 nm     | 100 | 25s    | 6    | MED       | BASIC   |
| **Ghadir Midget Submarine**     | 250  | 50  | 11 kt | 5 nm   | 6 nm      | 180 | 60s    | 4    | LOW       | NONE    |
| **Mine Layer (+ 12 sea mines)** | 175  | 25  | 15 kt | 10 nm  | —         | —   | —      | 12   | LOW       | NONE    |

> **Notes:**
> - **Fast Attack Craft** are cheap swarm units — low HP, high speed, low signature. Best deployed in groups to overwhelm escort defenses with volume of fire.
> - **Ghadir Subs** are ambush predators — nearly undetectable until they fire. Devastating single-target damage, but extremely slow reload and limited torpedoes.
> - **Mine Layer** deploys naval mines along a selected route segment during the planning phase. Mines are invisible to the Attacker until detonation or minesweeper detection. Each mine deals 150 damage on contact.

#### 4.1.4 Sea Mines (Deployed by Mine Layer)

| Asset             | Cost          | HP  | Dmg | Signature | Detection  |
| ----------------- | ------------- | --- | --- | --------- | ---------- |
| **Contact Mine**  | (incl. layer) | 1   | 150 | LOW       | Minesweeper sonar or direct contact |

> Mines persist on the map. They are invisible to the Attacker unless swept. Detonation on contact with any vessel (including Defender assets if poorly placed). Maximum 12 per mine layer.

#### 4.1.5 Aerial Assets (Patrol Zones)

| Asset                          | Cost | HP  | Speed  | Radar  | Wpn Range | Dmg | Reload | Ammo | Signature | CM       |
| ------------------------------ | ---- | --- | ------ | ------ | --------- | --- | ------ | ---- | --------- | -------- |
| **Su-22 Strike Fighter**       | 200  | 40  | 600 kt | 25 nm  | 30 nm     | 140 | 35s    | 4    | HIGH      | BASIC    |
| **Shahed-136 Drone Swarm (x6)**| 150  | 10ea| 100 kt | 0 nm   | 0 (kamikaze) | 80ea | — | 6    | LOW       | NONE     |

> **Notes:**
> - **Su-22** carries anti-ship missiles. High signature means it will be detected and engaged by Attacker air defense early. Best used in coordinated strikes with other assets to saturate defenses.
> - **Shahed-136 Swarm** deploys 6 loitering munitions that fly toward the nearest detected target. Each drone has low HP (easily shot down by CIWS/SAMs) but their volume can overwhelm point defense. Requires radar coverage for initial target acquisition, after which they home autonomously.

---

### 4.2 ATTACKER EQUIPMENT (Coalition Naval Escort)

#### 4.2.1 Escort Warships (Convoy Formation & Forward Screen)

| Asset                              | Cost | HP  | Speed  | Radar   | Wpn Range | Dmg | Reload | Ammo | Signature | CM        |
| ---------------------------------- | ---- | --- | ------ | ------- | --------- | --- | ------ | ---- | --------- | --------- |
| **Arleigh Burke Destroyer (DDG)**  | 400  | 200 | 30 kt  | 150 nm  | 80 nm     | 140 | 20s    | 96   | HIGH      | ADVANCED  |
| **Ticonderoga Cruiser (CG)**       | 500  | 250 | 30 kt  | 180 nm  | 100 nm    | 160 | 18s    | 122  | HIGH      | ADVANCED  |
| **Oliver H. Perry Frigate (FFG)**  | 250  | 120 | 29 kt  | 90 nm   | 40 nm     | 80  | 15s    | 40   | MED       | BASIC     |
| **Cyclone Patrol Craft (PC)**      | 100  | 40  | 35 kt  | 20 nm   | 5 nm      | 40  | 8s     | ∞    | LOW       | NONE      |

> **Notes:**
> - **Arleigh Burke DDG** is the workhorse — excellent radar, strong weapons, ADVANCED countermeasures (Aegis-class). Expensive but highly survivable.
> - **Ticonderoga CG** is the premium option — best radar and firepower in the game. Acts as fleet air defense coordinator. Extreme cost.
> - **Perry FFG** is the budget escort — decent all-around but lacks the staying power of the DDG. Good for filling out formation slots.
> - **Cyclone PC** is a cheap picket — minimal combat power but good for forward screening and early warning. Expendable.

#### 4.2.2 Minesweeper

| Asset                         | Cost | HP  | Speed  | Radar  | Wpn Range | Dmg | Reload | Ammo | Signature | CM      |
| ----------------------------- | ---- | --- | ------ | ------ | --------- | --- | ------ | ---- | --------- | ------- |
| **Avenger MCM (Minesweeper)** | 150  | 60  | 14 kt  | 30 nm  | 2 nm      | 20  | 5s     | ∞    | MED       | NONE    |

> **Notes:** The Avenger has a **mine detection sonar** with a 3 nm sweep radius. It reveals and safely detonates mines ahead of the convoy. Placing one in the Forward Screen is strongly recommended if mines are suspected. Slow speed — if it falls behind, the convoy is exposed.

#### 4.2.3 Submarine Escort

| Asset                             | Cost | HP  | Speed  | Radar  | Wpn Range | Dmg | Reload | Ammo | Signature | CM      |
| --------------------------------- | ---- | --- | ------ | ------ | --------- | --- | ------ | ---- | --------- | ------- |
| **Los Angeles SSN (Attack Sub)**  | 350  | 150 | 25 kt  | 40 nm  | 30 nm     | 180 | 45s    | 12   | LOW       | BASIC   |

> **Notes:** Subsurface escort. Excellent for hunting Ghadir subs and threatening Defender surface assets. LOW signature makes it hard to detect. Can be placed in Submarine Patrol Zones flanking the convoy route.

#### 4.2.4 Aerial Assets (CAP Zones)

| Asset                             | Cost | HP  | Speed  | Radar   | Wpn Range | Dmg | Reload | Ammo | Signature | CM        |
| --------------------------------- | ---- | --- | ------ | ------- | --------- | --- | ------ | ---- | --------- | --------- |
| **F/A-18E Super Hornet CAP**      | 300  | 60  | 1000kt | 80 nm   | 50 nm     | 120 | 12s    | 8    | MED       | ADVANCED  |
| **MH-60R Seahawk Helo (ASW)**     | 150  | 30  | 150 kt | 40 nm   | 10 nm     | 100 | 20s    | 6    | MED       | BASIC     |
| **P-8 Poseidon (Maritime Patrol)**| 250  | 50  | 450 kt | 200 nm  | 60 nm     | 90  | 30s    | 8    | HIGH      | BASIC     |

> **Notes:**
> - **F/A-18E** provides air superiority and anti-surface strike. Best counter to Su-22s and can engage Defender surface assets.
> - **MH-60R** is the primary ASW (anti-submarine warfare) platform. Essential for detecting and destroying Ghadir subs. Dipping sonar reveals submarines within 8 nm.
> - **P-8 Poseidon** is a long-range maritime patrol aircraft with the best radar in the Attacker's arsenal. Provides wide-area surveillance and can drop torpedoes on submarines. High signature makes it vulnerable if Defender has air assets.

#### 4.2.5 Electronic Warfare

| Asset                             | Cost | HP  | Speed  | Radar  | Effect                                    | Signature | CM      |
| --------------------------------- | ---- | --- | ------ | ------ | ----------------------------------------- | --------- | ------- |
| **EA-18G Growler (EW Aircraft)**  | 350  | 50  | 900 kt | 60 nm  | Jams enemy radar in 40nm radius (−50% accuracy) | MED  | ADVANCED |

> **Notes:** The Growler doesn't deal damage directly. Instead, it degrades Defender radar effectiveness within its jamming radius, causing coastal missile batteries and SAMs to miss more often. Extremely high-value target — the Defender AI will prioritize shooting it down.

---

### 4.3 TANKER CONVOY (AI-Controlled, Non-Placeable)

The tanker convoy is controlled by the game AI and follows the selected route. The player does NOT place tankers — they are the objective.

| Asset                 | Count | HP  | Speed  | Signature | Value (Oil Cargo) |
| --------------------- | ----- | --- | ------ | --------- | ----------------- |
| **VLCC Supertanker**  | 3     | 300 | 15 kt  | HIGH      | $180M per tanker  |
| **Aframax Tanker**    | 2     | 200 | 16 kt  | HIGH      | $80M per tanker   |

> **Total convoy value:** $700M in crude oil cargo  
> **Convoy speed:** Limited to the slowest vessel (15 kt)  
> **Behavior:** Tankers follow the designated route in single file. If a tanker is destroyed, the convoy continues. Tankers have NO weapons or countermeasures — they rely entirely on the escort.

---

## 5. BUDGET SYSTEM

Each faction receives a **budget** of points to spend on assets during the Planning Phase. Budget varies by difficulty:

| Difficulty   | Defender Budget | Attacker Budget |
| ------------ | --------------- | --------------- |
| ADVISORY     | 1500            | 2000            |
| ELEVATED     | 1800            | 1800            |
| SEVERE       | 2000            | 1600            |
| CRITICAL     | 2200            | 1400            |

> Budget asymmetry reflects the inherent advantage/disadvantage of each difficulty level. At CRITICAL, the Defender has overwhelming force; the Attacker must be surgically efficient.

### 5.1 Budget HUD

Displayed in the top-right corner during the Planning Phase:

```
╔═══════════════════════════╗
║  BUDGET: ▮▮▮▮▮▮▮▯▯▯      ║
║  1,240 / 1,800 REMAINING  ║
╚═══════════════════════════╝
```

---

## 6. PLANNING PHASE

### 6.1 Overview

Duration: Untimed (player takes as long as needed).

The player sees the full map with:
- All available **placement zones** highlighted with pulsing vector outlines
- A **sidebar equipment panel** listing all available assets with stats, cost, and remaining stock
- **Fog of war** obscuring the opponent's side (Attacker cannot see Defender placements; Defender cannot see which route the Attacker has selected)
- A **minimap** in the bottom-left corner

### 6.2 Interaction Model

1. **Select asset** from the sidebar equipment panel (click or drag)
2. **Click a valid placement zone** to deploy the asset
3. Deployed assets appear as vector icons on the map with a subtle glow
4. **Right-click** a deployed asset to remove it (refunds full cost)
5. **Hover** over any asset (own or sidebar) to see a stat tooltip
6. **Route selection** (Attacker only): Click one of three route buttons (ALPHA / BRAVO / CHARLIE) to set the convoy path — shown as a highlighted vector line on the map

### 6.3 Placement Constraints

- Each placement zone has a **maximum capacity** (shown on hover)
- Some assets are mutually exclusive in certain zones (e.g., cannot place both a radar station and a missile battery in the same coastal slot)
- Mine Layer placement also requires the player to draw a **mine field area** on the route by clicking two points to define a segment — mines are distributed evenly along that segment
- Aircraft are assigned to patrol zones by dragging them into the zone — they will automatically orbit within that zone during simulation

### 6.4 Planning Phase HUD

```
┌─────────────────────────────────────────────────────────┐
│ [ EQUIPMENT PANEL ]          MAP AREA           [BUDGET]│
│ ┌───────────────┐  ┌────────────────────────┐          │
│ │ Noor AShM     │  │                        │  1240 /  │
│ │ Cost: 150     │  │    STRAIT OF HORMUZ    │  1800    │
│ │ Stock: 4      │  │                        │          │
│ │ ───────────── │  │   [placement zones     │          │
│ │ Khalij Fars   │  │    highlighted]         │          │
│ │ Cost: 300     │  │                        │          │
│ │ Stock: 2      │  │                        │          │
│ │ ───────────── │  └────────────────────────┘          │
│ │ ...           │  [MINIMAP]                           │
│ └───────────────┘                                       │
│              [ ▶ COMMENCE OPERATION ]                    │
└─────────────────────────────────────────────────────────┘
```

When ready, the player clicks **COMMENCE OPERATION** to begin the simulation.

---

## 7. SIMULATION PHASE

### 7.1 Overview

The simulation plays out in **accelerated real-time** (default 4x speed, adjustable: 1x / 2x / 4x / 8x). The player watches the engagement unfold with limited intervention ability.

### 7.2 Simulation Mechanics

#### 7.2.1 Convoy Movement
- Tankers spawn at the west edge (Persian Gulf) and proceed along the selected route toward the east edge (Gulf of Oman)
- Convoy speed: 15 knots (slowest vessel)
- Estimated transit time at 1x: ~90 minutes game-time through the strait narrows (compressed to ~22 minutes at 4x)

#### 7.2.2 Detection & Fog of War
- At simulation start, each side only sees assets within their own **radar coverage**
- As radar detects enemy assets, they appear on the map as **blinking vector contacts** with classification labels (SURFACE / SUBSURFACE / AIR / UNKNOWN)
- LOW signature assets take longer to detect and may not appear until within close range
- Submarines are only detectable by ASW assets (Seahawk dipping sonar, P-8 sonobuoys, Los Angeles passive sonar)
- Mines are invisible until swept by a minesweeper or detonated

#### 7.2.3 Combat Resolution
- Assets automatically engage detected enemies within weapon range, prioritizing by threat level:
  1. Incoming missiles/drones (point defense)
  2. Nearest enemy combatant
  3. Highest-value target in range
- **Damage calculation:** `Base Damage × (1 - Countermeasure Mitigation) × Hit Probability`
  - Countermeasure mitigation: NONE = 0%, BASIC = 20%, ADVANCED = 40%
  - Hit probability: Base 80%, modified by EW jamming (−30%), target speed (fast movers −10%), weather (if implemented)
- Assets with 0 HP are **destroyed** — shown as a brief explosion animation, then a fading wreck icon
- Ammo depletion: When ammo reaches 0, the asset can no longer fire. It remains on the map but is combat-ineffective. Displayed as a dimmed icon with "WINCHESTER" label.

#### 7.2.4 Mine Detonation
- When any vessel enters a mine's trigger radius (0.2 nm), the mine detonates
- Damage: 150 HP per mine
- Mines do not discriminate — Defender fast attack craft can trigger their own mines if they enter the field
- Minesweeper sonar reveals mines at 3 nm range, rendering them as visible vector dots. Revealed mines are then safely detonated at a rate of 1 per 15 seconds.

#### 7.2.5 Simulation End Conditions
- **Attacker victory:** At least 1 tanker reaches the east map edge (Gulf of Oman)
- **Defender victory:** All 5 tankers are destroyed before reaching the exit
- **Time limit:** If the convoy has not fully transited or been destroyed within the time window, the simulation ends and scoring is based on current state (surviving tankers count as "escaped" if past the 75% mark)

### 7.3 Limited Interventions (Player Abilities)

During simulation, the player has access to **3 intervention abilities** (available to both factions, but with different effects). Each ability has a **cooldown** after use.

#### 7.3.1 Defender Interventions

| Ability                     | Cooldown | Effect                                                                                      |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| **Concentrate Fire**        | 60s      | All assets in a selected 10nm radius focus fire on a single designated target for 15 seconds |
| **Scramble Reserves**       | 120s     | Deploys 2 additional Thondar Fast Attack Craft from a random Defender naval staging area     |
| **Activate Decoys**         | 90s      | Spawns 3 radar decoy signatures near a selected area, confusing Attacker targeting for 20s   |

#### 7.3.2 Attacker Interventions

| Ability                     | Cooldown | Effect                                                                                      |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| **Emergency Evasion**       | 60s      | Selected tanker performs emergency turn — temporarily deviates from route, gaining +50% countermeasure rating for 15s |
| **Tomahawk Strike**         | 120s     | Launches a precision strike on a visible fixed emplacement (radar or missile battery). Deals 200 damage. One use only. |
| **Smoke Screen**            | 90s      | Deploys smoke screen along a 5nm segment of the convoy route — all assets in the zone gain LOW signature for 20s       |

### 7.4 Simulation HUD

```
┌──────────────────────────────────────────────────────────────┐
│ TIME: 00:14:32    SPEED: [1x] [2x] [■4x] [8x]    TANKERS: ●●●●○ │
│                                                                   │
│            [ LIVE MAP — contacts moving, effects animating ]       │
│                                                                   │
│ ┌──────────────┐                                                  │
│ │ EVENT LOG    │     [MINIMAP]                                    │
│ │ 14:30 MINE   │                                                  │
│ │  DETONATION  │     ABILITIES:                                   │
│ │ 14:28 CONTACT│     [CONCENTRATE FIRE ██░░ 34s]                  │
│ │  LOST: DDG-3 │     [SCRAMBLE RESERVES ■■■■ READY]               │
│ │ 14:25 SPLASH │     [ACTIVATE DECOYS ██░░ 52s]                   │
│ │  — SU-22 DOWN│                                                  │
│ └──────────────┘                                                  │
└──────────────────────────────────────────────────────────────┘
```

#### 7.4.1 Event Log
A scrolling text log in the bottom-left showing all significant events in chronological order with DEFCON-style terse military language:

```
[14:32:07] MINE DETONATION — GRID 26.42N 56.18E — VLCC PACIFIC GLORY STRUCK — DMG 150
[14:31:45] SPLASH — THONDAR FAC-2 DESTROYED BY DDG-52 SM-2
[14:30:12] NEW CONTACT — SUBSURFACE — BEARING 045 — CLASSIFIED GHADIR
[14:29:58] WINCHESTER — FFG-7 HARPOON MAGAZINE DEPLETED
```

---

## 8. WAR SCORE (Post-Simulation Results)

### 8.1 Overview

After the simulation ends, the game transitions to a full-screen **WAR SCORE** analysis. This screen is designed to feel like a military after-action report rendered in DEFCON-style vector graphics.

### 8.2 Score Components

#### 8.2.1 Tanker Status

| Tanker               | Status       | Cargo Value | Oil Result              |
| -------------------- | ------------ | ----------- | ----------------------- |
| VLCC Pacific Glory   | DESTROYED    | $180M       | 2M barrels lost         |
| VLCC Arabian Star    | ESCAPED      | $180M       | 2M barrels delivered    |
| VLCC Gulf Meridian   | ESCAPED      | $180M       | 2M barrels delivered    |
| Aframax Coral Dawn   | DESTROYED    | $80M        | 750K barrels lost       |
| Aframax Jade Horizon | ESCAPED      | $80M        | 750K barrels delivered  |

**Tanker Score:**
- Tankers Escaped: 3 / 5
- Tankers Destroyed: 2 / 5
- Oil Delivered: 4.75M barrels ($440M)
- Oil Destroyed: 2.75M barrels ($260M)
- **Passage Rate: 60%**

#### 8.2.2 Military Losses

**Defender Losses:**

| Asset Destroyed          | Count | Unit Cost | Total Cost |
| ------------------------ | ----- | --------- | ---------- |
| Thondar FAC              | 3     | 100       | 300        |
| Su-22 Strike Fighter     | 1     | 200       | 200        |
| Coastal Surveillance Radar| 1    | 100       | 100        |
| Ghadir Submarine         | 1     | 250       | 250        |
| **TOTAL DEFENDER LOSSES**|       |           | **850**    |

**Attacker Losses:**

| Asset Destroyed          | Count | Unit Cost | Total Cost |
| ------------------------ | ----- | --------- | ---------- |
| Oliver H. Perry FFG      | 1     | 250       | 250        |
| Cyclone PC               | 1     | 100       | 100        |
| MH-60R Seahawk           | 1     | 150       | 150        |
| **TOTAL ATTACKER LOSSES**|       |           | **500**    |

#### 8.2.3 Equipment Deployed (Budget Utilization)

| Faction    | Budget | Spent | Remaining | Utilization |
| ---------- | ------ | ----- | --------- | ----------- |
| Defender   | 1800   | 1650  | 150       | 91.7%       |
| Attacker   | 1800   | 1700  | 100       | 94.4%       |

#### 8.2.4 Ammo Expenditure

| Faction    | Total Rounds Fired | Rounds Hit | Hit Rate |
| ---------- | ------------------ | ---------- | -------- |
| Defender   | 47                 | 18         | 38.3%    |
| Attacker   | 112                | 34         | 30.4%    |

#### 8.2.5 Effectiveness Assessment

The game computes a composite **Effectiveness Score** for each side:

**Defender Effectiveness:**
```
Oil Destruction Rate:     37.1%  (2.75M / 7.5M total barrels)
Cost Efficiency:          0.31   (barrels destroyed per budget point spent)
Military Exchange Rate:   0.59   (enemy losses / own losses by cost)
Asset Survival Rate:      52.3%  (surviving assets HP / total deployed HP)
────────────────────────────────────
DEFENDER EFFECTIVENESS:   C+  (42 / 100)
```

**Attacker Effectiveness:**
```
Oil Delivery Rate:        63.3%  (4.75M / 7.5M total barrels)
Cost Efficiency:          2.79   (barrels delivered per budget point spent)
Military Exchange Rate:   1.70   (enemy losses / own losses by cost)
Asset Survival Rate:      71.8%  (surviving assets HP / total deployed HP)
────────────────────────────────────
ATTACKER EFFECTIVENESS:   B+  (74 / 100)
```

#### 8.2.6 Composite Effectiveness Formula

```
Effectiveness = (
    Oil_Objective_Weight × Oil_Rate +
    Cost_Efficiency_Weight × Normalized_Cost_Efficiency +
    Exchange_Rate_Weight × Normalized_Exchange_Rate +
    Survival_Weight × Survival_Rate
)

Weights:
  Oil Objective:    40%  (primary objective)
  Cost Efficiency:  25%  (how economically you achieved it)
  Exchange Rate:    20%  (military dominance)
  Survival:         15%  (force preservation)
```

#### 8.2.7 Letter Grades

| Score Range | Grade |
| ----------- | ----- |
| 90–100      | S     |
| 80–89       | A     |
| 70–79       | B+    |
| 60–69       | B     |
| 50–59       | C+    |
| 40–49       | C     |
| 30–39       | D     |
| 0–29        | F     |

### 8.3 War Score Screen Layout

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
║  "Coalition escort successfully delivered the majority of    ║
║   crude oil cargo despite significant Defender resistance.   ║
║   Defender mine warfare proved effective but insufficient    ║
║   to halt the convoy. Attacker air superiority was the       ║
║   decisive factor."                                          ║
║                                                              ║
║            [ PLAY AGAIN ]    [ MAIN MENU ]                   ║
╚══════════════════════════════════════════════════════════════╝
```

### 8.4 Tactical Summary

The game generates a brief 2–3 sentence natural-language summary of the battle, highlighting:
- The decisive factor (what swung the outcome)
- Any notable events (e.g., "All Defender submarines were destroyed before firing a torpedo")
- The overall strategic assessment

---

## 9. AI OPPONENT BEHAVIOR

### 9.1 AI Placement Logic

The AI opponent places assets during the Planning Phase using difficulty-scaled heuristics:

#### ADVISORY (Easy)
- Random placement with slight bias toward obvious zones
- Leaves 20–30% of budget unspent
- No ability usage during simulation

#### ELEVATED (Medium)
- Places assets to cover primary routes
- Spends 80–90% of budget
- Uses abilities reactively (after taking damage)

#### SEVERE (Hard)
- Optimizes placement for maximum coverage overlap
- Spends 95–100% of budget
- Uses abilities proactively on cooldown
- Defender AI prioritizes mining the most likely route; Attacker AI places minesweepers

#### CRITICAL (Expert)
- Near-optimal placement using threat assessment of the player's likely strategy
- Full budget utilization with efficient asset composition
- Aggressive ability usage; times interventions to maximize impact
- Adapts to player faction (e.g., if player is Defender, AI Attacker will always bring minesweepers and Growler EW)

### 9.2 AI Route Selection (Attacker AI)

When the AI plays as Attacker, it selects a route based on:
- ADVISORY: Random
- ELEVATED: Avoids the route closest to the most Defender placement zones
- SEVERE: Analyzes Defender island placements and selects the route with least coverage
- CRITICAL: May feint by placing forward screen on one route while routing the convoy through another

---

## 10. VISUAL & AUDIO DESIGN

### 10.1 DEFCON CRT Aesthetic

The game's visual identity is a faithful recreation of the DEFCON (2006, Introversion Software) aesthetic:

#### Color Palette
| Element                    | Color                         |
| -------------------------- | ----------------------------- |
| Background (ocean)         | `#0a0a14` (near-black blue)   |
| Coastline vectors          | `#00ff88` (phosphor green)    |
| Grid lines                 | `#112211` (very dim green)    |
| Defender assets            | `#ff3333` (hostile red)       |
| Attacker assets            | `#3399ff` (friendly blue)     |
| Tankers                    | `#ffaa00` (amber/gold)        |
| Radar sweeps               | `#00ff8844` (green, 25% opacity, sweeping arc) |
| Explosions                 | `#ff6600` → `#ff0000` (orange to red bloom)    |
| Text / HUD                 | `#00ff88` (phosphor green)    |
| Warnings / alerts          | `#ff3333` (red, flashing)     |
| Mines (when revealed)      | `#ffff00` (yellow dots)       |
| Smoke/EW effects           | `#88888844` (translucent gray)|

#### Visual Effects
- **CRT scan lines:** Horizontal lines at 2px intervals, 5% opacity overlay across entire viewport
- **Phosphor bloom:** CSS glow/blur on all bright elements (text-shadow / filter: blur + brightness)
- **Screen curvature:** Subtle radial vignette darkening at edges
- **Radar sweep:** Rotating arc animation on all radar-equipped assets, sweep interval proportional to radar range
- **Missile trails:** Thin vector lines with fading tail from launcher to target
- **Explosions:** Expanding circle with radial lines, bloom flash, then fade — all vector, no raster
- **Contact blips:** Small pulsing dots for detected enemies, with concentric rings on new detection
- **Mine detonation:** Large expanding circle with jagged edges (underwater explosion)
- **Smoke screen:** Animated translucent overlay with drifting noise pattern
- **Wreck icons:** Dimmed, static version of the destroyed asset's icon with an "X" overlay

#### Typography
- **Primary font:** `"Courier New", monospace` (or similar CRT-appropriate monospace)
- **All text uppercase**
- **Character spacing:** Slightly expanded for readability
- **Text rendering:** Slight green/amber glow matching the phosphor palette

### 10.2 Audio Design (Stretch Goal)

If audio is implemented, the following guidelines apply:

| Sound Event              | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| Ambient                  | Low, continuous sonar ping + ocean static                      |
| Asset placement          | Soft mechanical "click" with brief CRT static burst            |
| Simulation start         | Alarm klaxon (2 tones) + "ALL STATIONS — COMMENCE OPERATION"  |
| Missile launch           | Sharp electronic "whoosh" with brief static                    |
| Explosion                | Deep, muffled "thud" with reverb (underwater feel)             |
| Mine detonation          | Louder thud with metallic resonance                            |
| Contact detected         | Sonar ping (single tone)                                      |
| Asset destroyed          | Brief static burst + flatline tone                             |
| Ability activated        | Electronic chirp + brief radio chatter static                  |
| WINCHESTER (ammo out)    | Warning tone (descending)                                      |
| Simulation end           | Long sonar ping → silence → results klaxon                    |

---

## 11. TECHNICAL SPECIFICATION

### 11.1 Platform & Stack

| Component          | Technology                                      |
| ------------------ | ----------------------------------------------- |
| Runtime            | Browser (Chrome, Firefox, Safari, Edge)         |
| Framework          | React 18+ (functional components, hooks)        |
| Rendering          | HTML5 Canvas (primary) + SVG overlays (HUD)     |
| State Management   | React useState/useReducer + useRef for sim state|
| Animation Loop     | requestAnimationFrame (game loop)               |
| Styling            | Tailwind CSS (HUD) + Canvas API (map/sim)       |
| Audio (stretch)    | Web Audio API                                   |
| Storage            | In-memory only (no localStorage per constraints)|

### 11.2 Architecture

```
src/
├── components/
│   ├── Game.jsx                 # Root game component, phase router
│   ├── MainMenu.jsx             # Title screen
│   ├── FactionSelect.jsx        # Faction + difficulty selection
│   ├── Briefing.jsx             # Pre-mission briefing overlay
│   ├── PlanningPhase.jsx        # Asset placement UI
│   │   ├── EquipmentPanel.jsx   # Sidebar with asset list
│   │   ├── MapCanvas.jsx        # Canvas-rendered map (shared)
│   │   └── PlacementZone.jsx    # Interactive zone highlights
│   ├── SimulationPhase.jsx      # Real-time simulation viewer
│   │   ├── SimCanvas.jsx        # Canvas animation loop
│   │   ├── EventLog.jsx         # Scrolling event log
│   │   ├── AbilityBar.jsx       # Intervention ability buttons
│   │   └── SimHUD.jsx           # Speed controls, tanker status
│   ├── WarScore.jsx             # After-action report screen
│   └── HowToPlay.jsx           # Tutorial/instructions overlay
├── engine/
│   ├── SimulationEngine.js      # Core simulation tick logic
│   ├── CombatResolver.js        # Damage, hit probability, CM
│   ├── DetectionSystem.js       # Radar, sonar, fog of war
│   ├── PathfindingSystem.js     # Convoy route movement
│   ├── AIPlacement.js           # AI opponent placement logic
│   ├── AIAbilities.js           # AI ability usage during sim
│   ├── MineSystem.js            # Mine placement, detection, detonation
│   └── ScoringEngine.js         # War Score calculation
├── data/
│   ├── defenderEquipment.js     # Defender asset definitions
│   ├── attackerEquipment.js     # Attacker asset definitions
│   ├── mapData.js               # Coastline vectors, zones, routes
│   ├── placementZones.js        # Zone definitions and constraints
│   └── constants.js             # Game balance constants
├── rendering/
│   ├── MapRenderer.js           # Canvas coastline, grid, terrain
│   ├── AssetRenderer.js         # Asset icons and animations
│   ├── EffectsRenderer.js       # Explosions, trails, smoke, radar
│   ├── CRTEffects.js            # Scan lines, bloom, vignette
│   └── HUDRenderer.js           # Canvas-based HUD elements
└── utils/
    ├── geometry.js              # Distance, intersection, arc math
    ├── random.js                # Seeded RNG for deterministic sims
    └── formatters.js            # Number/currency/time formatting
```

### 11.3 Game Loop

```
PLANNING PHASE:
  - React event handlers for drag/drop/click placement
  - State updates on each placement action
  - No game loop running

SIMULATION PHASE:
  - requestAnimationFrame loop at 60 FPS
  - Simulation tick rate: 10 ticks/second (decoupled from render)
  - Each tick:
    1. Update convoy position along route
    2. Run detection system (radar/sonar checks)
    3. Run AI targeting (asset target acquisition)
    4. Run combat resolution (fire, hit checks, damage)
    5. Run mine checks (proximity detonation)
    6. Check ability cooldowns
    7. Process AI ability decisions
    8. Check end conditions
    9. Emit events to event log
  - Each frame:
    1. Interpolate positions between ticks
    2. Render map layer (static, cached)
    3. Render asset layer (dynamic positions)
    4. Render effects layer (missiles, explosions, radar)
    5. Render CRT overlay (scan lines, bloom)
    6. Render HUD overlay
```

### 11.4 Performance Targets

| Metric              | Target                |
| ------------------- | --------------------- |
| Frame rate          | 60 FPS (canvas)       |
| Sim tick rate       | 10 Hz                 |
| Max concurrent assets| ~50 (comfortable)    |
| Max concurrent effects| ~30 (missiles, etc.)|
| Initial load time   | < 3 seconds           |
| Memory usage        | < 100 MB              |

### 11.5 Responsive Design

| Breakpoint         | Layout Adjustment                                           |
| ------------------ | ----------------------------------------------------------- |
| ≥ 1280px           | Full layout — sidebar + map + HUD                           |
| 1024–1279px        | Collapsible sidebar, smaller minimap                        |
| 768–1023px         | Overlay panels instead of sidebar, touch-friendly buttons   |
| < 768px            | Not officially supported; show "rotate device" prompt       |

---

## 12. GAME BALANCE GUIDELINES

### 12.1 Design Philosophy

- **Asymmetry is the feature:** Defender and Attacker should feel fundamentally different to play.
- **Defender advantage:** Geography favors the Defender (chokepoint, coastal emplacements, mines). The Attacker must spend more to overcome this.
- **Attacker quality:** Attacker assets are individually superior (Aegis destroyers, F/A-18s) but fewer in number due to higher costs.
- **No dominant strategy:** Every asset should have a counter. Mines are countered by minesweepers. Subs are countered by ASW helos. Air attacks are countered by SAMs/CIWS. EW jamming degrades radar-dependent assets.

### 12.2 Counter Matrix

| Defender Threat         | Primary Counter (Attacker)    | Secondary Counter               |
| ----------------------- | ----------------------------- | ------------------------------- |
| Coastal Missile Battery | Tomahawk Strike ability       | EA-18G Growler jamming          |
| Fast Attack Craft Swarm | DDG/CG area defense           | F/A-18E strafing               |
| Ghadir Submarine        | MH-60R Seahawk ASW            | Los Angeles SSN                 |
| Sea Mines               | Avenger Minesweeper           | (No secondary — must sweep)     |
| Su-22 Strike Fighter    | F/A-18E air superiority       | DDG SM-2 SAM                    |
| Shahed-136 Drone Swarm  | DDG/CG CIWS (point defense)   | F/A-18E intercept               |
| Radar Station           | Tomahawk Strike               | F/A-18E strike mission          |
| Decoy Ability           | Time (decoys fade after 20s)  | P-8 advanced classification     |

| Attacker Threat         | Primary Counter (Defender)    | Secondary Counter               |
| ----------------------- | ----------------------------- | ------------------------------- |
| Arleigh Burke DDG       | Khalij Fars ASBM (high dmg)  | Ghadir torpedo ambush           |
| Ticonderoga CG          | Concentrated missile salvo    | Ghadir torpedo ambush           |
| Los Angeles SSN         | (Hard to counter — mine luck) | Concentrate Fire ability        |
| F/A-18E Super Hornet    | Su-22 air combat (inferior)   | Hide assets outside radar range |
| EA-18G Growler          | Su-22 intercept (priority)    | Shahed swarm (overwhelm CM)     |
| MH-60R Seahawk          | Fast Attack Craft guns        | Su-22 intercept                 |
| Minesweeper             | Fast Attack Craft (rush it)   | Concentrate Fire ability        |
| Tomahawk Strike ability | (Cannot be countered)         | Distribute radar stations       |

### 12.3 Tuning Parameters

All combat values in section 4 should be treated as initial values subject to playtesting. Key tuning levers:

- Tanker HP (higher = Attacker advantage)
- Mine damage (higher = Defender advantage)
- Countermeasure mitigation percentages
- Radar detection delay for LOW/MED/HIGH signature
- Ability cooldowns and effect durations
- Budget allocations per difficulty
- AI placement intelligence per difficulty

---

## 13. ACCESSIBILITY

- All critical information conveyed through both color AND shape/text (not color-alone)
- High-contrast mode option (boosts vector brightness, thickens lines)
- Event log provides text narration of all visual events
- Keyboard shortcuts for all major actions (placement, abilities, speed control)
- Screen reader support for menus and War Score screen

---

## 14. FUTURE EXPANSION (Out of Scope for V1)

These features are explicitly **not** included in V1 but are designed to be addable:

- **Multiplayer (PvP):** Two human players, one Defender, one Attacker — real-time simultaneous planning + simulation. WebSocket-based.
- **Campaign Mode:** Series of escalating scenarios with persistent upgrades and unlockable equipment.
- **Additional Maps:** Suez Canal, Bab el-Mandeb, Malacca Strait, Taiwan Strait.
- **Weather System:** Fog, storms, and sea state affecting detection ranges, hit probability, and aircraft availability.
- **Replay System:** Record simulation state per tick, allow full replay with timeline scrubbing.
- **Custom Scenarios:** Player-defined budgets, asset restrictions, route availability.
- **Mod Support:** JSON-based asset definitions allowing community-created equipment.

---

## 15. GLOSSARY

| Term               | Definition                                                                          |
| ------------------ | ----------------------------------------------------------------------------------- |
| AShM               | Anti-Ship Missile                                                                   |
| ASBM               | Anti-Ship Ballistic Missile                                                         |
| ASW                | Anti-Submarine Warfare                                                              |
| CAP                | Combat Air Patrol                                                                   |
| CIWS               | Close-In Weapon System (automated point defense gun)                                |
| CM                  | Countermeasures                                                                     |
| CRT                | Cathode Ray Tube (display aesthetic)                                                |
| DDG                | Guided Missile Destroyer                                                            |
| CG                 | Guided Missile Cruiser                                                              |
| EW                 | Electronic Warfare                                                                  |
| FAC                | Fast Attack Craft                                                                   |
| FFG                | Guided Missile Frigate                                                              |
| MCM                | Mine Countermeasures                                                                |
| SAM                | Surface-to-Air Missile                                                              |
| SM-2               | Standard Missile 2 (US Navy SAM)                                                    |
| SSN                | Nuclear Attack Submarine                                                            |
| TSS                | Traffic Separation Scheme (maritime shipping lanes)                                 |
| VLCC               | Very Large Crude Carrier (supertanker)                                              |
| WINCHESTER         | Military brevity code — ammunition expended                                         |

---

## 16. REVISION HISTORY

| Version | Date           | Author | Changes          |
| ------- | -------------- | ------ | ---------------- |
| 1.0     | March 15, 2026 | —      | Initial release  |

---

*End of Document*

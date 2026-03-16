# PHASE 8: Polish, Responsive Design, Accessibility & Balance

## Objective

Final polish pass across the entire game: refine visual effects and animations, implement responsive layout for different screen sizes, add accessibility features, optimize performance, build the Settings screen, and conduct a balance tuning pass. After this phase, the game is production-ready.

## Prerequisites

- **All prior phases (1-7)** complete — the game is fully functional end-to-end

## GDD Reference Sections

- **Section 10.1** — Visual Effects (refinement of radar sweeps, explosions, missile trails, contact blips)
- **Section 10.2** — Audio Design (stretch goal — placeholder hooks only)
- **Section 11.4** — Performance Targets (60fps, 10Hz sim, <50 assets, <3s load, <100MB memory)
- **Section 11.5** — Responsive Design (breakpoints: ≥1280, 1024-1279, 768-1023, <768)
- **Section 12.2** — Counter Matrix (balance verification)
- **Section 12.3** — Tuning Parameters (key balance levers)
- **Section 13** — Accessibility (color + shape/text, high-contrast mode, keyboard shortcuts, screen reader)

## Files to Modify

This phase modifies many existing files incrementally rather than creating large new files.

| File | Changes |
|------|---------|
| `src/rendering/EffectsRenderer.js` | Refine explosion, trail, and radar sweep animations |
| `src/rendering/AssetRenderer.js` | Improve icon detail and visual distinction |
| `src/rendering/CRTEffects.js` | Performance optimization (offscreen canvas caching) |
| `src/rendering/MapRenderer.js` | Optimize static layer caching |
| `src/components/PlanningPhase/PlanningPhase.jsx` | Responsive layout, keyboard shortcuts |
| `src/components/SimulationPhase/SimulationPhase.jsx` | Responsive layout, keyboard shortcuts |
| `src/components/WarScore.jsx` | Responsive layout, screen reader attributes |
| `src/components/MainMenu.jsx` | Keyboard navigation, screen reader attributes |
| `src/components/FactionSelect.jsx` | Keyboard navigation, responsive |
| `src/components/Settings.jsx` | **New** — Settings screen |
| `src/index.css` | Responsive breakpoints, high-contrast mode, media queries |
| `src/data/constants.js` | Balance tuning adjustments |

## Detailed Requirements

### Visual Polish

#### Radar Sweep Refinement
- Sweep rotation speed proportional to radar range: larger range = slower, more dramatic sweep
- Formula: `rotationSpeed = 2π / (radarRange / 20)` seconds per revolution (a 200nm radar takes ~10s to sweep)
- Sweep trail: fading arc behind the leading edge (30° trail, fading from 25% to 0% opacity)
- Only draw sweeps for radar-equipped assets (skip assets with `radarRange === 0`)

#### Explosion Refinement
- Two-phase animation:
  1. **Flash phase (0-0.3s):** Bright center point expands rapidly, high bloom (`shadowBlur: 20`), color shifts from white → orange
  2. **Expand phase (0.3-1.5s):** Ring expands outward, radial lines emanate, color shifts orange → red → dim red, opacity fades
- Radial lines: 8-12 lines from center, lengths vary randomly (seeded), slight rotation as they expand
- Screen shake: brief 2px random offset on the entire canvas for 0.2s (subtle)
- Size scaling: tanker explosions are 2x normal, small craft (FAC, PC) are 0.5x

#### Missile Trail Refinement
- Trail drawn as a quadratic bezier curve (slight arc) rather than straight line, for more dynamic feel
- Head of trail: bright point (faction color at 100%)
- Body: fading from 80% → 0% opacity over the trail length
- Trail length proportional to weapon range (long-range weapons have longer visible trails)
- Optional: brief puff at the launch point (small expanding circle that fades quickly)

#### Contact Blip Refinement
- Initial detection: 3 concentric rings pulse outward from the contact point (0.5s duration)
- Sustained contact: small dot pulses (opacity 60-100%, 1s period sine wave)
- Classification label fades in after 0.5s delay (simulating sensor processing time)
- Lost contact: final ring pulse, then dot fades over 1s

#### Asset Icon Refinement
- Add more detail to distinguish similar asset types:
  - DDG vs CG: CG is slightly larger with double hull lines
  - FFG vs PC: PC is noticeably smaller
  - VLCC vs Aframax: VLCC is larger rectangle
- Add a small health bar underneath each friendly asset (thin line, green→yellow→red based on HP%)
- Add directional indicators: small line showing heading for moving assets
- Selected asset (clicked during sim): brighter outline, info panel shows stats

### Responsive Design (GDD 11.5)

| Breakpoint | Layout |
|-----------|--------|
| **≥ 1280px** | Full layout: sidebar (250px) + map + HUD. Everything visible simultaneously |
| **1024-1279px** | Sidebar collapses to icons-only (40px) with expand-on-hover. Minimap shrinks to 100x60. Ability buttons compact |
| **768-1023px** | No permanent sidebar — equipment panel opens as a slide-over overlay from the left edge. Map fills the screen. HUD elements overlap map as floating panels. Touch-friendly button sizes (min 44px tap targets) |
| **< 768px** | Display a full-screen message: "HORMUZ requires a wider display. Please rotate your device or use a larger screen." with CRT styling. No gameplay rendered. |

#### Implementation
- Use CSS media queries and/or a `useWindowSize()` hook
- Planning Phase: sidebar becomes an overlay panel on narrow screens
- Simulation Phase: event log becomes a collapsible panel (tap to expand), ability bar shrinks
- War Score: tables scroll horizontally on narrow screens, grades remain prominent
- All touch targets minimum 44x44px on tablet breakpoints

### Accessibility (GDD 13)

#### Color + Shape/Text
- Review all information conveyed by color alone and add a secondary indicator:
  - Faction identification: color (red/blue) AND icon shape differences (Defender icons have angular shapes, Attacker icons have curved shapes) AND text labels
  - Asset health: color gradient AND numeric HP text AND health bar
  - Tanker status dots on HUD: color AND different shapes (● alive, ✕ destroyed, ✓ escaped)
  - Ability cooldown: bar color AND numeric seconds remaining

#### High-Contrast Mode
- Toggle in Settings screen
- When active:
  - Increase vector line widths by 1px across the board
  - Boost text brightness to 100% opacity (no dimming)
  - Increase icon size by 20%
  - Brighten grid lines to `#224422`
  - Thicken coastline vectors to 3px
  - Increase CRT scan line visibility (10% opacity instead of 5%)
- Store preference in component state (no localStorage per GDD 11.1 constraints)

#### Keyboard Shortcuts
| Key | Action | Phase |
|-----|--------|-------|
| `1-9` | Select equipment slot N from sidebar | Planning |
| `Escape` | Cancel current placement / ability targeting | Planning, Simulation |
| `Delete` / `Backspace` | Remove selected placed asset | Planning |
| `R` | Cycle route selection (Attacker) | Planning |
| `Space` | Commence Operation / Pause simulation | Planning, Simulation |
| `1` `2` `3` | Activate ability 1/2/3 | Simulation |
| `[` `]` | Decrease / increase simulation speed | Simulation |
| `Tab` | Cycle through placed assets (Planning) / active assets (Simulation) | Both |

- Display keyboard shortcut hints on buttons (small text or on hover)
- Show keyboard shortcut overlay on `?` press

#### Screen Reader Support
- All menu buttons and interactive elements have appropriate `aria-label` attributes
- War Score screen data tables use proper `<table>` markup with `<th>` headers
- Phase transitions announced via `aria-live` region
- Non-interactive Canvas content has `aria-hidden="true"` (it's visual-only; the event log provides text equivalent)
- Event log entries are in a `role="log"` `aria-live="polite"` region

### Performance Optimization (GDD 11.4)

Target: 60fps with ≤50 concurrent assets and ≤30 concurrent effects.

#### Static Layer Caching
- MapRenderer draws coastlines, grid, depth contours, and islands to an **offscreen canvas** once
- Each render frame: `ctx.drawImage(cachedMapCanvas, 0, 0)` instead of re-drawing all geometry
- Invalidate cache only on window resize

#### CRT Effect Optimization
- Scan line overlay: render to a small offscreen canvas, scale up with CSS (or draw once and composite)
- Vignette: render once to offscreen canvas, composite each frame

#### Effect Pooling
- Pre-allocate a pool of effect objects instead of creating new objects every time
- Reduces GC pressure during intense combat (many simultaneous effects)

#### Render Batching
- Group asset icon draws by faction color (reduce `ctx.fillStyle` changes)
- Batch similar effects (all missile trails drawn together, all explosions together)

#### Performance Monitoring (Dev Only)
- Add a hidden FPS counter (toggle with `F` key) showing current FPS and entity count
- Log warnings if frame time exceeds 16ms

### Settings Screen

New component accessible from Main Menu:
```
╔══════════════════════════════════════╗
║           SETTINGS                   ║
╠══════════════════════════════════════╣
║                                      ║
║  DEFAULT SPEED:  [1x] [2x] [■4x] [8x]  ║
║                                      ║
║  HIGH CONTRAST:  [■ ON ] [ OFF]      ║
║                                      ║
║  SHOW FPS:       [ ON ] [■ OFF]      ║
║                                      ║
║  AUDIO:          [ COMING SOON ]     ║
║                                      ║
║              [ BACK ]                ║
╚══════════════════════════════════════╝
```

- Settings stored in React state (top-level in Game.jsx or context), NOT localStorage
- Settings passed down to relevant components via props or context
- Audio toggle is a disabled placeholder for future implementation

### Balance Tuning Pass (GDD 12.2, 12.3)

Play through several games at each difficulty and verify:

1. **No dominant strategy exists:**
   - Defender can't always win by just spamming mines
   - Attacker can't always win by just bringing DDGs
   - Each counter from the GDD 12.2 counter matrix actually works in practice

2. **Difficulty feels correct:**
   - ADVISORY: Player should win easily regardless of faction
   - ELEVATED: Moderate challenge, player wins most games with decent strategy
   - SEVERE: Challenging, requires good asset composition and ability usage
   - CRITICAL: Very difficult, player needs near-optimal play to win

3. **Key tuning levers (GDD 12.3) to adjust if needed:**
   - Tanker HP (300 for VLCC, 200 for Aframax) — higher = Attacker advantage
   - Mine damage (150) — higher = Defender advantage
   - Countermeasure mitigation percentages (BASIC: 20%, ADVANCED: 40%)
   - Detection delay for LOW/MED/HIGH signature
   - Ability cooldowns and effect durations
   - Budget allocations per difficulty

4. **Document any balance changes** made, noting the original GDD value and the adjusted value with reasoning.

### Edge Case Handling

Review and handle these edge cases:
- Player places zero assets and hits Commence → AI should still work, simulation should run (player auto-loses quickly)
- All attacker assets destroyed but tankers still alive and moving → simulation continues until tankers escape or are caught
- Simulation time limit reached → 75% rule applied correctly
- Division by zero in scoring (0 losses → exchange rate = ∞ → cap at max)
- Window resize during simulation → canvas resizes without losing simulation state
- Rapid ability clicking → cooldown prevents double-activation

## Acceptance Criteria

1. **Visual quality:** Explosions, missile trails, and radar sweeps look polished and distinct
2. **60fps:** Game maintains 60fps with 40+ entities and active effects on a modern laptop
3. **Responsive — 1280+:** Full layout displays correctly
4. **Responsive — 1024-1279:** Sidebar collapses, layout still usable
5. **Responsive — 768-1023:** Overlay panels work, touch targets are ≥44px
6. **Responsive — <768:** "Rotate device" message displays
7. **High-contrast mode:** Toggle works, all elements are noticeably brighter/thicker
8. **Keyboard shortcuts:** All listed shortcuts function correctly
9. **Screen reader:** Menu buttons and War Score tables are accessible via screen reader
10. **Settings:** All settings function and persist across game sessions (within the same page load)
11. **Balance:** At least 2 full playthroughs (1 Defender, 1 Attacker) at SEVERE difficulty result in a competitive game (neither side wins trivially)
12. **Edge cases:** Zero-placement game doesn't crash; scoring handles 0/0 gracefully

## Implementation Notes

- **This phase is wide but shallow.** You're touching many files but making small changes in each. Avoid the temptation to refactor — focus on targeted improvements.
- **Performance profiling:** Use browser DevTools Performance tab to identify actual bottlenecks before optimizing. Don't optimize blindly.
- **Static canvas caching:** The biggest perf win. Map re-drawing is expensive due to coastline complexity. Cache it immediately.
- **Balance tuning is iterative.** Don't try to achieve perfect balance. Get it "good enough" — the GDD values are already designed to be reasonable starting points. Only adjust if something is clearly broken (e.g., mines one-shot everything, or AI never scores a kill).
- **Audio placeholders.** Add a comment or empty function call at each audio trigger point (placement click, explosion, simulation start klaxon, etc.) so that audio can be added later without searching for trigger points. Don't implement actual audio.
- **High-contrast mode** is a CSS class toggle on the root element, not a re-implementation. Use CSS custom properties and override them when `.high-contrast` class is active.
- **Keyboard shortcut hint display:** Add small `<kbd>` elements on buttons showing the shortcut key (e.g., `[1]` next to the first ability button). Only visible on hover or when `?` help overlay is active.

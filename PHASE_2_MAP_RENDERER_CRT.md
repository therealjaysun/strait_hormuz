# PHASE 2: Canvas Map Renderer & CRT Effects

## Objective

Build the core visual rendering pipeline: a reusable Canvas component that renders the Strait of Hormuz map with coastlines, islands, grid, routes, and placement zones — all styled in the DEFCON CRT vector aesthetic with scan lines, phosphor bloom, and vignette effects. Also implement vector icon renderers for all military asset types. This phase creates the visual foundation shared by both the Planning Phase and Simulation Phase.

## Prerequisites

- **Phase 1** complete (project structure, data layer with `mapData.js`/`placementZones.js`/`constants.js`, color palette CSS variables, utility functions)

## GDD Reference Sections

- **Section 3.1** — Geography (Iranian coast, Omani coast, Musandam Peninsula, islands, strait narrows, TSS lanes, Persian Gulf, Gulf of Oman)
- **Section 3.2** — Visual Treatment (dark ocean, bright vector coastlines, depth contours, cross-hatch islands, grid overlay, CRT effects)
- **Section 3.3** — War Paths (Route ALPHA/BRAVO/CHARLIE paths, all placement zone locations)
- **Section 10.1** — DEFCON CRT Aesthetic (full color palette, visual effects list, typography)

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/PlanningPhase/MapCanvas.jsx` | Reusable Canvas React component — handles sizing, DPI scaling, mouse events, render loop orchestration |
| `src/rendering/MapRenderer.js` | Draws static map elements: coastlines, islands, depth contours, grid, coordinate labels, TSS lanes |
| `src/rendering/CRTEffects.js` | Post-processing overlay: scan lines, phosphor bloom (glow), radial vignette |
| `src/rendering/AssetRenderer.js` | Draws vector icons for each asset type (ships, aircraft, subs, missiles, mines, radar stations) |
| `src/rendering/ZoneRenderer.js` | Draws placement zone outlines with pulsing animation |
| `src/data/mapData.js` | **Updated** — full coastline coordinate arrays, island polygon arrays, route waypoint arrays |

## Detailed Requirements

### MapCanvas.jsx — Reusable Canvas Component
```jsx
// Props:
// - width, height (or auto-size to parent)
// - onCanvasClick(worldPos) — for placement interactions (Phase 4)
// - onCanvasHover(worldPos) — for tooltips (Phase 4)
// - renderCallback(ctx, width, height, time) — called each frame
// - className — for Tailwind styling on the container

// Responsibilities:
// 1. Create <canvas> element, handle DPI scaling (devicePixelRatio)
// 2. Auto-resize on window resize (ResizeObserver)
// 3. Translate screen coordinates to world coordinates (for mouse events)
// 4. Run requestAnimationFrame loop, call renderCallback each frame
// 5. Expose canvas ref for parent component access
```

Key implementation details:
- Use `useRef` for the canvas element
- Use `useEffect` for the animation loop lifecycle
- Handle `devicePixelRatio` for crisp rendering on Retina displays: set canvas width/height to `element.clientWidth * dpr`, then `ctx.scale(dpr, dpr)`
- World coordinate system: 0-1000 (x) by 0-600 (y) matching `MAP_BOUNDS` from Phase 1

### MapRenderer.js — Static Map Drawing

#### Coastlines
Draw the Iranian coastline (north) and Omani/Musandam coastline (south) as bright vector polylines:
- Color: `#00ff88` (phosphor green)
- Line width: 2px
- Apply glow effect: draw the line twice — once at 2px with full opacity, once at 6px with 30% opacity (bloom simulation)

**Coastline geometry** — approximate the real Strait of Hormuz geography:
- Iranian coast runs roughly west-to-east across the top of the map with mountainous indentations
- Musandam Peninsula (Oman) juts northward from the bottom-right
- The strait narrows to ~21nm between the two coasts

#### Islands
Four key islands, drawn as filled polygons with cross-hatch pattern:
- **Qeshm Island** — large island near the Iranian coast (northwest area)
- **Hormuz Island** — small island south of Qeshm
- **Larak Island** — small island east of Hormuz
- **Hengam Island** — small island south of Qeshm (southwest of Larak)

Island rendering:
- Outline: `#00ff88` at 1.5px
- Fill: cross-hatch pattern (diagonal lines at 45°, 8px spacing, `#00ff88` at 15% opacity)
- Label: island name in small monospace text centered on island

#### Depth Contours
Faint concentric-ish vector lines suggesting underwater depth:
- Color: `#00ff88` at 8% opacity
- Draw 3-4 contour lines roughly parallel to coastlines, getting progressively further from shore
- Line width: 0.5px

#### Grid Overlay
Coordinate grid covering the entire map:
- Color: `#112211` (very dim green)
- Line width: 0.5px
- Grid spacing: every 50 units in both axes (20 cells x 12 cells)
- Coordinate labels at edges in small text (`#00ff88` at 40% opacity)

#### TSS Lanes
Two Traffic Separation Scheme lanes through the strait:
- **Inbound lane** (south, dimmed — not in active play): dashed line, `#00ff88` at 15% opacity
- **Outbound lane** (north, active): dashed line, `#00ff88` at 30% opacity
- Median buffer zone between them: faint dotted line

#### Convoy Routes
Three selectable routes drawn as styled vector paths:
- **Route ALPHA** (northern): closer to Iranian coast
- **Route BRAVO** (central): through the TSS outbound lane
- **Route CHARLIE** (southern): hugging Omani waters

Route rendering when visible:
- Active/selected route: solid line, faction-appropriate color (`#3399ff` for Attacker), 2px, with glow
- Inactive routes: dashed line, `#3399ff` at 30% opacity, 1px
- Route labels at the entry point (west edge)

All routes should enter from the west (Persian Gulf) and exit to the east (Gulf of Oman).

### CRTEffects.js — Post-Processing

Apply these effects as a final pass over the rendered canvas:

#### Scan Lines
- Horizontal lines covering the entire canvas
- Pattern: alternating transparent and semi-opaque lines at 2px intervals
- Opacity: 5% (`rgba(0, 0, 0, 0.05)`)
- Implementation: draw a single-pixel-height pattern and tile it, OR use a pre-rendered offscreen canvas for performance

#### Phosphor Bloom
- Subtle glow effect on bright elements
- Implementation approach: use `ctx.shadowBlur` and `ctx.shadowColor` when drawing bright elements (coastlines, text, icons)
- Alternative: render bright elements to an offscreen canvas, apply `ctx.filter = 'blur(2px)'`, composite back at reduced opacity

#### Radial Vignette
- Darkening at screen edges simulating CRT screen curvature
- Implementation: radial gradient from transparent center to `rgba(0, 0, 0, 0.4)` at edges
- Draw as a full-canvas overlay after all other rendering

### AssetRenderer.js — Vector Icons

Draw simple geometric vector icons for each asset type. All icons should be small (10-20px), distinctly shaped, and colored by faction (Defender: `#ff3333`, Attacker: `#3399ff`, Tankers: `#ffaa00`).

| Asset Type | Icon Shape |
|-----------|-----------|
| **Destroyer/Cruiser/Frigate** | Triangle pointing in direction of travel (ship shape) |
| **Fast Attack Craft** | Smaller triangle, slightly elongated |
| **Patrol Craft** | Very small triangle |
| **Submarine** | Diamond/rhombus shape |
| **Minesweeper** | Triangle with a small arc in front (sweep indicator) |
| **Coastal Missile Battery** | Square with upward-pointing arrow |
| **Radar Station** | Circle with radiating lines (radar dish) |
| **Mine Layer** | Triangle with dots behind (mines being laid) |
| **Sea Mine** | Small circle (dot) — only when revealed |
| **Fighter/Strike Aircraft** | Small chevron/arrowhead pointing in direction |
| **Helicopter** | Small X with a circle |
| **Drone Swarm** | Cluster of 3-4 tiny dots |
| **Tanker (VLCC/Aframax)** | Large rectangle (barge shape) |
| **EW Aircraft** | Chevron with wavy lines (jamming) |
| **Maritime Patrol** | Larger chevron |

Each icon function signature:
```js
export function drawAssetIcon(ctx, x, y, assetType, faction, rotation, scale = 1, options = {}) {
  // options: { dimmed, selected, destroyed, winchester }
}
```

- Selected assets: brighter glow, pulsing outline
- Destroyed assets: dimmed icon with "X" overlay
- WINCHESTER (ammo depleted): dimmed icon with reduced brightness

### ZoneRenderer.js — Placement Zone Outlines

Draw placement zone boundaries during the Planning Phase:
- Zones rendered as dashed rectangles or polygons with faction-colored outlines
- **Pulsing animation:** zone outlines smoothly pulse between 30% and 80% opacity (sine wave, ~2s period)
- When an asset is selected for placement, valid zones pulse brighter; invalid zones dim
- Capacity indicator: small text near zone showing `"2/3"` (placed/max)
- Zone label text in small monospace

Zone colors:
- Defender zones: `#ff3333` outline
- Attacker zones: `#3399ff` outline
- Hover highlight: increased line width and opacity

### mapData.js — Full Coordinate Data

Update the stub from Phase 1 with actual coordinate arrays. Use the normalized coordinate system (0-1000 x 0-600).

Approximate layout:
```
    PERSIAN GULF (WEST)                    GULF OF OMAN (EAST)
    ← Convoy enters                        Convoy exits →

    0,0 ─────────────────────────────────────────── 1000,0
    │                                                     │
    │   ██ Iranian Coastline (top, irregular) ██████      │
    │        ╔═══╗                                        │
    │        ║Qeshm║    ○Hormuz  ○Larak                  │
    │        ╚═══╝         ○Hengam                       │
    │                                                     │
    │   ----Route ALPHA----- (northern, near Iran)----→  │
    │   ====Route BRAVO===== (central, TSS lane)=====→  │
    │   ....Route CHARLIE... (southern, near Oman)...→  │
    │                                                     │
    │                              ████ Musandam ████     │
    │                              ████ Peninsula ████    │
    0,600 ───────────────────────────────────────── 1000,600
```

Provide coordinate arrays as arrays of `{x, y}` objects for:
- `iranianCoastline` — polyline points
- `omaniCoastline` — polyline points (including Musandam)
- `qeshmIsland` — polygon points
- `hormuzIsland` — polygon points
- `larakIsland` — polygon points
- `hengamIsland` — polygon points
- `routeAlpha` — waypoint array
- `routeBravo` — waypoint array
- `routeCharlie` — waypoint array
- `depthContours` — array of polylines
- Placement zone positions (rectangles or polygons with center points)

## Acceptance Criteria

1. **Map renders correctly:** Opening the app shows the Strait of Hormuz with recognizable geography — Iranian coast at top, Musandam at bottom-right, four islands in the strait
2. **Coastlines glow:** Vector coastlines have visible phosphor green glow effect
3. **Islands have cross-hatch:** Islands show diagonal line fill pattern with labels
4. **Grid is visible but subtle:** Dim green grid lines with coordinate labels at edges
5. **Routes visible:** All three convoy routes drawn as distinct paths from west to east
6. **CRT scan lines:** Horizontal scan line overlay visible across the viewport
7. **Vignette:** Edges of the screen are noticeably darker than the center
8. **Asset icons:** All ~15 asset types have distinct, recognizable vector icons at both Defender (red) and Attacker (blue) colors
9. **Placement zones:** Zone outlines pulse smoothly with correct faction colors
10. **Performance:** Map renders at 60fps (static content should be cached to avoid re-drawing every frame)
11. **Responsive:** Canvas resizes correctly when window is resized, maintaining aspect ratio

## Implementation Notes

- **Cache static layers.** The coastlines, grid, depth contours, and islands never change. Render them once to an offscreen canvas, then composite that cached image each frame. Only dynamic elements (icons, zones, effects) need per-frame drawing.
- **Coordinate system consistency.** Establish the world-to-screen transform once in MapCanvas.jsx. All renderers should work in world coordinates (0-1000 x 0-600) and let the canvas transform handle scaling.
- **Glow effect technique.** For phosphor bloom on lines: set `ctx.shadowColor` and `ctx.shadowBlur` before `ctx.stroke()`. This is more performant than double-drawing. Reset shadow after to avoid blooming everything.
- **Cross-hatch pattern.** Create a small offscreen canvas (e.g., 16x16) with diagonal lines, then use `ctx.createPattern()` to fill island polygons.
- **The MapCanvas component will be reused** in both Planning Phase (with zone overlays and click handling) and Simulation Phase (with moving assets and effects). Design the render callback interface to be composable.
- **Don't over-detail coastlines.** 30-50 points per coastline is enough for a stylized vector look. This is DEFCON-aesthetic, not Google Maps.
- **Island positions matter for gameplay.** Qeshm should be large and near the Iranian coast. The other three islands should be positioned in the strait proper where they can cover convoy routes with radar/missile range circles.

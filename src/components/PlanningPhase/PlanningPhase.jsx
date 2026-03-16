import { useReducer, useCallback, useRef, useMemo, useState, useEffect } from 'react';
import MapCanvas from './MapCanvas.jsx';
import EquipmentPanel from './EquipmentPanel.jsx';
import BudgetHUD from './BudgetHUD.jsx';
import RouteSelector from './RouteSelector.jsx';
import StatTooltip from './StatTooltip.jsx';
import Minimap from './Minimap.jsx';
import { renderMap } from '../../rendering/MapRenderer.js';
import { drawPlacementZones } from '../../rendering/ZoneRenderer.js';
import { drawAssetIcon } from '../../rendering/AssetRenderer.js';
import { applyCRTEffects } from '../../rendering/CRTEffects.js';
import { defenderEquipment } from '../../data/defenderEquipment.js';
import { attackerEquipment } from '../../data/attackerEquipment.js';
import { PLACEMENT_ZONES } from '../../data/placementZones.js';
import { ROUTES, MAP_BOUNDS } from '../../data/mapData.js';
import { generateAIPlacement } from '../../engine/AIPlacement.js';

// Map equipment ID → icon type for AssetRenderer
const EQUIPMENT_ICON_MAP = {
  noor_ashm: 'COASTAL_MISSILE',
  khalij_fars_asbm: 'ASBM',
  ghader_cruise: 'CRUISE_MISSILE',
  coastal_radar: 'COASTAL_RADAR',
  mobile_radar: 'MOBILE_RADAR',
  thondar_fac: 'FAST_ATTACK_CRAFT',
  sina_corvette: 'CORVETTE',
  ghadir_sub: 'SUBMARINE',
  mine_layer: 'MINE_LAYER',
  su22_strike: 'STRIKE_AIRCRAFT',
  shahed_136_swarm: 'DRONE_SWARM',
  arleigh_burke_ddg: 'DESTROYER',
  ticonderoga_cg: 'CRUISER',
  perry_ffg: 'FRIGATE',
  cyclone_pc: 'PATROL_CRAFT',
  avenger_mcm: 'MINESWEEPER',
  los_angeles_ssn: 'SSN',
  fa18e_hornet: 'FIGHTER',
  mh60r_seahawk: 'HELICOPTER',
  p8_poseidon: 'MARITIME_PATROL',
  ea18g_growler: 'EW_AIRCRAFT',
};

function isAirPlacementCategory(category) {
  return category === 'AERIAL' || category === 'DRONE' || category === 'EW';
}

// Compute attacker zone positions from route waypoints
function getAttackerZonePositions(routeKey) {
  const route = ROUTES[routeKey];
  if (!route) return {};
  const wp = route.waypoints;
  return {
    convoy_lead: { x: wp[1].x + 30, y: wp[1].y },
    convoy_port: { x: wp[1].x, y: wp[1].y - 25 },
    convoy_starboard: { x: wp[1].x, y: wp[1].y + 25 },
    convoy_rear: { x: wp[1].x - 30, y: wp[1].y },
    convoy_center: { x: wp[1].x, y: wp[1].y },
    fwd_0: { x: wp[2].x, y: wp[2].y - 15 },
    fwd_1: { x: wp[2].x, y: wp[2].y + 15 },
    fwd_2: { x: wp[3].x, y: wp[3].y - 15 },
    fwd_3: { x: wp[3].x, y: wp[3].y + 15 },
    cap_0: { x: wp[3].x, y: wp[3].y - 50 },
    cap_1: { x: wp[6].x, y: wp[6].y - 50 },
    cap_2: { x: wp[5].x, y: wp[5].y - 40 },
    cap_3: { x: wp[8].x, y: wp[8].y - 40 },
    sub_0: { x: wp[4].x, y: wp[4].y + 40 },
    sub_1: { x: wp[7].x, y: wp[7].y - 40 },
    sub_2: { x: wp[5].x, y: wp[5].y + 50 },
  };
}

function getNearestPathHeading(position, waypoints) {
  if (!position || !waypoints || waypoints.length < 2) return 0;

  let bestDistanceSq = Infinity;
  let bestHeading = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const start = waypoints[i - 1];
    const end = waypoints[i];
    const segDx = end.x - start.x;
    const segDy = end.y - start.y;
    const segLenSq = segDx * segDx + segDy * segDy;
    if (segLenSq === 0) continue;

    const t = Math.max(0, Math.min(1,
      ((position.x - start.x) * segDx + (position.y - start.y) * segDy) / segLenSq
    ));
    const projX = start.x + segDx * t;
    const projY = start.y + segDy * t;
    const dx = position.x - projX;
    const dy = position.y - projY;
    const distSq = dx * dx + dy * dy;

    if (distSq < bestDistanceSq) {
      bestDistanceSq = distSq;
      bestHeading = Math.atan2(segDy, segDx);
    }
  }

  return bestHeading;
}

function getPlacementRotation(placement, asset, playerFaction, primaryRoute) {
  if (!placement || !asset) return 0;
  if (!['NAVAL', 'ESCORT', 'SUBMARINE', 'MINE_LAYER', 'AERIAL', 'EW'].includes(asset.category)) {
    return 0;
  }

  if (playerFaction === 'ATTACKER' && primaryRoute && ROUTES[primaryRoute]) {
    return getNearestPathHeading(placement.position, ROUTES[primaryRoute].waypoints);
  }

  const routeKeys = ['ALPHA', 'BRAVO', 'CHARLIE'];
  let bestHeading = 0;
  let bestDistanceSq = Infinity;

  for (const key of routeKeys) {
    const route = ROUTES[key];
    if (!route) continue;
    const heading = getNearestPathHeading(placement.position, route.waypoints);
    const nearest = route.waypoints.reduce((best, point) => {
      const dx = point.x - placement.position.x;
      const dy = point.y - placement.position.y;
      const distSq = dx * dx + dy * dy;
      return distSq < best ? distSq : best;
    }, Infinity);
    if (nearest < bestDistanceSq) {
      bestDistanceSq = nearest;
      bestHeading = heading;
    }
  }

  return bestHeading;
}

// Flatten zone structure into a flat array of slots with metadata
function flattenZones(factionZones, attackerPositions) {
  const flat = [];
  for (const [groupKey, group] of Object.entries(factionZones)) {
    for (const slot of group.slots) {
      const position = slot.relative
        ? (attackerPositions?.[slot.id] || null)
        : slot.position;
      if (!position) continue;
      flat.push({
        id: slot.id,
        groupKey,
        label: slot.label,
        position,
        capacity: slot.capacity || 1,
        types: group.types,
        relative: !!slot.relative,
      });
    }
  }
  return flat;
}

const ZONE_HIT_RADIUS = 18; // world units (matches ZoneRenderer ZONE_RADIUS)

// --- Placement Reducer ---
function placementReducer(state, action) {
  switch (action.type) {
    case 'PLACE_ASSET': {
      const { asset, zoneId, position } = action;
      const statusText = isAirPlacementCategory(asset.category)
        ? `${asset.name} ASSIGNED TO STATION`
        : `${asset.name} DEPLOYED`;
      return {
        ...state,
        placements: [
          ...state.placements,
          {
            id: `p_${Date.now()}_${state.placements.length}`,
            assetId: asset.id,
            zoneId,
            position,
          },
        ],
        remainingBudget: state.remainingBudget - asset.cost,
        stockUsed: {
          ...state.stockUsed,
          [asset.id]: (state.stockUsed[asset.id] || 0) + 1,
        },
        selectedAssetId: null,
        message: { text: statusText, type: 'success', time: Date.now() },
      };
    }
    case 'REMOVE_ASSET': {
      const placement = state.placements.find((p) => p.id === action.placementId);
      if (!placement) return state;
      const asset = action.equipment.find((e) => e.id === placement.assetId);
      if (!asset) return state;
      return {
        ...state,
        placements: state.placements.filter((p) => p.id !== action.placementId),
        remainingBudget: state.remainingBudget + asset.cost,
        stockUsed: {
          ...state.stockUsed,
          [placement.assetId]: Math.max(0, (state.stockUsed[placement.assetId] || 0) - 1),
        },
        message: { text: 'ASSET RECALLED', type: 'info', time: Date.now() },
      };
    }
    case 'SELECT_ASSET':
      return { ...state, selectedAssetId: action.assetId };
    case 'SELECT_ROUTE':
      return { ...state, selectedRoute: action.route };
    case 'SET_TANKER_ALLOCATION':
      return { ...state, tankerAllocation: action.allocation };
    case 'CLEAR_ALL':
      return {
        ...state,
        placements: [],
        remainingBudget: action.totalBudget,
        stockUsed: {},
        selectedAssetId: null,
        message: { text: 'ALL ASSETS RECALLED', type: 'info', time: Date.now() },
      };
    case 'CLEAR_MESSAGE':
      return { ...state, message: null };
    default:
      return state;
  }
}

export default function PlanningPhase({ gameState, dispatch }) {
  const { playerFaction, playerBudget, difficulty } = gameState;
  const isDefender = playerFaction === 'DEFENDER';
  const factionColor = isDefender ? '#ff3333' : '#3399ff';
  const equipment = isDefender ? defenderEquipment : attackerEquipment;
  const factionZones = isDefender ? PLACEMENT_ZONES.defender : PLACEMENT_ZONES.attacker;

  const containerRef = useRef(null);
  const [tooltipAsset, setTooltipAsset] = useState(null);
  const [tooltipMouse, setTooltipMouse] = useState(null);
  const [hoveredZoneId, setHoveredZoneId] = useState(null);

  const [placementState, placementDispatch] = useReducer(placementReducer, {
    placements: [],
    remainingBudget: playerBudget,
    stockUsed: {},
    selectedAssetId: null,
    selectedRoute: null,
    tankerAllocation: { ALPHA: 5, BRAVO: 0, CHARLIE: 0 },
    message: null,
  });

  const { placements, remainingBudget, stockUsed, selectedAssetId, selectedRoute, tankerAllocation, message } =
    placementState;

  // Auto-clear messages after 2 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => placementDispatch({ type: 'CLEAR_MESSAGE' }), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  // Primary route is the one with the most tankers (for escort formation placement)
  const primaryRoute = useMemo(() => {
    if (isDefender) return selectedRoute;
    let bestRoute = 'ALPHA';
    let bestCount = 0;
    for (const [route, count] of Object.entries(tankerAllocation)) {
      if (count > bestCount) {
        bestCount = count;
        bestRoute = route;
      }
    }
    return bestRoute;
  }, [isDefender, selectedRoute, tankerAllocation]);

  // Compute attacker zone positions from primary route
  const attackerPositions = useMemo(
    () => (primaryRoute ? getAttackerZonePositions(primaryRoute) : null),
    [primaryRoute]
  );

  // Flatten zones for rendering and hit testing
  const flatZones = useMemo(
    () => flattenZones(factionZones, attackerPositions),
    [factionZones, attackerPositions]
  );

  // Zone fill counts
  const zoneFillCounts = useMemo(() => {
    const counts = {};
    for (const p of placements) {
      counts[p.zoneId] = (counts[p.zoneId] || 0) + 1;
    }
    return counts;
  }, [placements]);

  // Lookup equipment by ID
  const equipmentById = useMemo(() => {
    const map = {};
    for (const e of equipment) map[e.id] = e;
    return map;
  }, [equipment]);

  // Get selected asset object
  const selectedAsset = selectedAssetId ? equipmentById[selectedAssetId] : null;

  // Canvas render callback
  const renderCallback = useCallback(
    (ctx, width, height, time) => {
      // Determine routes to display — highlight all routes with tankers assigned
      let routesToShow = null;
      if (!isDefender) {
        const activeRoutes = new Set();
        for (const [routeKey, count] of Object.entries(tankerAllocation)) {
          if (count > 0) activeRoutes.add(routeKey);
        }
        routesToShow = activeRoutes.size > 0 ? activeRoutes : null;
      }
      renderMap(ctx, width, height, routesToShow);

      const scaleX = width / MAP_BOUNDS.width;
      const scaleY = height / MAP_BOUNDS.height;

      // Draw placement zones
      const zoneRenderData = flatZones.map((z) => ({
        id: z.id,
        position: z.position,
        label: z.label,
        capacity: z.capacity,
        types: z.types,
      }));

      drawPlacementZones(ctx, width, height, time, playerFaction, zoneRenderData, {
        hoveredZoneId,
        selectedAssetCategory: selectedAsset?.category || null,
        placedCounts: zoneFillCounts,
      });

      // Draw placed assets
      for (const p of placements) {
        const sx = p.position.x * scaleX;
        const sy = p.position.y * scaleY;
        const iconType = EQUIPMENT_ICON_MAP[p.assetId] || 'DEFAULT';
        drawAssetIcon(
          ctx,
          sx,
          sy,
          iconType,
          playerFaction,
          getPlacementRotation(p, equipmentById[p.assetId], playerFaction, primaryRoute),
          1.2,
          { selected: false, showHeading: true }
        );
      }

      // CRT effects
      applyCRTEffects(ctx, width, height);
    },
    [
      isDefender,
      primaryRoute,
      tankerAllocation,
      flatZones,
      playerFaction,
      hoveredZoneId,
      selectedAsset,
      zoneFillCounts,
      placements,
    ]
  );

  // Find which zone the click hit
  const findZoneAtPos = useCallback(
    (worldPos) => {
      for (const zone of flatZones) {
        const dx = worldPos.x - zone.position.x;
        const dy = worldPos.y - zone.position.y;
        if (dx * dx + dy * dy <= ZONE_HIT_RADIUS * ZONE_HIT_RADIUS) {
          return zone;
        }
      }
      return null;
    },
    [flatZones]
  );

  // Find which placed asset the click hit
  const findPlacementAtPos = useCallback(
    (worldPos) => {
      const hitRadius = 15;
      for (const p of placements) {
        const dx = worldPos.x - p.position.x;
        const dy = worldPos.y - p.position.y;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          return p;
        }
      }
      return null;
    },
    [placements]
  );

  // Handle map click — place asset
  const handleMapClick = useCallback(
    (worldPos) => {
      if (!selectedAsset) return;

      const zone = findZoneAtPos(worldPos);
      if (!zone) {
        // Click empty space deselects
        placementDispatch({ type: 'SELECT_ASSET', assetId: null });
        return;
      }

      // Check if asset category is valid for this zone
      if (!zone.types.includes(selectedAsset.category)) {
        placementDispatch({
          type: 'SELECT_ASSET',
          assetId: selectedAssetId,
        });
        return;
      }

      // Check zone capacity
      const currentFill = zoneFillCounts[zone.id] || 0;
      if (currentFill >= zone.capacity) return;

      // Check budget
      if (remainingBudget < selectedAsset.cost) return;

      // Check stock
      const used = stockUsed[selectedAsset.id] || 0;
      if (used >= selectedAsset.maxStock) return;

      // Place the asset
      placementDispatch({
        type: 'PLACE_ASSET',
        asset: selectedAsset,
        zoneId: zone.id,
        position: { ...zone.position },
      });
    },
    [selectedAsset, selectedAssetId, findZoneAtPos, zoneFillCounts, remainingBudget, stockUsed]
  );

  // Handle right-click — remove asset
  const handleMapRightClick = useCallback(
    (worldPos) => {
      const placement = findPlacementAtPos(worldPos);
      if (placement) {
        placementDispatch({
          type: 'REMOVE_ASSET',
          placementId: placement.id,
          equipment,
        });
      }
    },
    [findPlacementAtPos, equipment]
  );

  // Handle hover
  const handleMapHover = useCallback(
    (worldPos) => {
      // Check zone hover
      const zone = findZoneAtPos(worldPos);
      setHoveredZoneId(zone?.id || null);

      // Check placed asset hover for tooltip
      const placement = findPlacementAtPos(worldPos);
      if (placement) {
        const asset = equipmentById[placement.assetId];
        if (asset) {
          setTooltipAsset(asset);
          // Convert world to approximate screen position
          const container = containerRef.current;
          if (container) {
            const rect = container.getBoundingClientRect();
            setTooltipMouse({
              x: (worldPos.x / MAP_BOUNDS.width) * rect.width,
              y: (worldPos.y / MAP_BOUNDS.height) * rect.height,
            });
          }
          return;
        }
      }
      setTooltipAsset(null);
    },
    [findZoneAtPos, findPlacementAtPos, equipmentById]
  );

  // Sidebar tooltip hover handler
  const handleEquipmentHover = useCallback((asset) => {
    if (asset) {
      setTooltipAsset(asset);
      setTooltipMouse({ x: 260, y: 200 });
    } else {
      setTooltipAsset(null);
    }
  }, []);

  // Commence operation
  // For attacker, need at least 1 tanker allocated to a route
  const totalTankersAssigned = Object.values(tankerAllocation).reduce((a, b) => a + b, 0);
  const canCommence = isDefender || totalTankersAssigned > 0;

  const handleCommence = useCallback(() => {
    if (!canCommence) return;

    // Save player placements to game state
    dispatch({ type: 'SET_PLACEMENTS', placements });

    // If attacker, save route and tanker allocation
    if (!isDefender) {
      dispatch({ type: 'SET_ROUTE', route: primaryRoute || 'ALPHA' });
      dispatch({ type: 'SET_TANKER_ALLOCATION', tankerAllocation });
    }

    // Generate AI placements
    const aiFaction = isDefender ? 'ATTACKER' : 'DEFENDER';
    const aiBudget = gameState.aiBudget;
    const aiResult = generateAIPlacement(aiFaction, gameState.difficulty, aiBudget);
    dispatch({ type: 'SET_AI_PLACEMENTS', placements: aiResult.placements });

    // If defender, AI also selects a route
    if (isDefender && aiResult.route) {
      dispatch({ type: 'SET_ROUTE', route: aiResult.route });
    }

    // Transition to simulation
    dispatch({ type: 'START_SIMULATION' });
  }, [canCommence, placements, primaryRoute, tankerAllocation, isDefender, dispatch, gameState.aiBudget]);

  // Keyboard shortcuts
  const ROUTE_KEYS = ['ALPHA', 'BRAVO', 'CHARLIE'];
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape — deselect
      if (e.key === 'Escape') {
        placementDispatch({ type: 'SELECT_ASSET', assetId: null });
        return;
      }

      // 1-9 — select equipment slot
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && num <= equipment.length) {
        const asset = equipment[num - 1];
        placementDispatch({ type: 'SELECT_ASSET', assetId: asset.id });
        return;
      }

      // Delete/Backspace — remove last placed asset
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (placements.length > 0) {
          const last = placements[placements.length - 1];
          placementDispatch({ type: 'REMOVE_ASSET', placementId: last.id, equipment });
        }
        return;
      }

      // R key — no longer used (tanker allocation replaces route cycling)

      // Space — commence operation
      if (e.key === ' ') {
        e.preventDefault();
        if (canCommence) handleCommence();
        return;
      }

      // Tab — cycle through placed assets (focus/select)
      if (e.key === 'Tab' && placements.length > 0) {
        e.preventDefault();
        // Cycle through placed asset positions (visual feedback via tooltip)
        const currentAssetIdx = placements.findIndex(p => {
          const asset = equipmentById[p.assetId];
          return asset && tooltipAsset && asset.id === tooltipAsset.id;
        });
        const nextIdx = (currentAssetIdx + 1) % placements.length;
        const nextPlacement = placements[nextIdx];
        const asset = equipmentById[nextPlacement.assetId];
        if (asset) {
          setTooltipAsset(asset);
          setTooltipMouse({
            x: (nextPlacement.position.x / MAP_BOUNDS.width) * (containerRef.current?.getBoundingClientRect().width || 800),
            y: (nextPlacement.position.y / MAP_BOUNDS.height) * (containerRef.current?.getBoundingClientRect().height || 600),
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [equipment, placements, isDefender, canCommence, handleCommence, equipmentById, tooltipAsset]);

  return (
    <div className="flex h-full select-none" ref={containerRef}>
      {/* Left Sidebar — Equipment Panel */}
      <EquipmentPanel
        equipment={equipment}
        selectedAssetId={selectedAssetId}
        onSelectAsset={(id) => placementDispatch({ type: 'SELECT_ASSET', assetId: id })}
        remainingBudget={remainingBudget}
        stockUsed={stockUsed}
        factionColor={factionColor}
        onHoverAsset={handleEquipmentHover}
      />

      {/* Main area — Map + overlays */}
      <div className="flex-1 flex flex-col relative">
        {/* Map area */}
        <div className="flex-1 relative">
          <MapCanvas
            renderCallback={renderCallback}
            onCanvasClick={handleMapClick}
            onCanvasRightClick={handleMapRightClick}
            onCanvasHover={handleMapHover}
            className="w-full h-full"
          />

          {/* Budget HUD overlay */}
          <BudgetHUD
            remaining={remainingBudget}
            total={playerBudget}
            factionColor={factionColor}
          />

          {/* Tooltip overlay */}
          <StatTooltip
            asset={tooltipAsset}
            mousePos={tooltipMouse}
            containerRef={containerRef}
          />

          {/* Feedback message */}
          {message && (
            <div
              className="absolute top-12 left-1/2 z-30 pointer-events-none"
              style={{
                transform: 'translateX(-50%)',
                fontFamily: '"Courier New", monospace',
                fontSize: '12px',
                color: message.type === 'success' ? factionColor : '#00ff88',
                backgroundColor: 'rgba(10, 10, 20, 0.85)',
                border: `1px solid ${message.type === 'success' ? factionColor : 'rgba(0, 255, 136, 0.3)'}`,
                padding: '4px 16px',
                letterSpacing: '1px',
              }}
            >
              {message.text}
            </div>
          )}

          {/* Selected asset indicator */}
          {selectedAsset && (
            <div
              className="absolute bottom-2 left-1/2 z-20 pointer-events-none"
              style={{
                transform: 'translateX(-50%)',
                fontFamily: '"Courier New", monospace',
                fontSize: '11px',
                color: factionColor,
                backgroundColor: 'rgba(10, 10, 20, 0.85)',
                border: `1px solid ${factionColor}`,
                padding: '4px 12px',
                letterSpacing: '1px',
              }}
            >
              {isAirPlacementCategory(selectedAsset.category)
                ? `ASSIGNING STATION: ${selectedAsset.name} — CLICK A VALID STATION`
                : `PLACING: ${selectedAsset.name} — CLICK A VALID ZONE`}
            </div>
          )}
        </div>

        {/* Bottom bar — minimap, route selector, commence button */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            backgroundColor: 'rgba(10, 10, 20, 0.9)',
            borderTop: '1px solid rgba(0, 255, 136, 0.15)',
          }}
        >
          {/* Minimap */}
          <Minimap
            placements={placements}
            selectedRoute={isDefender ? null : primaryRoute}
            factionColor={factionColor}
          />

          {/* Tanker route allocation (attacker only) or spacer */}
          {!isDefender ? (
            <RouteSelector
              tankerAllocation={tankerAllocation}
              onUpdateAllocation={(allocation) =>
                placementDispatch({ type: 'SET_TANKER_ALLOCATION', allocation })
              }
              factionColor={factionColor}
            />
          ) : (
            <div />
          )}

          {/* Commence button + clear */}
          <div className="flex items-center gap-3">
            <button
              className="crt-button text-xs py-1 px-4"
              style={{ opacity: placements.length > 0 ? 0.7 : 0.3 }}
              disabled={placements.length === 0}
              onClick={() =>
                placementDispatch({ type: 'CLEAR_ALL', totalBudget: playerBudget })
              }
            >
              CLEAR ALL
            </button>
            <button
              className="crt-button py-2 px-8 font-bold tracking-wider"
              style={{
                borderColor: canCommence ? factionColor : 'rgba(0, 255, 136, 0.15)',
                color: canCommence ? factionColor : 'rgba(0, 255, 136, 0.2)',
                cursor: canCommence ? 'pointer' : 'default',
                opacity: canCommence ? 1 : 0.4,
                boxShadow: canCommence ? `0 0 12px ${factionColor}33` : 'none',
              }}
              disabled={!canCommence}
              onClick={handleCommence}
            >
              ▶ COMMENCE OPERATION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

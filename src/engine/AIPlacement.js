// AI Placement — intelligent asset placement across 4 difficulty tiers
// GDD Section 9.1

import { defenderEquipment } from '../data/defenderEquipment.js';
import { attackerEquipment } from '../data/attackerEquipment.js';
import { PLACEMENT_ZONES } from '../data/placementZones.js';
import { ROUTES } from '../data/mapData.js';

// ── Helpers ──────────────────────────────────────────────────────────

function shuffled(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function weightedPick(arr, weightFn, rng) {
  const weights = arr.map(weightFn);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total === 0) return pick(arr, rng);
  let r = rng() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

/** Build flat list of zone slots with accepted types and capacity */
function buildZoneSlots(zones) {
  const slots = [];
  for (const [groupKey, group] of Object.entries(zones)) {
    for (const slot of group.slots) {
      slots.push({
        ...slot,
        groupKey,
        types: group.types,
        capacity: slot.capacity || 1,
      });
    }
  }
  return slots;
}

/** Check if an asset category is valid for a slot */
function canPlace(slot, asset, zoneFill) {
  const fill = zoneFill[slot.id] || 0;
  return slot.types.includes(asset.category) && fill < slot.capacity;
}

/** Compute attacker zone positions from route waypoints */
function getAttackerPositions(wp) {
  return {
    convoy_lead: { x: wp[1].x + 36, y: wp[1].y },
    convoy_port: { x: wp[1].x, y: wp[1].y - 28 },
    convoy_starboard: { x: wp[1].x, y: wp[1].y + 28 },
    convoy_rear: { x: wp[1].x - 34, y: wp[1].y },
    convoy_center: { x: wp[1].x, y: wp[1].y },
    fwd_0: { x: wp[2].x, y: wp[2].y - 20 },
    fwd_1: { x: wp[2].x, y: wp[2].y + 20 },
    fwd_2: { x: wp[3].x, y: wp[3].y - 20 },
    fwd_3: { x: wp[3].x, y: wp[3].y + 20 },
    cap_0: { x: wp[4].x, y: wp[4].y - 70 },
    cap_1: { x: wp[7].x, y: wp[7].y - 65 },
    cap_2: { x: wp[6].x, y: wp[6].y - 55 },
    cap_3: { x: wp[9].x, y: wp[9].y - 50 },
    sub_0: { x: wp[4].x, y: wp[4].y + 50 },
    sub_1: { x: wp[8].x, y: wp[8].y - 55 },
    sub_2: { x: wp[6].x, y: wp[6].y + 58 },
  };
}

/** Place a single asset into a valid slot, returns placement or null */
function placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placementCount, rng, slotPreference) {
  const used = stockUsed[asset.id] || 0;
  if (used >= asset.maxStock) return null;

  let validSlots = zoneSlots.filter(s => canPlace(s, asset, zoneFill));
  if (validSlots.length === 0) return null;

  // Apply slot preference if provided
  if (slotPreference) {
    const preferred = validSlots.filter(slotPreference);
    if (preferred.length > 0) validSlots = preferred;
  }

  const slot = pick(validSlots, rng);
  const position = slot.relative
    ? (zonePositions[slot.id] || { x: 100, y: 300 })
    : { ...slot.position };

  stockUsed[asset.id] = used + 1;
  zoneFill[slot.id] = (zoneFill[slot.id] || 0) + 1;

  return {
    id: `ai_${placementCount}`,
    assetId: asset.id,
    zoneId: slot.id,
    position,
  };
}

// ── Route Selection ──────────────────────────────────────────────────

const ROUTE_KEYS = ['ALPHA', 'BRAVO', 'CHARLIE'];

function selectRouteAdvisory(rng) {
  return pick(ROUTE_KEYS, rng);
}

function selectRouteElevated(rng) {
  const weights = { ALPHA: 0.15, BRAVO: 0.45, CHARLIE: 0.40 };
  let r = rng();
  for (const key of ROUTE_KEYS) {
    r -= weights[key];
    if (r <= 0) return key;
  }
  return 'BRAVO';
}

function selectRouteSevere(rng) {
  const weights = { ALPHA: 0.10, BRAVO: 0.35, CHARLIE: 0.55 };
  let r = rng();
  for (const key of ROUTE_KEYS) {
    r -= weights[key];
    if (r <= 0) return key;
  }
  return 'CHARLIE';
}

function selectRouteCritical(rng) {
  const weights = { ALPHA: 0.05, BRAVO: 0.30, CHARLIE: 0.65 };
  let r = rng();
  for (const key of ROUTE_KEYS) {
    r -= weights[key];
    if (r <= 0) return key;
  }
  return 'CHARLIE';
}

// ── Difficulty Strategies ────────────────────────────────────────────

/**
 * ADVISORY — semi-random, 70-80% budget, no synergy consideration
 */
function placeAdvisory(aiFaction, budget, rng) {
  const equipment = aiFaction === 'DEFENDER' ? defenderEquipment : attackerEquipment;
  const zones = aiFaction === 'DEFENDER' ? PLACEMENT_ZONES.defender : PLACEMENT_ZONES.attacker;
  const targetSpend = budget * 0.75;

  const route = aiFaction === 'ATTACKER' ? selectRouteAdvisory(rng) : null;
  const zoneSlots = buildZoneSlots(zones);
  const zonePositions = {};
  if (route) Object.assign(zonePositions, getAttackerPositions(ROUTES[route].waypoints));

  const placements = [];
  const stockUsed = {};
  const zoneFill = {};
  let spent = 0;

  for (let attempts = 0; attempts < 200 && spent < targetSpend; attempts++) {
    const affordable = equipment.filter(e =>
      e.cost <= (budget - spent) && (stockUsed[e.id] || 0) < e.maxStock
    );
    if (affordable.length === 0) break;

    const asset = pick(affordable, rng);
    const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
    if (p) {
      placements.push(p);
      spent += asset.cost;
    }
  }

  return { placements, route };
}

/**
 * ELEVATED — basic strategic placement, 80-90% budget
 */
function placeElevated(aiFaction, budget, rng) {
  const equipment = aiFaction === 'DEFENDER' ? defenderEquipment : attackerEquipment;
  const zones = aiFaction === 'DEFENDER' ? PLACEMENT_ZONES.defender : PLACEMENT_ZONES.attacker;
  const targetSpend = budget * 0.85;

  const route = aiFaction === 'ATTACKER' ? selectRouteElevated(rng) : null;
  const zoneSlots = buildZoneSlots(zones);
  const zonePositions = {};
  if (route) Object.assign(zonePositions, getAttackerPositions(ROUTES[route].waypoints));

  const placements = [];
  const stockUsed = {};
  const zoneFill = {};
  let spent = 0;

  const byId = {};
  for (const e of equipment) byId[e.id] = e;

  if (aiFaction === 'DEFENDER') {
    // Ensure at least 1 radar
    const radar = byId['coastal_radar'];
    if (radar && radar.cost <= budget - spent) {
      const p = placeAsset(radar, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += radar.cost; }
    }

    // Place some missile batteries
    for (const id of shuffled(['noor_ashm', 'ghader_cruise', 'khalij_fars_asbm'], rng)) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // Place some naval assets
    for (const id of shuffled(['sina_corvette', 'thondar_fac', 'ghadir_sub'], rng)) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }
  } else {
    // Attacker: ensure at least 1 DDG or CG
    const ddg = byId['arleigh_burke_ddg'];
    if (ddg && ddg.cost <= budget - spent) {
      const p = placeAsset(ddg, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng,
        s => s.groupKey === 'convoy');
      if (p) { placements.push(p); spent += ddg.cost; }
    }

    // Fill convoy slots
    for (const id of shuffled(['perry_ffg', 'cyclone_pc', 'perry_ffg'], rng)) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng,
        s => s.groupKey === 'convoy');
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // At least 1 aerial asset
    const hornet = byId['fa18e_hornet'];
    if (hornet && hornet.cost <= budget - spent) {
      const p = placeAsset(hornet, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += hornet.cost; }
    }
  }

  // Fill remaining budget with weighted random
  for (let attempts = 0; attempts < 200 && spent < targetSpend; attempts++) {
    const affordable = equipment.filter(e =>
      e.cost <= (budget - spent) && (stockUsed[e.id] || 0) < e.maxStock
    );
    if (affordable.length === 0) break;

    const asset = weightedPick(affordable, e => e.cost, rng);
    const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
    if (p) {
      placements.push(p);
      spent += asset.cost;
    }
  }

  return { placements, route };
}

/**
 * SEVERE — optimized placement, 95-100% budget, radar+missile pairing
 */
function placeSevere(aiFaction, budget, rng) {
  const equipment = aiFaction === 'DEFENDER' ? defenderEquipment : attackerEquipment;
  const zones = aiFaction === 'DEFENDER' ? PLACEMENT_ZONES.defender : PLACEMENT_ZONES.attacker;
  const targetSpend = budget * 0.97;

  const route = aiFaction === 'ATTACKER' ? selectRouteSevere(rng) : null;
  const zoneSlots = buildZoneSlots(zones);
  const zonePositions = {};
  if (route) Object.assign(zonePositions, getAttackerPositions(ROUTES[route].waypoints));

  const placements = [];
  const stockUsed = {};
  const zoneFill = {};
  let spent = 0;

  const byId = {};
  for (const e of equipment) byId[e.id] = e;

  if (aiFaction === 'DEFENDER') {
    // 1. Radar stations first — maximize coverage
    for (const id of ['coastal_radar', 'coastal_radar', 'mobile_radar', 'mobile_radar']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // 2. Missile batteries
    for (const id of ['khalij_fars_asbm', 'ghader_cruise', 'ghader_cruise', 'noor_ashm', 'noor_ashm', 'noor_ashm']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // 3. Mine layer targeting central route
    const ml = byId['mine_layer'];
    if (ml && ml.cost <= budget - spent) {
      const p = placeAsset(ml, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng,
        s => s.groupKey === 'naval' && s.id === 'naval_1');
      if (p) { placements.push(p); spent += ml.cost; }
    }

    // 4. Naval assets
    for (const id of ['ghadir_sub', 'sina_corvette', 'thondar_fac', 'thondar_fac']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // 5. Aerial assets
    for (const id of ['su22_strike', 'shahed_136_swarm']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }
  } else {
    // Attacker SEVERE
    const mcm = byId['avenger_mcm'];
    if (mcm && mcm.cost <= budget - spent) {
      const p = placeAsset(mcm, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng,
        s => s.groupKey === 'forwardScreen');
      if (p) { placements.push(p); spent += mcm.cost; }
    }

    for (const id of ['arleigh_burke_ddg', 'ticonderoga_cg']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng,
        s => s.groupKey === 'convoy');
      if (p) { placements.push(p); spent += asset.cost; }
    }

    const ffg = byId['perry_ffg'];
    if (ffg && ffg.cost <= budget - spent) {
      const p = placeAsset(ffg, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng,
        s => s.groupKey === 'convoy');
      if (p) { placements.push(p); spent += ffg.cost; }
    }

    for (const id of ['mh60r_seahawk', 'los_angeles_ssn']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    const growler = byId['ea18g_growler'];
    if (growler && growler.cost <= budget - spent) {
      const p = placeAsset(growler, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += growler.cost; }
    }
  }

  // Fill remaining budget
  for (let attempts = 0; attempts < 200 && spent < targetSpend; attempts++) {
    const affordable = equipment.filter(e =>
      e.cost <= (budget - spent) && (stockUsed[e.id] || 0) < e.maxStock
    );
    if (affordable.length === 0) break;

    const asset = weightedPick(affordable, e => e.cost, rng);
    const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
    if (p) {
      placements.push(p);
      spent += asset.cost;
    }
  }

  return { placements, route };
}

/**
 * CRITICAL — near-optimal, 100% budget, adapted composition
 */
function placeCritical(aiFaction, budget, rng) {
  const equipment = aiFaction === 'DEFENDER' ? defenderEquipment : attackerEquipment;
  const zones = aiFaction === 'DEFENDER' ? PLACEMENT_ZONES.defender : PLACEMENT_ZONES.attacker;
  const targetSpend = budget * 0.99;

  const route = aiFaction === 'ATTACKER' ? selectRouteCritical(rng) : null;
  const zoneSlots = buildZoneSlots(zones);
  const zonePositions = {};
  if (route) Object.assign(zonePositions, getAttackerPositions(ROUTES[route].waypoints));

  const placements = [];
  const stockUsed = {};
  const zoneFill = {};
  let spent = 0;

  const byId = {};
  for (const e of equipment) byId[e.id] = e;

  if (aiFaction === 'DEFENDER') {
    // Max radar coverage
    for (const id of ['coastal_radar', 'coastal_radar', 'coastal_radar',
                       'mobile_radar', 'mobile_radar', 'mobile_radar', 'mobile_radar']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // Max missile batteries
    for (const id of ['khalij_fars_asbm', 'khalij_fars_asbm',
                       'ghader_cruise', 'ghader_cruise', 'ghader_cruise',
                       'noor_ashm', 'noor_ashm', 'noor_ashm', 'noor_ashm']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // Two mine layers
    for (let i = 0; i < 2; i++) {
      const asset = byId['mine_layer'];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // Subs for ambush
    for (let i = 0; i < 3; i++) {
      const asset = byId['ghadir_sub'];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // Mixed air: Su-22 + Shahed drones
    for (const id of ['su22_strike', 'su22_strike', 'shahed_136_swarm', 'shahed_136_swarm']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    // Naval — corvettes and FACs
    for (const id of ['sina_corvette', 'sina_corvette', 'thondar_fac', 'thondar_fac', 'thondar_fac']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }
  } else {
    // Attacker CRITICAL — full escort with EW, ASW, minesweeper
    for (const id of ['ea18g_growler', 'p8_poseidon']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    for (const id of ['avenger_mcm', 'los_angeles_ssn']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const slotPref = id === 'avenger_mcm' ? s => s.groupKey === 'forwardScreen' : undefined;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng, slotPref);
      if (p) { placements.push(p); spent += asset.cost; }
    }

    for (const id of ['arleigh_burke_ddg', 'arleigh_burke_ddg', 'ticonderoga_cg']) {
      const asset = byId[id];
      if (!asset || asset.cost > budget - spent || (stockUsed[asset.id] || 0) >= asset.maxStock) continue;
      const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng,
        s => s.groupKey === 'convoy');
      if (p) { placements.push(p); spent += asset.cost; }
    }

    const hornet = byId['fa18e_hornet'];
    if (hornet && hornet.cost <= budget - spent) {
      const p = placeAsset(hornet, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += hornet.cost; }
    }

    const seahawk = byId['mh60r_seahawk'];
    if (seahawk && seahawk.cost <= budget - spent) {
      const p = placeAsset(seahawk, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
      if (p) { placements.push(p); spent += seahawk.cost; }
    }
  }

  // Fill remaining budget
  for (let attempts = 0; attempts < 200 && spent < targetSpend; attempts++) {
    const affordable = equipment.filter(e =>
      e.cost <= (budget - spent) && (stockUsed[e.id] || 0) < e.maxStock
    );
    if (affordable.length === 0) break;

    const asset = weightedPick(affordable, e => e.cost, rng);
    const p = placeAsset(asset, zoneSlots, zoneFill, stockUsed, zonePositions, placements.length, rng);
    if (p) {
      placements.push(p);
      spent += asset.cost;
    }
  }

  return { placements, route };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Generate AI placements for the opposing faction.
 *
 * @param {string} aiFaction - 'DEFENDER' or 'ATTACKER'
 * @param {string} difficulty - 'ADVISORY' | 'ELEVATED' | 'SEVERE' | 'CRITICAL'
 * @param {number} budget - total AI budget
 * @param {Function} [rng] - optional RNG function (defaults to Math.random)
 * @returns {{ placements: Array, route: string|null }}
 */
export function generateAIPlacement(aiFaction, difficulty, budget, rng = Math.random) {
  switch (difficulty) {
    case 'ADVISORY':
      return placeAdvisory(aiFaction, budget, rng);
    case 'ELEVATED':
      return placeElevated(aiFaction, budget, rng);
    case 'SEVERE':
      return placeSevere(aiFaction, budget, rng);
    case 'CRITICAL':
      return placeCritical(aiFaction, budget, rng);
    default:
      return placeAdvisory(aiFaction, budget, rng);
  }
}

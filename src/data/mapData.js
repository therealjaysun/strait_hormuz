// Map geometry data — Strait of Hormuz
// Normalized coordinate system: 0-1000 (x) by 0-600 (y)
// West (Persian Gulf) = left, East (Gulf of Oman) = right
// North (Iran) = top, South (Oman/UAE) = bottom
// Traced from reference imagery and aligned against Strait_of_Hormuz-svg-en.svg.

export const MAP_BOUNDS = {
  width: 1000,
  height: 600,
};

// Iranian coastline — Charak/Lavan area through Bandar Abbas to Jask.
// Stays in the top ~15% of the map; closest to the top near Bandar Abbas.
export const iranianCoastline = [
  { x: 0, y: 92 },
  { x: 40, y: 86 },
  { x: 82, y: 80 },
  { x: 122, y: 74 },
  { x: 162, y: 72 },     // Charak / Bandar Aftab
  { x: 204, y: 72 },
  { x: 244, y: 76 },
  { x: 284, y: 84 },     // Bandar-e Lengeh
  { x: 322, y: 94 },
  { x: 360, y: 104 },
  { x: 394, y: 108 },
  { x: 428, y: 102 },
  { x: 460, y: 92 },     // Bandar-e Khamir approach
  { x: 490, y: 76 },
  { x: 516, y: 58 },
  { x: 542, y: 44 },
  { x: 568, y: 34 },     // Bostanu
  { x: 594, y: 26 },
  { x: 620, y: 20 },
  { x: 646, y: 18 },     // Bandar Abbas
  { x: 674, y: 22 },
  { x: 700, y: 30 },
  { x: 726, y: 42 },     // Hormoz coast
  { x: 752, y: 54 },
  { x: 780, y: 62 },
  { x: 810, y: 64 },
  { x: 842, y: 60 },
  { x: 876, y: 70 },
  { x: 908, y: 88 },
  { x: 938, y: 112 },
  { x: 964, y: 140 },
  { x: 986, y: 170 },
  { x: 1000, y: 188 },
];

// UAE / Omani coastline — Dubai/Sharjah through Musandam to Fujairah.
// Musandam tip reaches up to about y=205 (35% from top).
export const omaniCoastline = [
  { x: 0, y: 582 },
  { x: 74, y: 576 },
  { x: 148, y: 566 },
  { x: 220, y: 554 },
  { x: 292, y: 540 },
  { x: 356, y: 520 },
  { x: 412, y: 496 },
  { x: 460, y: 470 },
  { x: 500, y: 440 },    // UAE coast rising toward Ras al-Khaimah
  { x: 530, y: 404 },
  { x: 554, y: 364 },    // Ras Al-Khaimah
  { x: 574, y: 322 },
  { x: 590, y: 278 },
  { x: 602, y: 242 },
  { x: 612, y: 214 },
  { x: 620, y: 198 },    // Musandam hook tip
  { x: 626, y: 210 },
  { x: 632, y: 236 },
  { x: 638, y: 270 },
  { x: 640, y: 312 },
  { x: 638, y: 354 },
  { x: 644, y: 390 },    // Dibba / east side of Musandam
  { x: 660, y: 420 },
  { x: 684, y: 440 },    // Fujairah approach
  { x: 712, y: 450 },
  { x: 744, y: 448 },
  { x: 784, y: 436 },
  { x: 830, y: 420 },
  { x: 882, y: 402 },
  { x: 940, y: 386 },
  { x: 1000, y: 374 },
];

// Islands — polygons traced to match reference proportions.

// Qeshm — thin crescent parallel to and very close to the Iranian coast.
// North shore ~18 game-units below the mainland; island ~25 units wide N-S.
export const qeshmIsland = {
  name: 'Qeshm',
  center: { x: 542, y: 106 },
  points: [
    { x: 404, y: 122 },   // western tip
    { x: 434, y: 116 },
    { x: 466, y: 110 },
    { x: 500, y: 104 },
    { x: 536, y: 100 },
    { x: 572, y: 96 },
    { x: 608, y: 90 },
    { x: 640, y: 84 },
    { x: 668, y: 78 },
    { x: 688, y: 80 },    // eastern tip
    { x: 684, y: 90 },
    { x: 666, y: 98 },
    { x: 638, y: 104 },
    { x: 606, y: 110 },
    { x: 570, y: 116 },
    { x: 534, y: 120 },
    { x: 496, y: 124 },
    { x: 460, y: 128 },
    { x: 426, y: 130 },
    { x: 406, y: 126 },   // western tip (south edge)
  ],
};

// Hormuz — small roughly circular island just east of Qeshm's eastern tip.
export const hormuzIsland = {
  name: 'Hormuz',
  center: { x: 694, y: 74 },
  points: [
    { x: 682, y: 68 },
    { x: 694, y: 62 },
    { x: 708, y: 66 },
    { x: 716, y: 76 },
    { x: 710, y: 86 },
    { x: 696, y: 90 },
    { x: 684, y: 84 },
    { x: 678, y: 74 },
  ],
};

// Larak — further east in the strait.
export const larakIsland = {
  name: 'Larak',
  center: { x: 776, y: 106 },
  points: [
    { x: 762, y: 98 },
    { x: 776, y: 92 },
    { x: 792, y: 96 },
    { x: 800, y: 108 },
    { x: 794, y: 118 },
    { x: 778, y: 122 },
    { x: 764, y: 116 },
    { x: 758, y: 106 },
  ],
};

// Hengam — small island south of Qeshm's eastern end.
export const hengamIsland = {
  name: 'Hengam',
  center: { x: 658, y: 144 },
  points: [
    { x: 644, y: 138 },
    { x: 658, y: 134 },
    { x: 672, y: 138 },
    { x: 678, y: 146 },
    { x: 670, y: 154 },
    { x: 654, y: 154 },
    { x: 644, y: 146 },
  ],
};

// Greater Tunb — Iranian-held island in the central gulf.
export const greaterTunbIsland = {
  name: 'Greater Tunb',
  center: { x: 432, y: 286 },
  points: [
    { x: 404, y: 272 },
    { x: 414, y: 266 },
    { x: 424, y: 270 },
    { x: 428, y: 278 },
    { x: 422, y: 286 },
    { x: 412, y: 288 },
    { x: 404, y: 282 },
  ],
};

// Lesser Tunb — small island west of Greater Tunb.
export const lesserTunbIsland = {
  name: 'Lesser Tunb',
  center: { x: 396, y: 296 },
  points: [
    { x: 378, y: 280 },
    { x: 386, y: 276 },
    { x: 392, y: 280 },
    { x: 392, y: 288 },
    { x: 386, y: 292 },
    { x: 378, y: 288 },
  ],
};

// Abu Musa — larger Iranian-held island south of the Tunbs.
export const abuMusaIsland = {
  name: 'Abu Musa',
  center: { x: 342, y: 424 },
  points: [
    { x: 340, y: 404 },
    { x: 350, y: 396 },
    { x: 364, y: 398 },
    { x: 372, y: 406 },
    { x: 370, y: 418 },
    { x: 358, y: 424 },
    { x: 346, y: 422 },
    { x: 338, y: 412 },
  ],
};

// Siri — tiny island in the western gulf.
export const siriIsland = {
  name: 'Siri',
  center: { x: 238, y: 424 },
  points: [
    { x: 248, y: 382 },
    { x: 256, y: 378 },
    { x: 262, y: 382 },
    { x: 262, y: 390 },
    { x: 256, y: 394 },
    { x: 248, y: 390 },
  ],
};

export const islands = [
  qeshmIsland,
  hormuzIsland,
  larakIsland,
  hengamIsland,
  greaterTunbIsland,
  lesserTunbIsland,
  abuMusaIsland,
  siriIsland,
];

// Convoy routes — pass through the gap between the island chain and Musandam.
// Gap is approximately y=130 (Qeshm south shore) to y=205 (Musandam tip).
export const ROUTES = {
  ALPHA: {
    name: 'Route Alpha',
    description: 'Northern passage — close to the island chain, shorter but exposed',
    waypoints: [
      { x: 0, y: 210 },
      { x: 96, y: 206 },
      { x: 194, y: 198 },
      { x: 294, y: 188 },
      { x: 396, y: 176 },
      { x: 496, y: 164 },
      { x: 580, y: 154 },
      { x: 644, y: 150 },    // north lane inside the choke
      { x: 710, y: 156 },
      { x: 786, y: 170 },
      { x: 860, y: 184 },
      { x: 932, y: 198 },
      { x: 1000, y: 212 },
    ],
  },
  BRAVO: {
    name: 'Route Bravo',
    description: 'Central corridor — standard TSS outbound lane through the strait',
    waypoints: [
      { x: 0, y: 276 },
      { x: 98, y: 272 },
      { x: 196, y: 264 },
      { x: 296, y: 252 },
      { x: 396, y: 238 },
      { x: 494, y: 222 },
      { x: 578, y: 208 },
      { x: 642, y: 196 },    // central TSS thread
      { x: 706, y: 202 },
      { x: 784, y: 216 },
      { x: 862, y: 230 },
      { x: 932, y: 246 },
      { x: 1000, y: 262 },
    ],
  },
  CHARLIE: {
    name: 'Route Charlie',
    description: 'Southern passage — hugs Musandam, longer but defensible',
    waypoints: [
      { x: 0, y: 332 },
      { x: 96, y: 328 },
      { x: 194, y: 320 },
      { x: 292, y: 306 },
      { x: 392, y: 290 },
      { x: 488, y: 266 },
      { x: 568, y: 238 },
      { x: 626, y: 212 },    // south lane bends around Musandam
      { x: 694, y: 224 },
      { x: 778, y: 246 },
      { x: 860, y: 272 },
      { x: 934, y: 300 },
      { x: 1000, y: 330 },
    ],
  },
};

// Air launch sources — positioned on the expanded theater.
export const AIR_LAUNCH_SOURCES = {
  ATTACKER: {
    carrierGroup: {
      id: 'carrier_group',
      name: 'Carrier Group',
      position: { x: 920, y: 400 },
    },
    regionalAirbase: {
      id: 'regional_airbase',
      name: 'Fujairah Airbase',
      position: { x: 692, y: 448 },
    },
  },
  DEFENDER: {
    bandarAbbasWest: {
      id: 'bandar_abbas_west',
      name: 'Bandar Abbas Airfield',
      position: { x: 636, y: 14 },
    },
    bandarAbbasEast: {
      id: 'bandar_abbas_east',
      name: 'Jask Airfield',
      position: { x: 968, y: 144 },
    },
    qeshmLaunchSite: {
      id: 'qeshm_launch_site',
      name: 'Qeshm Launch Site',
      position: { x: 542, y: 110 },
    },
    larakLaunchSite: {
      id: 'larak_launch_site',
      name: 'Larak Launch Site',
      position: { x: 776, y: 108 },
    },
    coastalDroneSite: {
      id: 'coastal_drone_site',
      name: 'Bandar-e Lengeh Drone Site',
      position: { x: 284, y: 84 },
    },
  },
};

export function getAirLaunchSource(assetId, faction, zoneId, stationPosition = null) {
  if (faction === 'ATTACKER') {
    return assetId === 'p8_poseidon'
      ? AIR_LAUNCH_SOURCES.ATTACKER.regionalAirbase
      : AIR_LAUNCH_SOURCES.ATTACKER.carrierGroup;
  }

  if (assetId === 'su22_strike') {
    const useEasternField = (stationPosition?.x || 0) >= 780 || zoneId === 'aerial_3';
    return useEasternField
      ? AIR_LAUNCH_SOURCES.DEFENDER.bandarAbbasEast
      : AIR_LAUNCH_SOURCES.DEFENDER.bandarAbbasWest;
  }

  if (assetId === 'shahed_136_swarm') {
    if (zoneId === 'island_qeshm' || zoneId === 'aerial_0') {
      return AIR_LAUNCH_SOURCES.DEFENDER.qeshmLaunchSite;
    }
    if (zoneId === 'island_larak' || zoneId === 'island_hormuz' || zoneId === 'aerial_3') {
      return AIR_LAUNCH_SOURCES.DEFENDER.larakLaunchSite;
    }
    return AIR_LAUNCH_SOURCES.DEFENDER.coastalDroneSite;
  }

  return null;
}

// TSS lanes — run through the gap between the island chain and Musandam.
export const tssOutbound = {
  north: [
    { x: 70, y: 234 },
    { x: 220, y: 222 },
    { x: 378, y: 208 },
    { x: 516, y: 192 },
    { x: 642, y: 178 },
    { x: 764, y: 188 },
    { x: 882, y: 204 },
    { x: 1000, y: 224 },
  ],
  south: [
    { x: 70, y: 270 },
    { x: 220, y: 258 },
    { x: 378, y: 244 },
    { x: 516, y: 228 },
    { x: 642, y: 214 },
    { x: 764, y: 220 },
    { x: 882, y: 238 },
    { x: 1000, y: 260 },
  ],
};

export const tssInbound = {
  north: [
    { x: 60, y: 316 },
    { x: 200, y: 306 },
    { x: 360, y: 290 },
    { x: 500, y: 262 },
    { x: 626, y: 232 },
    { x: 748, y: 236 },
    { x: 868, y: 254 },
    { x: 1000, y: 286 },
  ],
  south: [
    { x: 60, y: 360 },
    { x: 200, y: 348 },
    { x: 360, y: 330 },
    { x: 500, y: 300 },
    { x: 626, y: 266 },
    { x: 748, y: 268 },
    { x: 868, y: 286 },
    { x: 1000, y: 322 },
  ],
};

// Depth contours
export const depthContours = [
  // Near Iranian coast / islands
  [
    { x: 0, y: 122 },
    { x: 180, y: 120 },
    { x: 360, y: 130 },
    { x: 520, y: 128 },
    { x: 660, y: 112 },
    { x: 800, y: 112 },
    { x: 1000, y: 146 },
  ],
  // Mid-strait deep channel
  [
    { x: 0, y: 230 },
    { x: 180, y: 224 },
    { x: 360, y: 208 },
    { x: 520, y: 192 },
    { x: 650, y: 178 },
    { x: 780, y: 182 },
    { x: 900, y: 196 },
    { x: 1000, y: 220 },
  ],
  // Near Musandam / Oman coast
  [
    { x: 0, y: 520 },
    { x: 180, y: 502 },
    { x: 360, y: 464 },
    { x: 500, y: 392 },
    { x: 590, y: 304 },
    { x: 640, y: 266 },
    { x: 720, y: 284 },
    { x: 860, y: 340 },
    { x: 1000, y: 400 },
  ],
];

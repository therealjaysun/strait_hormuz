// Map geometry data — Strait of Hormuz
// Normalized coordinate system: 0-1000 (x) by 0-600 (y)
// West (Persian Gulf) = left, East (Gulf of Oman) = right
// North (Iran) = top, South (Oman) = bottom

export const MAP_BOUNDS = {
  width: 1000,
  height: 600,
};

// Iranian coastline (northern shore) — polyline points
export const iranianCoastline = [
  { x: 0, y: 80 },
  { x: 60, y: 75 },
  { x: 120, y: 85 },
  { x: 180, y: 70 },
  { x: 240, y: 65 },
  { x: 300, y: 75 },
  { x: 340, y: 60 },
  { x: 380, y: 55 },
  { x: 420, y: 50 },
  { x: 460, y: 55 },
  { x: 500, y: 48 },
  { x: 540, y: 52 },
  { x: 580, y: 45 },
  { x: 620, y: 50 },
  { x: 660, y: 42 },
  { x: 700, y: 48 },
  { x: 740, y: 40 },
  { x: 780, y: 45 },
  { x: 820, y: 38 },
  { x: 860, y: 42 },
  { x: 900, y: 35 },
  { x: 940, y: 40 },
  { x: 1000, y: 45 },
];

// Omani / Musandam coastline (southern shore) — polyline points
export const omaniCoastline = [
  { x: 0, y: 560 },
  { x: 80, y: 555 },
  { x: 160, y: 550 },
  { x: 240, y: 545 },
  { x: 320, y: 540 },
  { x: 400, y: 535 },
  { x: 450, y: 530 },
  { x: 500, y: 520 },
  { x: 540, y: 510 },
  { x: 570, y: 490 },
  { x: 600, y: 460 },
  { x: 630, y: 430 },
  { x: 660, y: 400 },
  { x: 690, y: 380 },
  { x: 720, y: 360 },
  { x: 750, y: 350 },
  { x: 780, y: 340 },
  { x: 810, y: 330 },
  { x: 840, y: 320 },
  { x: 870, y: 310 },
  { x: 900, y: 300 },
  { x: 940, y: 290 },
  { x: 1000, y: 280 },
];

// Islands — polygon points (closed shapes)
export const qeshmIsland = {
  name: 'Qeshm',
  center: { x: 350, y: 130 },
  points: [
    { x: 260, y: 115 },
    { x: 300, y: 105 },
    { x: 340, y: 100 },
    { x: 380, y: 105 },
    { x: 420, y: 110 },
    { x: 440, y: 120 },
    { x: 430, y: 135 },
    { x: 400, y: 145 },
    { x: 360, y: 150 },
    { x: 320, y: 148 },
    { x: 280, y: 140 },
    { x: 260, y: 130 },
  ],
};

export const hormuzIsland = {
  name: 'Hormuz',
  center: { x: 480, y: 175 },
  points: [
    { x: 465, y: 160 },
    { x: 485, y: 155 },
    { x: 500, y: 165 },
    { x: 498, y: 185 },
    { x: 480, y: 195 },
    { x: 462, y: 185 },
    { x: 460, y: 170 },
  ],
};

export const larakIsland = {
  name: 'Larak',
  center: { x: 580, y: 190 },
  points: [
    { x: 567, y: 178 },
    { x: 585, y: 172 },
    { x: 598, y: 182 },
    { x: 595, y: 200 },
    { x: 578, y: 206 },
    { x: 564, y: 196 },
  ],
};

export const hengamIsland = {
  name: 'Hengam',
  center: { x: 440, y: 210 },
  points: [
    { x: 428, y: 200 },
    { x: 445, y: 195 },
    { x: 458, y: 204 },
    { x: 454, y: 220 },
    { x: 438, y: 225 },
    { x: 426, y: 215 },
  ],
};

export const islands = [qeshmIsland, hormuzIsland, larakIsland, hengamIsland];

// Convoy Routes — waypoint arrays (west to east)
export const ROUTES = {
  ALPHA: {
    name: 'Route Alpha',
    description: 'Northern passage — shorter but more exposed',
    waypoints: [
      { x: 0, y: 220 },
      { x: 100, y: 210 },
      { x: 200, y: 200 },
      { x: 300, y: 195 },
      { x: 400, y: 200 },
      { x: 500, y: 210 },
      { x: 600, y: 220 },
      { x: 700, y: 215 },
      { x: 800, y: 210 },
      { x: 900, y: 200 },
      { x: 1000, y: 195 },
    ],
  },
  BRAVO: {
    name: 'Route Bravo',
    description: 'Central passage — standard TSS outbound lane',
    waypoints: [
      { x: 0, y: 310 },
      { x: 100, y: 305 },
      { x: 200, y: 300 },
      { x: 300, y: 295 },
      { x: 400, y: 300 },
      { x: 500, y: 310 },
      { x: 600, y: 305 },
      { x: 700, y: 290 },
      { x: 800, y: 275 },
      { x: 900, y: 260 },
      { x: 1000, y: 245 },
    ],
  },
  CHARLIE: {
    name: 'Route Charlie',
    description: 'Southern passage — longer but more defensible',
    waypoints: [
      { x: 0, y: 420 },
      { x: 100, y: 415 },
      { x: 200, y: 410 },
      { x: 300, y: 405 },
      { x: 400, y: 400 },
      { x: 500, y: 390 },
      { x: 600, y: 370 },
      { x: 700, y: 340 },
      { x: 800, y: 310 },
      { x: 900, y: 290 },
      { x: 1000, y: 270 },
    ],
  },
};

// TSS (Traffic Separation Scheme) lanes — for visual reference
export const tssOutbound = {
  north: [
    { x: 0, y: 280 },
    { x: 1000, y: 220 },
  ],
  south: [
    { x: 0, y: 340 },
    { x: 1000, y: 260 },
  ],
};

export const tssInbound = {
  north: [
    { x: 0, y: 370 },
    { x: 1000, y: 280 },
  ],
  south: [
    { x: 0, y: 430 },
    { x: 1000, y: 300 },
  ],
};

// Depth contours — faint lines roughly parallel to coastlines
export const depthContours = [
  // Near Iranian coast
  [
    { x: 0, y: 130 },
    { x: 200, y: 120 },
    { x: 400, y: 110 },
    { x: 600, y: 105 },
    { x: 800, y: 100 },
    { x: 1000, y: 95 },
  ],
  // Mid-strait
  [
    { x: 0, y: 250 },
    { x: 200, y: 245 },
    { x: 400, y: 240 },
    { x: 600, y: 235 },
    { x: 800, y: 225 },
    { x: 1000, y: 215 },
  ],
  // Near Omani coast
  [
    { x: 0, y: 480 },
    { x: 200, y: 475 },
    { x: 400, y: 460 },
    { x: 600, y: 400 },
    { x: 800, y: 310 },
    { x: 1000, y: 270 },
  ],
];

// Game constants — from GDD Sections 5, 7.2.3, 7.2.4, 12

// Phase state machine
export const PHASES = {
  MENU: 'MENU',
  HOW_TO_PLAY: 'HOW_TO_PLAY',
  SETTINGS: 'SETTINGS',
  FACTION_SELECT: 'FACTION_SELECT',
  BRIEFING: 'BRIEFING',
  PLANNING: 'PLANNING',
  SIMULATION: 'SIMULATION',
  WAR_SCORE: 'WAR_SCORE',
  MAP_VIEWER: 'MAP_VIEWER',
};

// Factions
export const FACTIONS = {
  DEFENDER: 'DEFENDER',
  ATTACKER: 'ATTACKER',
};

// Difficulty tiers — GDD Section 2.3
export const DIFFICULTIES = {
  ADVISORY: 'ADVISORY',
  ELEVATED: 'ELEVATED',
  SEVERE: 'SEVERE',
  CRITICAL: 'CRITICAL',
};

export const DIFFICULTY_INFO = {
  ADVISORY: {
    name: 'Advisory',
    description: 'AI places assets semi-randomly with poor coverage; limited use of abilities',
  },
  ELEVATED: {
    name: 'Elevated',
    description: 'AI uses basic strategic placement; moderate ability usage',
  },
  SEVERE: {
    name: 'Severe',
    description: 'AI optimizes placement for maximum coverage/protection; aggressive ability usage',
  },
  CRITICAL: {
    name: 'Critical',
    description: 'AI uses near-optimal placement; full ability rotation; exploits weaknesses in player setup',
  },
};

// Budget per faction per difficulty — GDD Section 5
export const BUDGETS = {
  ADVISORY: { DEFENDER: 1500, ATTACKER: 2000 },
  ELEVATED: { DEFENDER: 1800, ATTACKER: 1800 },
  SEVERE: { DEFENDER: 2000, ATTACKER: 1600 },
  CRITICAL: { DEFENDER: 2200, ATTACKER: 1400 },
};

// Combat constants — GDD Sections 7.2.3, 7.2.4
export const COMBAT = {
  BASE_HIT_PROBABILITY: 0.80,
  EW_JAMMING_PENALTY: -0.30,
  FAST_MOVER_PENALTY: -0.10,
  FAST_MOVER_THRESHOLD: 100, // knots — above this, fast mover penalty applies
  CM_MITIGATION: { NONE: 0, BASIC: 0.20, ADVANCED: 0.40 },
  MINE_TRIGGER_RADIUS: 0.2, // nm
  MINE_DAMAGE: 150,
  MINESWEEPER_SONAR_RANGE: 3, // nm
  MINESWEEPER_CLEAR_RATE: 15, // seconds per mine
  MINES_PER_LAYER: 12,
};

// Simulation constants — GDD Section 11.3
export const SIMULATION = {
  TICK_RATE: 10, // ticks per second
  DEFAULT_SPEED: 1, // default speed multiplier
  SPEEDS: [1, 2, 4, 8],
  TIME_LIMIT: 1800, // 30 minutes game time in seconds
  TANKER_ESCAPE_THRESHOLD: 0.75, // 75% route progress counts as escaped at time limit
};

// Map / unit conversion
export const MAP = {
  WIDTH: 1000,
  HEIGHT: 600,
  STRAIT_WIDTH_NM: 21, // nautical miles at the narrows
  NM_TO_WORLD: 28.6, // ~600 / 21
};

// Scoring weights — GDD Section 8.2.6
export const SCORING = {
  OIL_OBJECTIVE_WEIGHT: 0.40,
  COST_EFFICIENCY_WEIGHT: 0.25,
  EXCHANGE_RATE_WEIGHT: 0.20,
  SURVIVAL_WEIGHT: 0.15,
};

// Letter grades — GDD Section 8.2.7
export const GRADES = [
  { min: 90, grade: 'S' },
  { min: 80, grade: 'A' },
  { min: 70, grade: 'B+' },
  { min: 60, grade: 'B' },
  { min: 50, grade: 'C+' },
  { min: 40, grade: 'C' },
  { min: 30, grade: 'D' },
  { min: 0, grade: 'F' },
];

// Ability definitions — GDD Section 7.3
export const ABILITIES = {
  DEFENDER: [
    {
      id: 'concentrate_fire',
      name: 'Concentrate Fire',
      cooldown: 60,
      requiresTarget: 'ENTITY',
      description: 'All assets in 10nm radius focus fire on target for 15s',
      effectRadius: 10, // nm
      effectDuration: 15, // seconds
    },
    {
      id: 'scramble_reserves',
      name: 'Scramble Reserves',
      cooldown: 120,
      requiresTarget: null,
      description: 'Deploy 2 Thondar FAC from random naval staging area',
    },
    {
      id: 'activate_decoys',
      name: 'Activate Decoys',
      cooldown: 90,
      requiresTarget: 'POINT',
      description: 'Spawn 3 radar decoys near selected area for 20s',
      effectDuration: 20,
      decoyCount: 3,
    },
  ],
  ATTACKER: [
    {
      id: 'emergency_evasion',
      name: 'Emergency Evasion',
      cooldown: 60,
      requiresTarget: 'TANKER',
      description: 'Tanker performs emergency turn, +50% CM for 15s',
      effectDuration: 15,
      cmBoost: 0.50,
    },
    {
      id: 'tomahawk_strike',
      name: 'Tomahawk Strike',
      cooldown: 120,
      requiresTarget: 'FIXED_EMPLACEMENT',
      description: 'Precision strike on visible emplacement. 200 damage. One use only.',
      damage: 200,
      maxUses: 1,
    },
    {
      id: 'smoke_screen',
      name: 'Smoke Screen',
      cooldown: 90,
      requiresTarget: 'POINT',
      description: 'Deploy smoke along 5nm segment. All assets gain LOW signature for 20s.',
      effectRadius: 5, // nm
      effectDuration: 20,
    },
  ],
};

// Detection delay by signature — seconds before confirmed
export const DETECTION_DELAY = {
  LOW: 3,
  MED: 1,
  HIGH: 0,
};

// Signature effective range multiplier
export const SIGNATURE_RANGE_MULTIPLIER = {
  LOW: 0.50,
  MED: 0.75,
  HIGH: 1.00,
};

// Vector icon renderer for all military asset types
// Each icon is a small geometric shape, colored by faction

const FACTION_COLORS = {
  DEFENDER: '#ff3333',
  ATTACKER: '#3399ff',
  TANKER: '#ffaa00',
};

/**
 * Draw a vector icon for the given asset type.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x — screen x
 * @param {number} y — screen y
 * @param {string} assetType — e.g. 'DESTROYER', 'SUBMARINE', 'MINE', etc.
 * @param {string} faction — 'DEFENDER', 'ATTACKER', or 'TANKER'
 * @param {number} rotation — radians, 0 = right
 * @param {number} scale
 * @param {object} options — { dimmed, selected, destroyed, winchester }
 */
export function drawAssetIcon(ctx, x, y, assetType, faction, rotation = 0, scale = 1, options = {}) {
  const { dimmed, selected, destroyed, winchester, hp, maxHp, showHeading } = options;
  const color = FACTION_COLORS[faction] || FACTION_COLORS.ATTACKER;

  ctx.save();
  ctx.translate(x, y);

  // Draw heading indicator before rotation (so it points in travel direction)
  if (showHeading && !destroyed && rotation !== 0) {
    ctx.save();
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12 * scale, 0);
    ctx.lineTo(18 * scale, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  // Determine alpha
  let alpha = 1.0;
  if (dimmed || winchester) alpha = 0.4;
  if (destroyed) alpha = 0.25;

  ctx.globalAlpha = alpha;

  // Glow for selected assets
  if (selected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;

  const drawer = ICON_DRAWERS[assetType] || drawDefaultIcon;
  drawer(ctx, color);

  // Destroyed overlay: X mark
  if (destroyed) {
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(6, 6);
    ctx.moveTo(6, -6);
    ctx.lineTo(-6, 6);
    ctx.stroke();
  }

  ctx.restore();

  // Health bar underneath (drawn in screen space, not rotated)
  if (hp !== undefined && maxHp && maxHp > 0 && !destroyed) {
    const hpPercent = Math.max(0, Math.min(1, hp / maxHp));
    if (hpPercent < 1) { // Only show when damaged
      const barWidth = 16 * scale;
      const barHeight = 2;
      const barX = x - barWidth / 2;
      const barY = y + 10 * scale;

      ctx.save();
      ctx.globalAlpha = 0.7;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Fill — green→yellow→red
      const hpColor = hpPercent > 0.6 ? '#00ff88'
        : hpPercent > 0.3 ? '#ffaa00' : '#ff3333';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

      ctx.restore();
    }
  }
}

// --- Icon drawing functions ---
// All draw at origin (0,0), roughly -10..+10 pixel range

function drawShipTriangle(ctx, size = 10) {
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.6, -size * 0.5);
  ctx.lineTo(-size * 0.6, size * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawDestroyer(ctx) {
  drawShipTriangle(ctx, 10);
}

function drawCruiser(ctx, color) {
  // CG: larger with double hull lines for distinction from DDG
  drawShipTriangle(ctx, 13);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-7, -3);
  ctx.lineTo(6, 0);
  ctx.moveTo(-7, 3);
  ctx.lineTo(6, 0);
  ctx.stroke();
}

function drawFrigate(ctx) {
  drawShipTriangle(ctx, 9);
}

function drawFastAttackCraft(ctx) {
  // Smaller, elongated triangle
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-5, -3);
  ctx.lineTo(-5, 3);
  ctx.closePath();
  ctx.fill();
}

function drawPatrolCraft(ctx) {
  // Very small triangle
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(-3, -2.5);
  ctx.lineTo(-3, 2.5);
  ctx.closePath();
  ctx.fill();
}

function drawSubmarine(ctx) {
  // Diamond/rhombus
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(0, -5);
  ctx.lineTo(-10, 0);
  ctx.lineTo(0, 5);
  ctx.closePath();
  ctx.fill();
}

function drawMinesweeper(ctx, color) {
  // Triangle with an arc in front (sweep indicator)
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fill();

  // Sweep arc
  ctx.beginPath();
  ctx.arc(9, 0, 5, -Math.PI / 3, Math.PI / 3, false);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCoastalMissileBattery(ctx) {
  // Square with upward-pointing arrow
  ctx.fillRect(-5, -5, 10, 10);

  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-3, -10);
  ctx.moveTo(0, -5);
  ctx.lineTo(3, -10);
  ctx.moveTo(0, -5);
  ctx.lineTo(0, -12);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawRadarStation(ctx, color) {
  // Circle with radiating lines
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  // Radiating lines
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 6, Math.sin(angle) * 6);
    ctx.lineTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
    ctx.stroke();
  }
}

function drawMineLayer(ctx, color) {
  // Triangle with dots behind
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();

  // Mine dots behind
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-8 - i * 4, (i - 1) * 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSeaMine(ctx) {
  // Small circle with spikes
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1;
  // Small spikes
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 4, Math.sin(angle) * 4);
    ctx.lineTo(Math.cos(angle) * 7, Math.sin(angle) * 7);
    ctx.stroke();
  }
}

function drawFighter(ctx) {
  // Chevron/arrowhead
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-4, -6);
  ctx.lineTo(-1, 0);
  ctx.lineTo(-4, 6);
  ctx.closePath();
  ctx.fill();
}

function drawHelicopter(ctx, color) {
  // X with a circle
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(6, 6);
  ctx.moveTo(6, -6);
  ctx.lineTo(-6, 6);
  ctx.stroke();
}

function drawDroneSwarm(ctx) {
  // Cluster of 3-4 tiny dots
  const positions = [
    { x: 0, y: -3 },
    { x: -3, y: 2 },
    { x: 3, y: 2 },
    { x: 0, y: 4 },
  ];
  for (const p of positions) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTanker(ctx) {
  // Large rectangle (barge shape)
  ctx.fillRect(-12, -5, 24, 10);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 1;
  ctx.strokeRect(-12, -5, 24, 10);
}

function drawEWAircraft(ctx, color) {
  // Chevron with wavy lines (jamming)
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-3, -5);
  ctx.lineTo(0, 0);
  ctx.lineTo(-3, 5);
  ctx.closePath();
  ctx.fill();

  // Wavy jamming lines
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const offsetX = -6 - i * 4;
    ctx.moveTo(offsetX, -4);
    ctx.quadraticCurveTo(offsetX - 1, -2, offsetX, 0);
    ctx.quadraticCurveTo(offsetX + 1, 2, offsetX, 4);
  }
  ctx.stroke();
}

function drawMaritimePatrol(ctx) {
  // Larger chevron
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-5, -7);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  ctx.fill();
}

function drawDefaultIcon(ctx) {
  // Fallback: simple circle
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
}

// Map asset types to drawer functions
const ICON_DRAWERS = {
  // Defender naval
  FAST_ATTACK_CRAFT: drawFastAttackCraft,
  FAC: drawFastAttackCraft,
  CORVETTE: drawFrigate,
  SUBMARINE: drawSubmarine,
  MINE_LAYER: drawMineLayer,

  // Defender fixed
  COASTAL_MISSILE: drawCoastalMissileBattery,
  COASTAL_MISSILE_BATTERY: drawCoastalMissileBattery,
  ASBM: drawCoastalMissileBattery,
  CRUISE_MISSILE: drawCoastalMissileBattery,
  RADAR: drawRadarStation,
  RADAR_STATION: drawRadarStation,
  COASTAL_RADAR: drawRadarStation,
  MOBILE_RADAR: drawRadarStation,

  // Defender aerial
  STRIKE_AIRCRAFT: drawFighter,
  DRONE: drawDroneSwarm,
  DRONE_SWARM: drawDroneSwarm,

  // Attacker naval
  DESTROYER: drawDestroyer,
  DDG: drawDestroyer,
  CRUISER: drawCruiser,
  CG: drawCruiser,
  FRIGATE: drawFrigate,
  FFG: drawFrigate,
  PATROL_CRAFT: drawPatrolCraft,
  PC: drawPatrolCraft,
  MINESWEEPER: drawMinesweeper,
  MCM: drawMinesweeper,
  SSN: drawSubmarine,

  // Attacker aerial
  FIGHTER: drawFighter,
  FA18: drawFighter,
  HELICOPTER: drawHelicopter,
  MH60R: drawHelicopter,
  MARITIME_PATROL: drawMaritimePatrol,
  P8: drawMaritimePatrol,
  EW_AIRCRAFT: drawEWAircraft,
  EA18G: drawEWAircraft,
  GROWLER: drawEWAircraft,

  // Environment
  SEA_MINE: drawSeaMine,
  MINE: drawSeaMine,

  // Tankers
  TANKER: drawTanker,
  VLCC: drawTanker,
  AFRAMAX: drawTanker,
};

/**
 * Get a list of all recognized asset type keys (for demo/testing).
 */
export const ASSET_TYPES = Object.keys(ICON_DRAWERS);

/**
 * Draw a legend grid of all asset icons (for development/testing).
 */
export function drawAssetLegend(ctx, startX, startY, faction = 'DEFENDER') {
  const uniqueDrawers = new Map();
  // Deduplicate by drawer function to show each unique icon once
  const representativeTypes = [
    'DESTROYER', 'CRUISER', 'FRIGATE', 'FAST_ATTACK_CRAFT', 'PATROL_CRAFT',
    'SUBMARINE', 'MINESWEEPER', 'COASTAL_MISSILE', 'RADAR', 'MINE_LAYER',
    'SEA_MINE', 'FIGHTER', 'HELICOPTER', 'DRONE_SWARM', 'TANKER',
    'EW_AIRCRAFT', 'MARITIME_PATROL',
  ];

  ctx.save();
  ctx.font = '9px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  let row = 0;
  const colWidth = 140;
  const rowHeight = 24;

  for (const type of representativeTypes) {
    const xPos = startX + (row % 2) * colWidth;
    const yPos = startY + Math.floor(row / 2) * rowHeight;

    const f = type === 'TANKER' ? 'TANKER' : faction;
    drawAssetIcon(ctx, xPos + 12, yPos, type, f, 0, 1);

    ctx.fillStyle = FACTION_COLORS[f] || '#00ff88';
    ctx.globalAlpha = 0.7;
    ctx.fillText(type, xPos + 26, yPos);
    ctx.globalAlpha = 1.0;

    row++;
  }

  ctx.restore();
}

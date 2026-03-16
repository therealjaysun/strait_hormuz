// HUDRenderer — canvas-based HUD overlays for the simulation view
// Health bars, entity labels, classification tags, WINCHESTER labels

import { MAP } from '../data/constants.js';
import { applyBloom, resetBloom } from './CRTEffects.js';

const MAP_W = MAP.WIDTH;
const MAP_H = MAP.HEIGHT;

const FACTION_COLORS = {
  DEFENDER: '#ff3333',
  ATTACKER: '#3399ff',
  TANKER: '#ffaa00',
};

const TYPE_LABELS = {
  SURFACE: 'SURFACE',
  SUBSURFACE: 'SUBSURFACE',
  AIR: 'AIR',
  TANKER: 'TANKER',
  MINE: 'MINE',
};

/**
 * Draw health bar above an entity.
 */
export function drawHealthBar(ctx, x, y, hp, maxHp, color, scale = 1) {
  const barWidth = 24 * scale;
  const barHeight = 3 * scale;
  const barX = x - barWidth / 2;
  const barY = y - 14 * scale;
  const ratio = Math.max(0, hp / maxHp);

  ctx.save();
  ctx.globalAlpha = 0.6;

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Health fill
  const fillColor = ratio > 0.5 ? color : ratio > 0.25 ? '#ffaa00' : '#ff3333';
  ctx.fillStyle = fillColor;
  ctx.fillRect(barX, barY, barWidth * ratio, barHeight);

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.restore();
}

/**
 * Draw entity name label.
 */
export function drawEntityLabel(ctx, x, y, name, color, scale = 1) {
  ctx.save();
  ctx.font = `${Math.max(7, 8 * scale)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.fillText(name, x, y + 12 * scale);
  ctx.restore();
}

/**
 * Draw classification label for detected enemy contacts.
 */
export function drawClassificationLabel(ctx, x, y, type, scale = 1) {
  const label = TYPE_LABELS[type] || 'UNKNOWN';
  ctx.save();
  ctx.font = `${Math.max(7, 8 * scale)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#00ff88';
  ctx.globalAlpha = 0.6;
  ctx.fillText(label, x, y - 16 * scale);
  ctx.restore();
}

/**
 * Draw WINCHESTER label for entities that have expended all ammo.
 */
export function drawWinchesterLabel(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.font = `bold ${Math.max(7, 8 * scale)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ffaa00';
  ctx.globalAlpha = 0.8;
  ctx.fillText('WINCHESTER', x, y - 18 * scale);
  ctx.restore();
}

export function drawMissionPhaseLabel(ctx, x, y, label, scale = 1) {
  ctx.save();
  ctx.font = `bold ${Math.max(7, 8 * scale)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#00ff88';
  ctx.globalAlpha = 0.75;
  ctx.fillText(label, x, y - 18 * scale);
  ctx.restore();
}

/**
 * Draw a blinking contact blip for detected enemies.
 */
export function drawContactBlip(ctx, x, y, time) {
  const blink = Math.sin(time * 0.006) * 0.5 + 0.5;
  ctx.save();
  ctx.globalAlpha = 0.3 + blink * 0.5;
  applyBloom(ctx, '#00ff88', 6);

  // Pulsing dot
  ctx.beginPath();
  ctx.arc(x, y, 3 + blink * 2, 0, Math.PI * 2);
  ctx.fillStyle = '#00ff88';
  ctx.fill();

  resetBloom(ctx);
  ctx.restore();
}

/**
 * Render all HUD elements for the simulation.
 */
export function renderEntityHUD(ctx, width, height, entities, playerFaction, time) {
  const scaleX = width / MAP_W;
  const scaleY = height / MAP_H;
  const scale = Math.min(scaleX, scaleY);

  for (const entity of entities) {
    const x = entity.position.x * scaleX;
    const y = entity.position.y * scaleY;
    const isFriendly = entity.faction === playerFaction;
    const isDetected = entity.detectedBy && entity.detectedBy.has(playerFaction);
    const color = entity.type === 'TANKER' ? FACTION_COLORS.TANKER : FACTION_COLORS[entity.faction];

    // Skip invisible entities
    if (entity.type === 'MINE') continue;
    if (!isFriendly && !isDetected && entity.type !== 'TANKER') continue;

    if (entity.isDestroyed) continue; // Wrecks get separate treatment

    // Tankers: always show health bar
    if (entity.type === 'TANKER') {
      drawHealthBar(ctx, x, y, entity.hp, entity.maxHp, FACTION_COLORS.TANKER, scale);
      drawEntityLabel(ctx, x, y, entity.name, FACTION_COLORS.TANKER, scale);
      continue;
    }

    // Friendly assets
    if (isFriendly) {
      if (entity.hp < entity.maxHp) {
        drawHealthBar(ctx, x, y, entity.hp, entity.maxHp, color, scale);
      }
      if (entity.type === 'AIR' && entity.missionPhase === 'TRANSIT') {
        drawMissionPhaseLabel(ctx, x, y, 'TRANSIT', scale);
      }
      if (entity.isWinchester) {
        drawWinchesterLabel(ctx, x, y, scale);
      }
    }

    // Detected enemies — classification + blip
    if (!isFriendly && isDetected) {
      drawContactBlip(ctx, x, y, time);
      if (entity.type === 'FIXED') {
        drawEntityLabel(ctx, x, y, entity.name, color, scale);
      } else {
        drawClassificationLabel(ctx, x, y, entity.type, scale);
      }
    }
  }
}

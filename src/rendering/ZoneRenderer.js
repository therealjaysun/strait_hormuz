// Placement zone renderer — draws pulsing zone outlines during Planning Phase
// Zones are faction-colored dashed rectangles/circles with capacity indicators

import { MAP_BOUNDS } from '../data/mapData.js';

const ZONE_COLORS = {
  DEFENDER: '#ff3333',
  ATTACKER: '#3399ff',
};

const ZONE_RADIUS = 18; // world units, visual radius for zone circles

/**
 * Draw all placement zones for a given faction.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width — screen width
 * @param {number} height — screen height
 * @param {number} time — animation timestamp (ms)
 * @param {string} faction — 'DEFENDER' or 'ATTACKER'
 * @param {Array} zones — array of zone slot objects (must include .types array)
 * @param {object} options — { hoveredZoneId, selectedAssetCategory, placedCounts: { zoneId: count } }
 */
export function drawPlacementZones(ctx, width, height, time, faction, zones, options = {}) {
  const { hoveredZoneId, selectedAssetCategory, placedCounts = {} } = options;
  const scaleX = width / MAP_BOUNDS.width;
  const scaleY = height / MAP_BOUNDS.height;
  const color = ZONE_COLORS[faction] || ZONE_COLORS.DEFENDER;
  const dimColor = 'rgba(100, 100, 100, 0.4)';

  // Pulsing opacity: sine wave between 0.3 and 0.8, ~2s period
  const pulse = 0.3 + 0.25 * (1 + Math.sin(time / 1000 * Math.PI));

  ctx.save();

  for (const zone of zones) {
    if (zone.relative) continue; // Skip relative (attacker convoy) zones for now

    const sx = zone.position.x * scaleX;
    const sy = zone.position.y * scaleY;
    const r = ZONE_RADIUS * Math.min(scaleX, scaleY);

    const isHovered = hoveredZoneId === zone.id;
    const capacity = zone.capacity || 1;
    const placed = placedCounts[zone.id] || 0;
    const isFull = placed >= capacity;

    // Check if this zone accepts the currently selected asset category
    const isCompatible = !selectedAssetCategory || (zone.types && zone.types.includes(selectedAssetCategory));

    // Determine opacity and color
    let opacity;
    let strokeColor;
    if (selectedAssetCategory && !isCompatible) {
      // Incompatible zone — grey, dim, no pulse
      opacity = 0.15;
      strokeColor = dimColor;
    } else if (selectedAssetCategory && isFull) {
      // Compatible but full — dim
      opacity = 0.2;
      strokeColor = color;
    } else if (isHovered && isCompatible) {
      opacity = 0.9;
      strokeColor = color;
    } else if (selectedAssetCategory && isCompatible) {
      // Compatible and available — pulse brighter to attract attention
      opacity = 0.4 + 0.35 * (1 + Math.sin(time / 800 * Math.PI));
      strokeColor = color;
    } else {
      opacity = pulse;
      strokeColor = color;
    }

    ctx.globalAlpha = opacity;

    // Draw zone circle outline
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = (isHovered && isCompatible) ? 2.5 : 1.5;
    ctx.setLineDash(isCompatible || !selectedAssetCategory ? [6, 4] : [3, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Fill for compatible zones when asset is selected
    if (selectedAssetCategory && isCompatible && !isFull) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.06;
      ctx.fill();
      ctx.globalAlpha = opacity;
    }

    // Capacity indicator
    ctx.globalAlpha = Math.min(opacity + 0.2, 1);
    ctx.fillStyle = strokeColor;
    ctx.font = `${Math.max(8, 9 * scaleX)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${placed}/${capacity}`, sx, sy + r + 3);

    // Zone label
    ctx.globalAlpha = selectedAssetCategory && !isCompatible ? 0.15 : 0.5;
    ctx.font = `${Math.max(7, 8 * scaleX)}px "Courier New", monospace`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(zone.label, sx, sy - r - 3);
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}

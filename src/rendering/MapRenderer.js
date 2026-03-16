// Static map renderer — coastlines, islands, depth contours, grid, TSS lanes, routes
// Renders to an offscreen canvas for caching; only redraws when dimensions change.

import {
  iranianCoastline,
  omaniCoastline,
  islands,
  depthContours,
  ROUTES,
  tssOutbound,
  tssInbound,
  MAP_BOUNDS,
} from '../data/mapData.js';
import { applyBloom, resetBloom } from './CRTEffects.js';

const COASTLINE_COLOR = '#00ff88';
const GRID_COLOR = '#112211';
const BG_COLOR = '#0a0a14';

let cachedCanvas = null;
let cachedWidth = 0;
let cachedHeight = 0;

// Cross-hatch fill pattern (created once)
let crossHatchPattern = null;

function getCrossHatchPattern(ctx) {
  if (crossHatchPattern) return crossHatchPattern;

  const size = 16;
  const pc = document.createElement('canvas');
  pc.width = size;
  pc.height = size;
  const pCtx = pc.getContext('2d');

  pCtx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
  pCtx.lineWidth = 1;
  // Diagonal lines at 45 degrees, 8px spacing
  for (let i = -size; i < size * 2; i += 8) {
    pCtx.beginPath();
    pCtx.moveTo(i, 0);
    pCtx.lineTo(i + size, size);
    pCtx.stroke();
  }

  crossHatchPattern = ctx.createPattern(pc, 'repeat');
  return crossHatchPattern;
}

/**
 * Convert world coordinates to screen coordinates.
 */
function toScreen(x, y, scaleX, scaleY) {
  return [x * scaleX, y * scaleY];
}

/**
 * Draw a polyline from an array of {x, y} points.
 */
function drawPolyline(ctx, points, scaleX, scaleY) {
  if (points.length < 2) return;
  ctx.beginPath();
  const [sx, sy] = toScreen(points[0].x, points[0].y, scaleX, scaleY);
  ctx.moveTo(sx, sy);
  for (let i = 1; i < points.length; i++) {
    const [px, py] = toScreen(points[i].x, points[i].y, scaleX, scaleY);
    ctx.lineTo(px, py);
  }
  ctx.stroke();
}

/**
 * Draw a filled + outlined polygon from an array of {x, y} points.
 */
function drawPolygon(ctx, points, scaleX, scaleY) {
  if (points.length < 3) return;
  ctx.beginPath();
  const [sx, sy] = toScreen(points[0].x, points[0].y, scaleX, scaleY);
  ctx.moveTo(sx, sy);
  for (let i = 1; i < points.length; i++) {
    const [px, py] = toScreen(points[i].x, points[i].y, scaleX, scaleY);
    ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// --- Individual layer renderers ---

function drawCoastlines(ctx, scaleX, scaleY) {
  ctx.save();

  // Iranian coastline
  // Fill land area above coastline
  ctx.fillStyle = 'rgba(0, 255, 136, 0.03)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (const p of iranianCoastline) {
    const [sx, sy] = toScreen(p.x, p.y, scaleX, scaleY);
    ctx.lineTo(sx, sy);
  }
  ctx.lineTo(MAP_BOUNDS.width * scaleX, 0);
  ctx.closePath();
  ctx.fill();

  // Omani coast land fill below coastline
  ctx.beginPath();
  const omLast = omaniCoastline[omaniCoastline.length - 1];
  ctx.moveTo(0, MAP_BOUNDS.height * scaleY);
  for (const p of omaniCoastline) {
    const [sx, sy] = toScreen(p.x, p.y, scaleX, scaleY);
    ctx.lineTo(sx, sy);
  }
  ctx.lineTo(MAP_BOUNDS.width * scaleX, MAP_BOUNDS.height * scaleY);
  ctx.closePath();
  ctx.fill();

  // Draw coastline strokes with glow
  applyBloom(ctx, COASTLINE_COLOR, 10);
  ctx.strokeStyle = COASTLINE_COLOR;
  ctx.lineWidth = 2;
  drawPolyline(ctx, iranianCoastline, scaleX, scaleY);
  drawPolyline(ctx, omaniCoastline, scaleX, scaleY);
  resetBloom(ctx);

  ctx.restore();
}

function drawIslands(ctx, scaleX, scaleY) {
  const pattern = getCrossHatchPattern(ctx);

  for (const island of islands) {
    ctx.save();

    // Fill with cross-hatch
    drawPolygon(ctx, island.points, scaleX, scaleY);
    ctx.fillStyle = pattern;
    ctx.fill();

    // Outline with glow
    applyBloom(ctx, COASTLINE_COLOR, 6);
    ctx.strokeStyle = COASTLINE_COLOR;
    ctx.lineWidth = 1.5;
    drawPolygon(ctx, island.points, scaleX, scaleY);
    ctx.stroke();
    resetBloom(ctx);

    // Label
    const [cx, cy] = toScreen(island.center.x, island.center.y, scaleX, scaleY);
    ctx.fillStyle = 'rgba(0, 255, 136, 0.6)';
    ctx.font = `${Math.max(9, 10 * scaleX)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    applyBloom(ctx, COASTLINE_COLOR, 4);
    ctx.fillText(island.name, cx, cy);
    resetBloom(ctx);

    ctx.restore();
  }
}

function drawDepthContours(ctx, scaleX, scaleY) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.08)';
  ctx.lineWidth = 0.5;
  for (const contour of depthContours) {
    drawPolyline(ctx, contour, scaleX, scaleY);
  }
  ctx.restore();
}

function drawGrid(ctx, scaleX, scaleY) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;

  const w = MAP_BOUNDS.width;
  const h = MAP_BOUNDS.height;
  const step = 50;

  // Vertical lines
  for (let x = 0; x <= w; x += step) {
    const sx = x * scaleX;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h * scaleY);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= h; y += step) {
    const sy = y * scaleY;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w * scaleX, sy);
    ctx.stroke();
  }

  // Coordinate labels
  ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
  ctx.font = `${Math.max(8, 9 * scaleX)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let x = 0; x <= w; x += 100) {
    ctx.fillText(String(x), x * scaleX, 2);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let y = 0; y <= h; y += 100) {
    ctx.fillText(String(y), 2, y * scaleY);
  }

  ctx.restore();
}

function drawTSSLanes(ctx, scaleX, scaleY) {
  ctx.save();

  // Outbound lane (active) — dashed
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
  ctx.lineWidth = 1;
  drawPolyline(ctx, [tssOutbound.north[0], tssOutbound.north[1]], scaleX, scaleY);
  drawPolyline(ctx, [tssOutbound.south[0], tssOutbound.south[1]], scaleX, scaleY);

  // Inbound lane (dimmed) — dashed
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
  drawPolyline(ctx, [tssInbound.north[0], tssInbound.north[1]], scaleX, scaleY);
  drawPolyline(ctx, [tssInbound.south[0], tssInbound.south[1]], scaleX, scaleY);

  // Median buffer — dotted
  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.12)';
  const medianNorth = {
    x: (tssOutbound.south[0].x + tssInbound.north[0].x) / 2,
    y: (tssOutbound.south[0].y + tssInbound.north[0].y) / 2,
  };
  const medianSouth = {
    x: (tssOutbound.south[1].x + tssInbound.north[1].x) / 2,
    y: (tssOutbound.south[1].y + tssInbound.north[1].y) / 2,
  };
  drawPolyline(ctx, [medianNorth, medianSouth], scaleX, scaleY);

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw convoy routes.
 * @param {string|Set|null} selectedRoutes - route key, Set of active route keys, or null
 */
function drawRoutes(ctx, scaleX, scaleY, selectedRoutes) {
  ctx.save();
  const routeColor = '#3399ff';

  // Normalize to a Set of active route keys
  let activeSet;
  if (selectedRoutes instanceof Set) {
    activeSet = selectedRoutes;
  } else if (typeof selectedRoutes === 'string') {
    activeSet = new Set([selectedRoutes]);
  } else {
    activeSet = new Set();
  }

  for (const [key, route] of Object.entries(ROUTES)) {
    const isActive = activeSet.has(key);

    if (isActive) {
      // Active route — solid with glow
      applyBloom(ctx, routeColor, 8);
      ctx.strokeStyle = routeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
    } else {
      // Inactive route — dashed, dimmed
      resetBloom(ctx);
      ctx.strokeStyle = 'rgba(51, 153, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 6]);
    }

    drawPolyline(ctx, route.waypoints, scaleX, scaleY);

    // Route label at the entry point (west edge)
    const labelPos = route.waypoints[0];
    const [lx, ly] = toScreen(labelPos.x + 10, labelPos.y - 12, scaleX, scaleY);
    ctx.fillStyle = isActive ? routeColor : 'rgba(51, 153, 255, 0.4)';
    ctx.font = `${Math.max(9, 10 * scaleX)}px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(route.name, lx, ly);
  }

  resetBloom(ctx);
  ctx.setLineDash([]);
  ctx.restore();
}

// Labels for geographic features
function drawLabels(ctx, scaleX, scaleY) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 255, 136, 0.25)';
  ctx.font = `${Math.max(10, 12 * scaleX)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Persian Gulf label (left side)
  ctx.fillText('PERSIAN GULF', 80 * scaleX, 350 * scaleY);

  // Gulf of Oman label (right side)
  ctx.fillText('GULF OF OMAN', 920 * scaleX, 200 * scaleY);

  // Strait of Hormuz label (center)
  ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
  ctx.font = `${Math.max(12, 14 * scaleX)}px "Courier New", monospace`;
  ctx.fillText('STRAIT OF HORMUZ', 500 * scaleX, 300 * scaleY);

  // Iran / Oman labels
  ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
  ctx.font = `${Math.max(10, 12 * scaleX)}px "Courier New", monospace`;
  ctx.fillText('IRAN', 500 * scaleX, 25 * scaleY);
  ctx.fillText('OMAN', 750 * scaleX, 450 * scaleY);
  ctx.fillText('MUSANDAM', 720 * scaleX, 340 * scaleY);

  ctx.restore();
}

/**
 * Render the static map layers to an offscreen canvas (cached).
 * Returns the offscreen canvas.
 */
export function getStaticMapCanvas(width, height) {
  if (cachedCanvas && cachedWidth === width && cachedHeight === height) {
    return cachedCanvas;
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');

  const scaleX = width / MAP_BOUNDS.width;
  const scaleY = height / MAP_BOUNDS.height;

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  // Draw layers in order (back to front)
  drawGrid(ctx, scaleX, scaleY);
  drawDepthContours(ctx, scaleX, scaleY);
  drawCoastlines(ctx, scaleX, scaleY);
  drawIslands(ctx, scaleX, scaleY);
  drawTSSLanes(ctx, scaleX, scaleY);
  drawLabels(ctx, scaleX, scaleY);

  cachedCanvas = offscreen;
  cachedWidth = width;
  cachedHeight = height;

  return offscreen;
}

/**
 * Draw the full map: static cached layer + dynamic routes.
 */
export function renderMap(ctx, width, height, selectedRoute = null) {
  // Blit static cached layers
  const staticMap = getStaticMapCanvas(width, height);
  ctx.drawImage(staticMap, 0, 0);

  // Draw dynamic routes on top
  const scaleX = width / MAP_BOUNDS.width;
  const scaleY = height / MAP_BOUNDS.height;
  drawRoutes(ctx, scaleX, scaleY, selectedRoute);
}

/**
 * Invalidate the static map cache (call on resize).
 */
export function invalidateMapCache() {
  cachedCanvas = null;
  cachedWidth = 0;
  cachedHeight = 0;
}

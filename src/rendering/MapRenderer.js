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

function traceSmoothPolyline(ctx, points, scaleX, scaleY) {
  if (points.length < 2) return;
  ctx.beginPath();
  const [startX, startY] = toScreen(points[0].x, points[0].y, scaleX, scaleY);
  ctx.moveTo(startX, startY);

  if (points.length === 2) {
    const [endX, endY] = toScreen(points[1].x, points[1].y, scaleX, scaleY);
    ctx.lineTo(endX, endY);
    return;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const [cx, cy] = toScreen(current.x, current.y, scaleX, scaleY);
    const [mx, my] = toScreen((current.x + next.x) / 2, (current.y + next.y) / 2, scaleX, scaleY);
    ctx.quadraticCurveTo(cx, cy, mx, my);
  }

  const last = points[points.length - 1];
  const [endX, endY] = toScreen(last.x, last.y, scaleX, scaleY);
  ctx.lineTo(endX, endY);
}

function strokeSmoothPolyline(ctx, points, scaleX, scaleY) {
  traceSmoothPolyline(ctx, points, scaleX, scaleY);
  ctx.stroke();
}

function getPointAlongPolyline(points, progress) {
  if (points.length < 2) return null;

  const segmentLengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(len);
    total += len;
  }

  let remaining = total * progress;
  for (let i = 1; i < points.length; i++) {
    const len = segmentLengths[i - 1];
    if (remaining <= len) {
      const t = len > 0 ? remaining / len : 0;
      const start = points[i - 1];
      const end = points[i];
      return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        angle: Math.atan2(end.y - start.y, end.x - start.x),
      };
    }
    remaining -= len;
  }

  const prev = points[points.length - 2];
  const end = points[points.length - 1];
  return {
    x: end.x,
    y: end.y,
    angle: Math.atan2(end.y - prev.y, end.x - prev.x),
  };
}

function drawArrowhead(ctx, point, angle, scaleX, scaleY, color, size = 8, alpha = 0.85) {
  const x = point.x * scaleX;
  const y = point.y * scaleY;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.55);
  ctx.lineTo(-size * 0.7, size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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
  strokeSmoothPolyline(ctx, iranianCoastline, scaleX, scaleY);
  strokeSmoothPolyline(ctx, omaniCoastline, scaleX, scaleY);
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

    if (!['Lesser Tunb', 'Siri'].includes(island.name)) {
      const [cx, cy] = toScreen(island.center.x, island.center.y, scaleX, scaleY);
      ctx.fillStyle = 'rgba(0, 255, 136, 0.48)';
      ctx.font = `${Math.max(8, 9 * scaleX)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      applyBloom(ctx, COASTLINE_COLOR, 3);
      ctx.fillText(island.name, cx, cy);
      resetBloom(ctx);
    }

    ctx.restore();
  }
}

function drawDepthContours(ctx, scaleX, scaleY) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)';
  ctx.lineWidth = 0.6;
  for (const contour of depthContours) {
    strokeSmoothPolyline(ctx, contour, scaleX, scaleY);
  }
  ctx.restore();
}

function drawGrid(ctx, scaleX, scaleY) {
  ctx.save();
  ctx.strokeStyle = 'rgba(17, 34, 17, 0.55)';
  ctx.lineWidth = 0.7;

  const w = MAP_BOUNDS.width;
  const h = MAP_BOUNDS.height;
  const step = 100;

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

  for (let x = 0; x <= w; x += 200) {
    ctx.fillText(String(x), x * scaleX, 2);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let y = 0; y <= h; y += 200) {
    ctx.fillText(String(y), 2, y * scaleY);
  }

  ctx.restore();
}

function drawTSSLanes(ctx, scaleX, scaleY) {
  ctx.save();

  // Outbound lane (active) — dashed
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.22)';
  ctx.lineWidth = 1;
  strokeSmoothPolyline(ctx, tssOutbound.north, scaleX, scaleY);
  strokeSmoothPolyline(ctx, tssOutbound.south, scaleX, scaleY);

  // Inbound lane (dimmed) — dashed
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.12)';
  strokeSmoothPolyline(ctx, tssInbound.north, scaleX, scaleY);
  strokeSmoothPolyline(ctx, tssInbound.south, scaleX, scaleY);

  // Median buffer — dotted
  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.12)';
  const median = tssOutbound.south.map((point, index) => ({
    x: (point.x + tssInbound.north[index].x) / 2,
    y: (point.y + tssInbound.north[index].y) / 2,
  }));
  strokeSmoothPolyline(ctx, median, scaleX, scaleY);

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
      ctx.lineWidth = 2.3;
      ctx.setLineDash([]);
    } else {
      // Inactive route — dashed, dimmed
      resetBloom(ctx);
      ctx.strokeStyle = 'rgba(51, 153, 255, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 8]);
    }

    strokeSmoothPolyline(ctx, route.waypoints, scaleX, scaleY);

    if (isActive) {
      const arrowA = getPointAlongPolyline(route.waypoints, 0.55);
      const arrowB = getPointAlongPolyline(route.waypoints, 0.8);
      if (arrowA) drawArrowhead(ctx, arrowA, arrowA.angle, scaleX, scaleY, routeColor, 7, 0.75);
      if (arrowB) drawArrowhead(ctx, arrowB, arrowB.angle, scaleX, scaleY, routeColor, 8, 0.9);
    }

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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const theaterLabels = [
    { text: 'PERSIAN GULF', x: 190, y: 372, alpha: 0.18, size: 13 },
    { text: 'GULF OF OMAN', x: 900, y: 300, alpha: 0.18, size: 13 },
    { text: 'STRAIT OF HORMUZ', x: 670, y: 182, alpha: 0.12, size: 13 },
    { text: 'IRAN', x: 430, y: 36, alpha: 0.18, size: 12 },
    { text: 'UAE', x: 240, y: 520, alpha: 0.16, size: 11 },
    { text: 'OMAN', x: 870, y: 394, alpha: 0.16, size: 11 },
    { text: 'MUSANDAM', x: 626, y: 296, alpha: 0.18, size: 9 },
    { text: 'BANDAR ABBAS', x: 704, y: 18, alpha: 0.26, size: 8 },
    { text: 'KHASAB', x: 618, y: 228, alpha: 0.24, size: 8 },
    { text: 'RAS AL-KHAIMAH', x: 548, y: 364, alpha: 0.22, size: 8 },
    { text: 'FUJAIRAH', x: 692, y: 438, alpha: 0.22, size: 8 },
  ];

  for (const label of theaterLabels) {
    ctx.fillStyle = `rgba(0, 255, 136, ${label.alpha})`;
    ctx.font = `${Math.max(9, label.size * scaleX)}px "Courier New", monospace`;
    ctx.fillText(label.text, label.x * scaleX, label.y * scaleY);
  }

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

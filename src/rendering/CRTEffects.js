// CRT post-processing effects for canvas rendering
// Scan lines, phosphor bloom, and radial vignette
// Phase 8: offscreen canvas caching for performance

let scanLinePattern = null;

// Cached vignette offscreen canvas
let vignetteCanvas = null;
let vignetteWidth = 0;
let vignetteHeight = 0;

/**
 * Create (or reuse) a cached scan-line pattern tile.
 * Pattern: 2px transparent, 2px semi-opaque black, repeating.
 */
function getScanLinePattern(ctx) {
  if (scanLinePattern) return scanLinePattern;

  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 4;
  patternCanvas.height = 4;
  const pCtx = patternCanvas.getContext('2d');

  // Transparent row (lines 0-1)
  // Opaque row (lines 2-3)
  pCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  pCtx.fillRect(0, 2, 4, 2);

  scanLinePattern = ctx.createPattern(patternCanvas, 'repeat');
  return scanLinePattern;
}

/**
 * Draw scan line overlay across the entire canvas.
 */
export function drawScanLines(ctx, width, height) {
  const pattern = getScanLinePattern(ctx);
  ctx.save();
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Get cached vignette canvas (rendered once, reused each frame).
 */
function getVignetteCanvas(width, height) {
  if (vignetteCanvas && vignetteWidth === width && vignetteHeight === height) {
    return vignetteCanvas;
  }

  vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = width;
  vignetteCanvas.height = height;
  vignetteWidth = width;
  vignetteHeight = height;

  const vCtx = vignetteCanvas.getContext('2d');
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.sqrt(cx * cx + cy * cy);

  const gradient = vCtx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

  vCtx.fillStyle = gradient;
  vCtx.fillRect(0, 0, width, height);

  return vignetteCanvas;
}

/**
 * Draw a radial vignette darkening the edges (cached offscreen canvas).
 */
export function drawVignette(ctx, width, height) {
  const cached = getVignetteCanvas(width, height);
  ctx.drawImage(cached, 0, 0);
}

/**
 * Apply phosphor bloom (glow) settings to context before drawing bright elements.
 * Call resetBloom() after drawing to clear.
 */
export function applyBloom(ctx, color = '#00ff88', blur = 8) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

/**
 * Reset bloom/glow settings.
 */
export function resetBloom(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/**
 * Full CRT post-processing pass — call after all map/asset rendering.
 */
export function applyCRTEffects(ctx, width, height) {
  drawScanLines(ctx, width, height);
  drawVignette(ctx, width, height);
}

/**
 * Invalidate cached vignette (call on window resize).
 */
export function invalidateCRTCache() {
  vignetteCanvas = null;
  vignetteWidth = 0;
  vignetteHeight = 0;
}

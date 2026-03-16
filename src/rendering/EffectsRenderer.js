// EffectsRenderer — visual effects for the simulation canvas
// GDD Section 10.1: missile trails, explosions, mine blasts, radar sweeps, contact blips, smoke, wrecks
// Phase 8 polish: two-phase explosions, bezier trails, refined radar sweeps, screen shake

import { MAP } from '../data/constants.js';
import { applyBloom, resetBloom } from './CRTEffects.js';

const NM_TO_WORLD = MAP.NM_TO_WORLD;
const MAP_W = MAP.WIDTH;
const MAP_H = MAP.HEIGHT;

// Effect durations in milliseconds
const EFFECT_DURATIONS = {
  MISSILE_TRAIL: 2500,
  EXPLOSION: 1500,
  MINE_BLAST: 2000,
  CONTACT_BLIP: 2000,
  TOMAHAWK_TRAIL: 1500,
  MISS_TEXT: 1100,
  HIT_BLOOM: 900,
};

const FACTION_COLORS = {
  DEFENDER: '#ff3333',
  ATTACKER: '#3399ff',
};

export default class EffectsManager {
  constructor() {
    this.activeEffects = [];
    this.radarAngles = new Map(); // entityId → current angle (radians)
    this.screenShake = 0; // remaining shake duration in ms
    this.screenShakeStart = 0;
    // Fog of war cached canvas
    this._fogCanvas = null;
    this._fogWidth = 0;
    this._fogHeight = 0;
  }

  /**
   * Add a new visual effect.
   */
  addEffect(type, data, delay = 0, durationOverride = null) {
    this.activeEffects.push({
      type,
      data,
      startTime: performance.now() + delay,
      duration: durationOverride || EFFECT_DURATIONS[type] || 1500,
    });
  }

  /**
   * Process engine events and spawn corresponding effects.
   */
  processEvents(events, processedCount) {
    for (let i = processedCount; i < events.length; i++) {
      const evt = events[i];
      switch (evt.type) {
        case 'WEAPON_FIRED':
          this.addEffect('MISSILE_TRAIL', {
            fromId: evt.data.attackerId,
            toId: evt.data.targetId,
            from: evt.data.attackerPosition,
            to: evt.data.targetPosition,
            color: FACTION_COLORS[evt.data.attackerFaction] || '#00ff88',
            hit: evt.data.hit,
          }, 0, evt.data.visualDurationMs);
          break;
        case 'COMBAT_HIT':
          this.addEffect('HIT_BLOOM', {
            position: evt.data.targetPosition,
            criticalHit: evt.data.criticalHit,
            destroyed: evt.data.destroyed,
          });
          break;
        case 'COMBAT_MISS':
          this.addEffect('MISS_TEXT', {
            position: evt.data.targetPosition,
            text: 'MISS',
          });
          break;
        case 'ASSET_DESTROYED': {
          // Size scaling: tankers 2x, small craft 0.5x
          let sizeMultiplier = 1;
          const assetId = evt.data.assetId || '';
          if (evt.data.type === 'TANKER') sizeMultiplier = 2;
          else if (['thondar_fac', 'cyclone_pc'].includes(assetId)) sizeMultiplier = 0.5;

          this.addEffect('EXPLOSION', {
            position: evt.data.position,
            size: (evt.data.maxHp ? Math.max(15, evt.data.maxHp / 5) : 20) * sizeMultiplier,
          });
          this.screenShake = 200;
          this.screenShakeStart = performance.now();
          break;
        }
        case 'MINE_DETONATION':
          this.addEffect('MINE_BLAST', {
            position: evt.data.position,
          });
          this.screenShake = 200;
          this.screenShakeStart = performance.now();
          break;
        case 'ABILITY_ACTIVATED':
          if (evt.data.abilityName === 'TOMAHAWK STRIKE') {
            this.addEffect('TOMAHAWK_TRAIL', {
              to: evt.data.targetPosition,
              from: { x: MAP_W, y: MAP_H * 0.3 },
            });
            this.addEffect('EXPLOSION', {
              position: evt.data.targetPosition,
              size: 30,
            });
          }
          break;
      }
    }
    return events.length;
  }

  /**
   * Update — remove expired effects.
   */
  update() {
    const now = performance.now();
    this.activeEffects = this.activeEffects.filter(e => {
      // Not yet started (delayed) — keep it
      if (now < e.startTime) return true;
      return now - e.startTime < e.duration;
    });
  }

  /**
   * Get screen shake offset (returns {x, y} pixel offset).
   */
  getScreenShakeOffset() {
    if (this.screenShake <= 0) return { x: 0, y: 0 };
    const now = performance.now();
    const elapsed = now - this.screenShakeStart;
    if (elapsed > this.screenShake) {
      this.screenShake = 0;
      return { x: 0, y: 0 };
    }
    const intensity = 2 * (1 - elapsed / this.screenShake);
    return {
      x: (Math.random() - 0.5) * intensity * 2,
      y: (Math.random() - 0.5) * intensity * 2,
    };
  }

  /**
   * Render all active effects.
   */
  render(ctx, width, height, entities, playerFaction, gameTime) {
    const scaleX = width / MAP_W;
    const scaleY = height / MAP_H;
    const now = performance.now();

    // Apply screen shake
    const shake = this.getScreenShakeOffset();
    if (shake.x !== 0 || shake.y !== 0) {
      ctx.save();
      ctx.translate(shake.x, shake.y);
    }

    // Radar sweeps removed — strait is fully covered, no visual benefit

    // Active effects
    for (const effect of this.activeEffects) {
      // Skip delayed effects that haven't started yet
      if (now < effect.startTime) continue;
      const progress = (now - effect.startTime) / effect.duration;
      switch (effect.type) {
        case 'MISSILE_TRAIL':
          this.drawMissileTrail(ctx, effect, progress, scaleX, scaleY, entities);
          break;
        case 'TOMAHAWK_TRAIL':
          this.drawTomahawkTrail(ctx, effect, progress, scaleX, scaleY);
          break;
        case 'EXPLOSION':
          this.drawExplosion(ctx, effect, progress, scaleX, scaleY);
          break;
        case 'MINE_BLAST':
          this.drawMineBlast(ctx, effect, progress, scaleX, scaleY);
          break;
        case 'CONTACT_BLIP':
          this.drawContactBlip(ctx, effect, progress, scaleX, scaleY);
          break;
        case 'MISS_TEXT':
          this.drawMissText(ctx, effect, progress, scaleX, scaleY);
          break;
        case 'HIT_BLOOM':
          this.drawHitBloom(ctx, effect, progress, scaleX, scaleY);
          break;
      }
    }

    if (shake.x !== 0 || shake.y !== 0) {
      ctx.restore();
    }
  }

  /**
   * Draw missile trail — quadratic bezier curve with fading tail.
   */
  drawMissileTrail(ctx, effect, progress, scaleX, scaleY, entities) {
    const { color, hit } = effect.data;
    const from = effect.data.from;
    const to = effect.data.to;

    if (!from || !to) return;

    const x1 = from.x * scaleX;
    const y1 = from.y * scaleY;
    const x2 = to.x * scaleX;
    const y2 = to.y * scaleY;

    // Bezier control point — slight arc perpendicular to line
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;
    const arcAmount = len * 0.15; // 15% arc
    const cpx = mx + (-dy / len) * arcAmount;
    const cpy = my + (dx / len) * arcAmount;

    ctx.save();

    // Trail head moves from attacker to target
    const headProgress = Math.min(1, progress);
    const tailProgress = Math.max(0, progress - 0.18);

    // Sample points on the bezier for head and tail
    const hx = bezierPoint(x1, cpx, x2, headProgress);
    const hy = bezierPoint(y1, cpy, y2, headProgress);
    const tx = bezierPoint(x1, cpx, x2, tailProgress);
    const ty = bezierPoint(y1, cpy, y2, tailProgress);

    const gradient = ctx.createLinearGradient(tx, ty, hx, hy);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.8, color);
    gradient.addColorStop(1, '#ffffff');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1 - progress * 0.5;
    applyBloom(ctx, color, 6);

    // Draw bezier segment
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    // Approximate the bezier segment with a quadratic curve
    const midT = (headProgress + tailProgress) / 2;
    const midCpx = bezierPoint(x1, cpx, x2, midT);
    const midCpy = bezierPoint(y1, cpy, y2, midT);
    ctx.quadraticCurveTo(midCpx, midCpy, hx, hy);
    ctx.stroke();

    // Bright head point
    ctx.beginPath();
    ctx.arc(hx, hy, 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 1 - progress * 0.3;
    ctx.fill();

    // Launch puff at start
    if (progress < 0.2) {
      const puffAlpha = (0.2 - progress) / 0.2;
      const puffRadius = 3 + progress * 15;
      ctx.beginPath();
      ctx.arc(x1, y1, puffRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 200, 200, 0.15)';
      ctx.globalAlpha = puffAlpha * 0.4;
      ctx.fill();
    }

    // Impact flash on hit
    if (hit && headProgress >= 0.95 && progress < 1) {
      ctx.beginPath();
      ctx.arc(x2, y2, 4 + (1 - progress) * 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = (1 - progress) * 0.45;
      ctx.fill();
    }

    resetBloom(ctx);
    ctx.restore();
  }

  /**
   * Draw tomahawk trail — long-range missile from edge of map.
   */
  drawTomahawkTrail(ctx, effect, progress, scaleX, scaleY) {
    const { from, to } = effect.data;
    const x1 = from.x * scaleX;
    const y1 = from.y * scaleY;
    const x2 = to.x * scaleX;
    const y2 = to.y * scaleY;

    ctx.save();
    const headProgress = Math.min(1, progress * 1.5);
    const hx = x1 + (x2 - x1) * headProgress;
    const hy = y1 + (y2 - y1) * headProgress;

    ctx.strokeStyle = '#3399ff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1 - progress * 0.6;
    ctx.setLineDash([8, 4]);
    applyBloom(ctx, '#3399ff', 10);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    ctx.setLineDash([]);
    resetBloom(ctx);
    ctx.restore();
  }

  /**
   * Draw explosion — two-phase animation: flash then expand with radial lines.
   */
  drawExplosion(ctx, effect, progress, scaleX, scaleY) {
    const { position, size } = effect.data;
    if (!position) return;
    const x = position.x * scaleX;
    const y = position.y * scaleY;
    const maxRadius = (size || 20) * Math.min(scaleX, scaleY) * 0.5;

    ctx.save();

    // Phase 1: Flash (0-0.2) — bright center expands, white → orange
    if (progress < 0.2) {
      const flashProgress = progress / 0.2;
      const flashRadius = maxRadius * 0.4 * flashProgress;
      // White-to-orange color shift
      const r = 255;
      const g = Math.round(255 - flashProgress * 105); // 255→150
      const b = Math.round(255 - flashProgress * 255); // 255→0
      const flashColor = `rgb(${r}, ${g}, ${b})`;

      ctx.beginPath();
      ctx.arc(x, y, flashRadius, 0, Math.PI * 2);
      ctx.fillStyle = flashColor;
      ctx.globalAlpha = (1 - flashProgress * 0.3) * 0.9;
      applyBloom(ctx, '#ff6600', 20);
      ctx.fill();
      resetBloom(ctx);
    }

    // Phase 2: Expand (0.2-1.0) — ring + radial lines, orange → red → dim
    if (progress >= 0.2) {
      const expandProgress = (progress - 0.2) / 0.8;
      const radius = maxRadius * (0.4 + expandProgress * 0.6);
      const alpha = 1 - expandProgress;

      // Color shift: orange → red → dim red
      const phaseColor = expandProgress < 0.4 ? '#ff6600'
        : expandProgress < 0.7 ? '#ff2200' : '#881100';

      // Expanding ring
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = phaseColor;
      ctx.lineWidth = 2.5 - expandProgress;
      ctx.globalAlpha = alpha * 0.8;
      applyBloom(ctx, phaseColor, 8);
      ctx.stroke();

      // Radial lines (8-12) with varying lengths and slight rotation
      const numLines = 10;
      const rotOffset = expandProgress * 0.3; // slight rotation as they expand
      ctx.lineWidth = 1;
      ctx.globalAlpha = alpha * 0.6;
      for (let i = 0; i < numLines; i++) {
        const a = (i / numLines) * Math.PI * 2 + rotOffset;
        // Vary line length pseudo-randomly per line
        const lengthFactor = 0.7 + (((i * 7 + 3) % 5) / 5) * 0.6;
        const innerR = radius * 0.2;
        const outerR = radius * lengthFactor;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * innerR, y + Math.sin(a) * innerR);
        ctx.lineTo(x + Math.cos(a) * outerR, y + Math.sin(a) * outerR);
        ctx.stroke();
      }

      resetBloom(ctx);
    }

    ctx.restore();
  }

  drawMissText(ctx, effect, progress, scaleX, scaleY) {
    const { position, text } = effect.data;
    if (!position) return;
    const x = position.x * scaleX + 12;
    const y = position.y * scaleY - 10 - progress * 10;

    ctx.save();
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d6d6d6';
    ctx.globalAlpha = 1 - progress;
    applyBloom(ctx, '#ffffff', 4);
    ctx.fillText(text || 'MISS', x, y);
    resetBloom(ctx);
    ctx.restore();
  }

  drawHitBloom(ctx, effect, progress, scaleX, scaleY) {
    const { position, criticalHit, destroyed } = effect.data;
    if (!position) return;
    const x = position.x * scaleX;
    const y = position.y * scaleY;
    const maxRadius = (destroyed ? 38 : criticalHit ? 28 : 18) * Math.min(scaleX, scaleY);

    ctx.save();
    const radius = maxRadius * (0.25 + progress * 0.95);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(120, 0, 12, 0.95)');
    gradient.addColorStop(0.45, 'rgba(92, 0, 8, 0.55)');
    gradient.addColorStop(1, 'rgba(32, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 1 - progress;
    applyBloom(ctx, '#7a0010', criticalHit || destroyed ? 24 : 16);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    resetBloom(ctx);
    ctx.restore();
  }

  /**
   * Draw mine detonation — large expanding concentric rings.
   */
  drawMineBlast(ctx, effect, progress, scaleX, scaleY) {
    const { position } = effect.data;
    if (!position) return;
    const x = position.x * scaleX;
    const y = position.y * scaleY;
    const maxRadius = 30 * Math.min(scaleX, scaleY);

    ctx.save();
    const alpha = 1 - progress;
    applyBloom(ctx, '#ff6600', 12);

    // Two concentric rings
    for (let ring = 0; ring < 2; ring++) {
      const ringProgress = Math.min(1, progress * 2 - ring * 0.3);
      if (ringProgress < 0) continue;

      const radius = maxRadius * ringProgress;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 3 - ring;
      ctx.globalAlpha = alpha * (1 - ring * 0.4);
      ctx.stroke();
    }

    // Water splash effect — jagged circle
    if (progress < 0.5) {
      ctx.beginPath();
      const splashRadius = maxRadius * progress * 0.6;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const jag = 1 + Math.sin(a * 5 + progress * 20) * 0.3;
        const r = splashRadius * jag;
        if (a === 0) ctx.moveTo(x + r, y);
        else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = '#ff6600';
      ctx.globalAlpha = (0.5 - progress) * 0.6;
      ctx.fill();
    }

    resetBloom(ctx);
    ctx.restore();
  }

  /**
   * Draw contact detection blip — 3 concentric pulsing rings + center dot.
   */
  drawContactBlip(ctx, effect, progress, scaleX, scaleY) {
    const { position } = effect.data;
    if (!position) return;
    const x = position.x * scaleX;
    const y = position.y * scaleY;

    ctx.save();

    // Pulsing center dot
    const pulseAlpha = 0.6 + 0.4 * Math.sin(progress * Math.PI * 4);
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff88';
    ctx.globalAlpha = (1 - progress) * pulseAlpha;
    ctx.fill();

    // 3 expanding concentric rings
    for (let ring = 0; ring < 3; ring++) {
      const ringProgress = Math.min(1, progress * 3 - ring * 0.3);
      if (ringProgress < 0) continue;
      ctx.beginPath();
      ctx.arc(x, y, 5 + ringProgress * 15, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1;
      ctx.globalAlpha = (1 - ringProgress) * 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw radar sweep arcs for friendly radar-equipped entities.
   * Sweep speed: 2π / (radarRange / 20) seconds per revolution.
   */
  renderRadarSweeps(ctx, scaleX, scaleY, entities, playerFaction, gameTime) {
    ctx.save();

    for (const entity of entities) {
      if (entity.isDestroyed) continue;
      if (entity.faction !== playerFaction) continue;
      if (!entity.radarRange || entity.radarRange === 0) continue;

      const x = entity.position.x * scaleX;
      const y = entity.position.y * scaleY;
      const rangeWU = entity.radarRange * NM_TO_WORLD;
      const radiusScreen = rangeWU * Math.min(scaleX, scaleY);

      // Sweep speed: larger range = slower, more dramatic
      // Formula: 2π / (radarRange / 20) seconds per revolution
      const revolutionTime = entity.radarRange / 20; // seconds
      const sweepSpeed = (Math.PI * 2) / Math.max(1, revolutionTime);

      if (!this.radarAngles.has(entity.id)) {
        this.radarAngles.set(entity.id, 0);
      }
      let angle = this.radarAngles.get(entity.id);
      angle += sweepSpeed * 0.016; // ~60fps
      if (angle > Math.PI * 2) angle -= Math.PI * 2;
      this.radarAngles.set(entity.id, angle);

      // Sweep arc — 30-degree wedge with fading trail
      const arcWidth = Math.PI / 6; // 30 degrees

      // Gradient fill for the sweep wedge (fading from leading edge)
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, radiusScreen, angle - arcWidth, angle, false);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
      ctx.fill();

      // Leading sweep line (brighter)
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(angle) * radiusScreen,
        y + Math.sin(angle) * radiusScreen
      );
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Trailing sweep line (dimmer)
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(angle - arcWidth) * radiusScreen,
        y + Math.sin(angle - arcWidth) * radiusScreen
      );
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Range circle (very faint)
      ctx.beginPath();
      ctx.arc(x, y, radiusScreen, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.06)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw smoke screen zones.
   */
  renderSmokeZones(ctx, scaleX, scaleY, smokeZones, gameTime) {
    if (!smokeZones || smokeZones.length === 0) return;

    ctx.save();
    for (const zone of smokeZones) {
      const x = zone.position.x * scaleX;
      const y = zone.position.y * scaleY;
      const radius = zone.radius * Math.min(scaleX, scaleY);
      const timeLeft = zone.expiresAt - gameTime;
      const alpha = Math.min(1, timeLeft / 5) * 0.25;

      // Multiple overlapping circles for cloud effect
      for (let i = 0; i < 5; i++) {
        const offsetAngle = (i / 5) * Math.PI * 2 + gameTime * 0.1;
        const offsetDist = radius * 0.2;
        const cx = x + Math.cos(offsetAngle) * offsetDist;
        const cy = y + Math.sin(offsetAngle) * offsetDist;

        ctx.beginPath();
        ctx.arc(cx, cy, radius * (0.6 + i * 0.1), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(136, 136, 136, ${alpha})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /**
   * Draw fog of war overlay — dim areas outside friendly radar coverage.
   * Uses cached offscreen canvas for performance.
   */
  renderFogOfWar(ctx, width, height, entities, playerFaction) {
    // Reuse or create fog canvas
    if (!this._fogCanvas || this._fogWidth !== width || this._fogHeight !== height) {
      this._fogCanvas = document.createElement('canvas');
      this._fogCanvas.width = width;
      this._fogCanvas.height = height;
      this._fogWidth = width;
      this._fogHeight = height;
    }

    const fogCtx = this._fogCanvas.getContext('2d');

    // Clear and fill with dark overlay
    fogCtx.clearRect(0, 0, width, height);
    fogCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    fogCtx.fillRect(0, 0, width, height);

    // Cut out circles for each friendly radar entity
    fogCtx.globalCompositeOperation = 'destination-out';

    const scaleX = width / MAP_W;
    const scaleY = height / MAP_H;

    for (const entity of entities) {
      if (entity.isDestroyed) continue;
      if (entity.faction !== playerFaction) continue;
      if (!entity.radarRange || entity.radarRange === 0) continue;

      const x = entity.position.x * scaleX;
      const y = entity.position.y * scaleY;
      const rangeWU = entity.radarRange * NM_TO_WORLD;
      const radiusScreen = rangeWU * Math.min(scaleX, scaleY);

      // Soft-edge cutout
      const gradient = fogCtx.createRadialGradient(x, y, radiusScreen * 0.7, x, y, radiusScreen);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      fogCtx.fillStyle = gradient;
      fogCtx.beginPath();
      fogCtx.arc(x, y, radiusScreen, 0, Math.PI * 2);
      fogCtx.fill();
    }

    fogCtx.globalCompositeOperation = 'source-over';

    // Blit fog onto main canvas
    ctx.save();
    ctx.drawImage(this._fogCanvas, 0, 0);
    ctx.restore();
  }
}

/**
 * Quadratic bezier point at t.
 */
function bezierPoint(p0, p1, p2, t) {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

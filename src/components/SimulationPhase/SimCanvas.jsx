// SimCanvas — 60fps canvas renderer for the simulation phase
// Reads engine state directly via ref for performance (not through React state)

import { useRef, useEffect, useCallback } from 'react';
import { MAP } from '../../data/constants.js';
import { getStaticMapCanvas } from '../../rendering/MapRenderer.js';
import { drawAssetIcon } from '../../rendering/AssetRenderer.js';
import { applyCRTEffects, invalidateCRTCache } from '../../rendering/CRTEffects.js';
import { renderEntityHUD } from '../../rendering/HUDRenderer.js';
import EffectsManager from '../../rendering/EffectsRenderer.js';

const MAP_W = MAP.WIDTH;
const MAP_H = MAP.HEIGHT;

const FACTION_COLORS = {
  DEFENDER: '#ff3333',
  ATTACKER: '#3399ff',
  TANKER: '#ffaa00',
};

// Map equipment category → asset icon type
function getIconType(entity) {
  if (entity.type === 'TANKER') return 'TANKER';
  if (entity.isMine) return 'MINE';
  if (entity.isDecoy) return 'FAST_ATTACK_CRAFT';

  const catMap = {
    COASTAL_MISSILE: 'COASTAL_MISSILE',
    RADAR: 'RADAR',
    MINE_LAYER: 'MINE_LAYER',
    AERIAL: entity.assetId === 'mh60r_seahawk' ? 'HELICOPTER'
      : entity.assetId === 'p8_poseidon' ? 'MARITIME_PATROL'
      : entity.assetId === 'su22_strike' ? 'STRIKE_AIRCRAFT'
      : 'FIGHTER',
    DRONE: 'DRONE_SWARM',
    EW: 'EW_AIRCRAFT',
    ESCORT: entity.assetId === 'arleigh_burke_ddg' ? 'DESTROYER'
          : entity.assetId === 'ticonderoga_cg' ? 'CRUISER'
          : entity.assetId === 'perry_ffg' ? 'FRIGATE'
          : entity.assetId === 'cyclone_pc' ? 'PATROL_CRAFT'
          : 'DESTROYER',
    MCM: 'MINESWEEPER',
    SUBMARINE: 'SUBMARINE',
    NAVAL: entity.assetId === 'sina_corvette' ? 'CORVETTE' : 'FAST_ATTACK_CRAFT',
    DECOY: 'FAST_ATTACK_CRAFT',
  };

  return catMap[entity.category] || 'DESTROYER';
}

export default function SimCanvas({ engineRef, playerFaction, onCanvasClick, targetingMode, showFps }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const effectsRef = useRef(new EffectsManager());
  const processedEventsRef = useRef(0);
  const fpsRef = useRef({ frames: 0, lastTime: 0, fps: 0 });

  // Convert screen to world coordinates
  const screenToWorld = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * MAP_W;
    const y = ((clientY - rect.top) / rect.height) * MAP_H;
    return { x, y };
  }, []);

  const handleClick = useCallback((e) => {
    if (!onCanvasClick) return;
    const pos = screenToWorld(e.clientX, e.clientY);
    if (pos) onCanvasClick(pos);
  }, [onCanvasClick, screenToWorld]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const effects = effectsRef.current;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { width: w, height: h };
      invalidateCRTCache(); // Clear cached vignette on resize
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    function frame(time) {
      const { width, height } = sizeRef.current;
      if (width <= 0 || height <= 0) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const engine = engineRef.current;
      if (!engine) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const scaleX = width / MAP_W;
      const scaleY = height / MAP_H;
      const entities = engine.entities;

      // Process new engine events for effects
      processedEventsRef.current = effects.processEvents(
        engine.events, processedEventsRef.current
      );
      effects.update();

      // 1. Clear
      ctx.clearRect(0, 0, width, height);

      // 2. Static map layer (cached)
      const staticMap = getStaticMapCanvas(width, height);
      ctx.drawImage(staticMap, 0, 0);

      // 3. Draw selected route
      drawRoute(ctx, engine, scaleX, scaleY);

      // 4. Radar sweeps + effects (below entities)
      effects.render(ctx, width, height, entities, playerFaction, engine.gameTime);

      // 5. Air transit vectors
      drawTransitVectors(ctx, entities, scaleX, scaleY, playerFaction);

      // 6. Smoke zones
      effects.renderSmokeZones(ctx, scaleX, scaleY, engine.smokeZones, engine.gameTime);

      // 7. Draw wrecks (destroyed entities)
      drawWrecks(ctx, entities, scaleX, scaleY, playerFaction);

      // 8. Draw active entities
      drawEntities(ctx, entities, scaleX, scaleY, playerFaction, time);

      // 9. Entity HUD (health bars, labels)
      renderEntityHUD(ctx, width, height, entities, playerFaction, time);

      // 10. Fog of war
      effects.renderFogOfWar(ctx, width, height, entities, playerFaction);

      // 11. Targeting mode cursor overlay
      if (targetingMode) {
        drawTargetingOverlay(ctx, width, height, targetingMode);
      }

      // 12. CRT effects
      applyCRTEffects(ctx, width, height);

      // 13. FPS counter
      if (showFps) {
        const fpsData = fpsRef.current;
        fpsData.frames++;
        if (time - fpsData.lastTime >= 1000) {
          fpsData.fps = fpsData.frames;
          fpsData.frames = 0;
          fpsData.lastTime = time;
        }
        ctx.save();
        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = '#00ff88';
        ctx.globalAlpha = 0.7;
        ctx.textAlign = 'right';
        ctx.fillText(`FPS: ${fpsData.fps}  ENT: ${entities.length}`, width - 8, 14);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [engineRef, playerFaction, targetingMode, showFps]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        aria-hidden="true"
        style={{ display: 'block', cursor: targetingMode ? 'crosshair' : 'default' }}
      />
    </div>
  );
}

// --- Helper drawing functions ---

function drawTransitVectors(ctx, entities, scaleX, scaleY, playerFaction) {
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1;

  for (const entity of entities) {
    if (entity.faction !== playerFaction) continue;
    if (entity.type !== 'AIR' || entity.missionPhase !== 'TRANSIT') continue;
    if (!entity.stationPosition) continue;

    const x = entity.position.x * scaleX;
    const y = entity.position.y * scaleY;
    const sx = entity.stationPosition.x * scaleX;
    const sy = entity.stationPosition.y * scaleY;

    ctx.strokeStyle = entity.faction === 'ATTACKER'
      ? 'rgba(51, 153, 255, 0.45)'
      : 'rgba(255, 51, 51, 0.45)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function drawRoute(ctx, engine, scaleX, scaleY) {
  // Draw all active routes
  if (engine.pathfindingSystems) {
    for (const pf of Object.values(engine.pathfindingSystems)) {
      if (!pf.waypoints) continue;
      ctx.save();
      ctx.strokeStyle = 'rgba(51, 153, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pf.waypoints[0].x * scaleX, pf.waypoints[0].y * scaleY);
      for (let i = 1; i < pf.waypoints.length; i++) {
        ctx.lineTo(pf.waypoints[i].x * scaleX, pf.waypoints[i].y * scaleY);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  } else if (engine.pathfinding && engine.pathfinding.waypoints) {
    const waypoints = engine.pathfinding.waypoints;
    ctx.save();
    ctx.strokeStyle = 'rgba(51, 153, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x * scaleX, waypoints[0].y * scaleY);
    for (let i = 1; i < waypoints.length; i++) {
      ctx.lineTo(waypoints[i].x * scaleX, waypoints[i].y * scaleY);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawWrecks(ctx, entities, scaleX, scaleY, playerFaction) {
  for (const entity of entities) {
    if (!entity.isDestroyed) continue;
    if (entity.type === 'MINE') continue;
    if (entity.isDecoy) continue;

    const x = entity.position.x * scaleX;
    const y = entity.position.y * scaleY;
    const faction = entity.type === 'TANKER' ? 'TANKER' : entity.faction;
    const iconType = getIconType(entity);

    drawAssetIcon(ctx, x, y, iconType, faction, entity.rotation || 0, 1, { destroyed: true });
  }
}

function drawEntities(ctx, entities, scaleX, scaleY, playerFaction, time) {
  for (const entity of entities) {
    if (entity.isDestroyed) continue;
    if (entity.type === 'MINE') continue; // Mines are invisible

    const isFriendly = entity.faction === playerFaction;
    const isDetected = entity.detectedBy && entity.detectedBy.has(playerFaction);

    // Enemy assets: only render if detected or tanker
    if (!isFriendly && !isDetected && entity.type !== 'TANKER') continue;

    const x = entity.position.x * scaleX;
    const y = entity.position.y * scaleY;
    const faction = entity.type === 'TANKER' ? 'TANKER' : entity.faction;
    const iconType = getIconType(entity);

    const options = {
      dimmed: entity.isWinchester,
      hp: isFriendly ? entity.hp : undefined,
      maxHp: isFriendly ? entity.maxHp : undefined,
      showHeading: true,
    };

    // Detected enemies blink
    if (!isFriendly && isDetected && entity.type !== 'TANKER') {
      const blink = Math.sin(time * 0.004) > 0;
      if (!blink) continue; // Skip every other frame for blinking effect
    }

    drawAssetIcon(ctx, x, y, iconType, faction, entity.rotation || 0, 1, options);
  }
}

function drawTargetingOverlay(ctx, width, height, targetingMode) {
  ctx.save();

  // Dim overlay border
  ctx.strokeStyle = targetingMode === 'TANKER' ? '#ffaa00'
    : targetingMode === 'ENTITY' ? '#ff3333'
    : targetingMode === 'FIXED_EMPLACEMENT' ? '#ff3333'
    : '#00ff88';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(4, 4, width - 8, height - 8);
  ctx.setLineDash([]);

  // Label
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#00ff88';
  ctx.globalAlpha = 0.8;
  const label = targetingMode === 'TANKER' ? 'SELECT TANKER'
    : targetingMode === 'ENTITY' ? 'SELECT TARGET'
    : targetingMode === 'FIXED_EMPLACEMENT' ? 'SELECT EMPLACEMENT'
    : 'SELECT POSITION';
  ctx.fillText(label, width / 2, 10);

  ctx.restore();
}

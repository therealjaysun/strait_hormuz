// Temporary map viewer for Phase 2 testing
// Shows the full map with CRT effects, sample asset icons, and placement zones

import { useCallback, useState } from 'react';
import MapCanvas from './PlanningPhase/MapCanvas';
import { renderMap } from '../rendering/MapRenderer';
import { applyCRTEffects } from '../rendering/CRTEffects';
import { drawAssetIcon, drawAssetLegend } from '../rendering/AssetRenderer';
import { drawPlacementZones } from '../rendering/ZoneRenderer';
import { PLACEMENT_ZONES } from '../data/placementZones';
import { MAP_BOUNDS } from '../data/mapData';
import { PHASES } from '../data/constants';

// Flatten defender zones for rendering
function getDefenderZoneSlots() {
  const zones = PLACEMENT_ZONES.defender;
  return [
    ...zones.coastal.slots,
    ...zones.island.slots,
    ...zones.naval.slots,
    ...zones.aerial.slots,
  ];
}

export default function MapViewer({ dispatch }) {
  const [selectedRoute, setSelectedRoute] = useState('BRAVO');
  const [showZones, setShowZones] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  const renderCallback = useCallback(
    (ctx, width, height, time) => {
      // Draw map (static cached + routes)
      renderMap(ctx, width, height, selectedRoute);

      const scaleX = width / MAP_BOUNDS.width;
      const scaleY = height / MAP_BOUNDS.height;

      // Draw placement zones
      if (showZones) {
        const defenderZones = getDefenderZoneSlots();
        drawPlacementZones(ctx, width, height, time, 'DEFENDER', defenderZones, {
          placedCounts: {},
        });
      }

      // Draw sample assets on the map
      if (showAssets) {
        // Some defender assets near Iranian coast
        drawAssetIcon(ctx, 150 * scaleX, 80 * scaleY, 'COASTAL_MISSILE', 'DEFENDER', 0, 1);
        drawAssetIcon(ctx, 280 * scaleX, 70 * scaleY, 'RADAR', 'DEFENDER', 0, 1);
        drawAssetIcon(ctx, 410 * scaleX, 55 * scaleY, 'COASTAL_MISSILE', 'DEFENDER', 0, 1);
        drawAssetIcon(ctx, 350 * scaleX, 180 * scaleY, 'FAST_ATTACK_CRAFT', 'DEFENDER', Math.PI * 0.3, 1);
        drawAssetIcon(ctx, 480 * scaleX, 230 * scaleY, 'SUBMARINE', 'DEFENDER', Math.PI * 0.1, 1);
        drawAssetIcon(ctx, 550 * scaleX, 250 * scaleY, 'MINE_LAYER', 'DEFENDER', Math.PI * 0.4, 1);

        // Mines in the strait
        drawAssetIcon(ctx, 500 * scaleX, 300 * scaleY, 'SEA_MINE', 'DEFENDER', 0, 0.8);
        drawAssetIcon(ctx, 520 * scaleX, 310 * scaleY, 'SEA_MINE', 'DEFENDER', 0, 0.8);
        drawAssetIcon(ctx, 510 * scaleX, 320 * scaleY, 'SEA_MINE', 'DEFENDER', 0, 0.8);

        // Defender aerial
        drawAssetIcon(ctx, 300 * scaleX, 200 * scaleY, 'STRIKE_AIRCRAFT', 'DEFENDER', Math.PI * 0.2, 1);
        drawAssetIcon(ctx, 600 * scaleX, 240 * scaleY, 'DRONE_SWARM', 'DEFENDER', 0, 1);

        // Attacker convoy heading east
        drawAssetIcon(ctx, 200 * scaleX, 305 * scaleY, 'TANKER', 'TANKER', 0, 1);
        drawAssetIcon(ctx, 230 * scaleX, 305 * scaleY, 'TANKER', 'TANKER', 0, 1);
        drawAssetIcon(ctx, 260 * scaleX, 305 * scaleY, 'TANKER', 'TANKER', 0, 0.9);

        // Attacker escorts
        drawAssetIcon(ctx, 180 * scaleX, 280 * scaleY, 'DESTROYER', 'ATTACKER', 0, 1);
        drawAssetIcon(ctx, 180 * scaleX, 330 * scaleY, 'FRIGATE', 'ATTACKER', 0, 1);
        drawAssetIcon(ctx, 280 * scaleX, 290 * scaleY, 'CRUISER', 'ATTACKER', 0, 1);
        drawAssetIcon(ctx, 150 * scaleX, 305 * scaleY, 'MINESWEEPER', 'ATTACKER', 0, 1);

        // Attacker air
        drawAssetIcon(ctx, 220 * scaleX, 250 * scaleY, 'FIGHTER', 'ATTACKER', Math.PI * 0.1, 1);
        drawAssetIcon(ctx, 250 * scaleX, 340 * scaleY, 'HELICOPTER', 'ATTACKER', 0, 1);
        drawAssetIcon(ctx, 300 * scaleX, 260 * scaleY, 'EW_AIRCRAFT', 'ATTACKER', Math.PI * 0.15, 1);
        drawAssetIcon(ctx, 160 * scaleX, 260 * scaleY, 'MARITIME_PATROL', 'ATTACKER', 0, 1);

        // Destroyed example
        drawAssetIcon(ctx, 700 * scaleX, 280 * scaleY, 'FAST_ATTACK_CRAFT', 'DEFENDER', 0.5, 1, { destroyed: true });
      }

      // Draw asset legend
      if (showLegend) {
        // Semi-transparent background for legend
        const legendX = width - 310;
        const legendY = height - 240;
        ctx.save();
        ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
        ctx.fillRect(legendX - 10, legendY - 20, 300, 230);
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX - 10, legendY - 20, 300, 230);
        ctx.fillStyle = '#00ff88';
        ctx.font = '11px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('ASSET ICONS', legendX, legendY - 6);
        ctx.restore();

        drawAssetLegend(ctx, legendX, legendY + 12, 'DEFENDER');
      }

      // CRT post-processing
      applyCRTEffects(ctx, width, height);
    },
    [selectedRoute, showZones, showAssets, showLegend]
  );

  const handleCanvasClick = useCallback((worldPos) => {
    console.log('Map clicked:', worldPos);
  }, []);

  const routes = ['ALPHA', 'BRAVO', 'CHARLIE'];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Control bar */}
      <div className="flex items-center gap-4 p-2 z-10" style={{ backgroundColor: 'rgba(10,10,20,0.9)' }}>
        <button
          className="crt-button text-xs py-1 px-3"
          onClick={() => dispatch({ type: 'SET_PHASE', phase: PHASES.MENU })}
        >
          ← Menu
        </button>

        <span className="text-xs opacity-60 mx-2">Route:</span>
        {routes.map((r) => (
          <button
            key={r}
            className={`text-xs py-1 px-2 border ${selectedRoute === r ? 'border-blue-400 text-blue-400' : 'border-gray-600 text-gray-500'}`}
            onClick={() => setSelectedRoute(r)}
            style={{ fontFamily: 'Courier New, monospace' }}
          >
            {r}
          </button>
        ))}

        <span className="text-xs opacity-60 mx-2">Show:</span>
        <label className="text-xs flex items-center gap-1 cursor-pointer" style={{ color: 'var(--color-text)' }}>
          <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
          Zones
        </label>
        <label className="text-xs flex items-center gap-1 cursor-pointer" style={{ color: 'var(--color-text)' }}>
          <input type="checkbox" checked={showAssets} onChange={(e) => setShowAssets(e.target.checked)} />
          Assets
        </label>
        <label className="text-xs flex items-center gap-1 cursor-pointer" style={{ color: 'var(--color-text)' }}>
          <input type="checkbox" checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)} />
          Legend
        </label>
      </div>

      {/* Map canvas */}
      <MapCanvas
        renderCallback={renderCallback}
        onCanvasClick={handleCanvasClick}
        className="flex-1"
      />
    </div>
  );
}

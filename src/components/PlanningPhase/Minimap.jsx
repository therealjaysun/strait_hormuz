import { useRef, useEffect } from 'react';
import { iranianCoastline, omaniCoastline, islands, ROUTES, MAP_BOUNDS } from '../../data/mapData.js';

const MINIMAP_W = 150;
const MINIMAP_H = 90;

export default function Minimap({ placements, selectedRoute, factionColor }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = MINIMAP_W * dpr;
    canvas.height = MINIMAP_H * dpr;
    canvas.style.width = `${MINIMAP_W}px`;
    canvas.style.height = `${MINIMAP_H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sx = MINIMAP_W / MAP_BOUNDS.width;
    const sy = MINIMAP_H / MAP_BOUNDS.height;

    // Background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

    // Coastlines
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.lineWidth = 1;
    drawLine(ctx, iranianCoastline, sx, sy);
    drawLine(ctx, omaniCoastline, sx, sy);

    // Islands
    ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
    for (const island of islands) {
      ctx.beginPath();
      ctx.moveTo(island.points[0].x * sx, island.points[0].y * sy);
      for (let i = 1; i < island.points.length; i++) {
        ctx.lineTo(island.points[i].x * sx, island.points[i].y * sy);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Selected route
    if (selectedRoute && ROUTES[selectedRoute]) {
      ctx.strokeStyle = factionColor || '#3399ff';
      ctx.lineWidth = 1.5;
      drawLine(ctx, ROUTES[selectedRoute].waypoints, sx, sy);
    }

    // Placed assets as dots
    for (const p of placements) {
      ctx.fillStyle = factionColor || '#00ff88';
      ctx.beginPath();
      ctx.arc(p.position.x * sx, p.position.y * sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_W, MINIMAP_H);
  }, [placements, selectedRoute, factionColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block' }}
    />
  );
}

function drawLine(ctx, points, sx, sy) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x * sx, points[0].y * sy);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * sx, points[i].y * sy);
  }
  ctx.stroke();
}

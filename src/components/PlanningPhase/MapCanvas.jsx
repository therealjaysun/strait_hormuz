import { useRef, useEffect, useCallback } from 'react';

/**
 * Reusable Canvas component with DPI scaling, auto-resize, and rAF render loop.
 *
 * Props:
 * - renderCallback(ctx, width, height, time) — called each frame (width/height are CSS pixels)
 * - onCanvasClick(worldPos) — optional click handler (world coords 0-1000 x 0-600)
 * - onCanvasRightClick(worldPos) — optional right-click handler (world coords)
 * - onCanvasHover(worldPos) — optional mousemove handler (world coords)
 * - className — applied to the wrapper div
 */
export default function MapCanvas({ renderCallback, onCanvasClick, onCanvasRightClick, onCanvasHover, className }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  // Convert screen pixel position to world coordinates (0-1000 x 0-600)
  const screenToWorld = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 1000;
    const y = ((clientY - rect.top) / rect.height) * 600;
    return { x, y };
  }, []);

  const handleClick = useCallback(
    (e) => {
      if (!onCanvasClick) return;
      const pos = screenToWorld(e.clientX, e.clientY);
      if (pos) onCanvasClick(pos);
    },
    [onCanvasClick, screenToWorld]
  );

  const handleContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      if (!onCanvasRightClick) return;
      const pos = screenToWorld(e.clientX, e.clientY);
      if (pos) onCanvasRightClick(pos);
    },
    [onCanvasRightClick, screenToWorld]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!onCanvasHover) return;
      const pos = screenToWorld(e.clientX, e.clientY);
      if (pos) onCanvasHover(pos);
    },
    [onCanvasHover, screenToWorld]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');

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
    }

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    // Animation loop
    function frame(time) {
      const { width, height } = sizeRef.current;
      if (width > 0 && height > 0 && renderCallback) {
        ctx.clearRect(0, 0, width, height);
        renderCallback(ctx, width, height, time);
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderCallback]);

  return (
    <div ref={containerRef} className={className || 'w-full h-full'}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        style={{ display: 'block' }}
      />
    </div>
  );
}

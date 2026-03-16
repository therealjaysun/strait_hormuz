// SimHUD — top bar with game clock, speed controls, and tanker status dots
// GDD Section 7.4

import { SIMULATION } from '../../data/constants.js';

/**
 * Format game time (seconds) into HH:MM:SS.
 */
function formatTime(gameTime) {
  const total = Math.floor(gameTime);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function SimHUD({ gameTime, speed, tankers, onSpeedChange }) {
  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-1"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderBottom: '1px solid rgba(0, 255, 136, 0.3)',
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: '#00ff88',
        zIndex: 10,
        height: '28px',
      }}
    >
      {/* Game Clock */}
      <div className="flex items-center gap-2">
        <span style={{ color: 'rgba(0, 255, 136, 0.5)', fontSize: '10px' }}>TIME:</span>
        <span style={{ letterSpacing: '1px' }}>{formatTime(gameTime)}</span>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center gap-1">
        <span style={{ color: 'rgba(0, 255, 136, 0.5)', fontSize: '10px', marginRight: '4px' }}>
          SPEED:
        </span>
        {SIMULATION.SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            style={{
              backgroundColor: speed === s ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
              border: `1px solid ${speed === s ? '#00ff88' : 'rgba(0, 255, 136, 0.2)'}`,
              color: speed === s ? '#00ff88' : 'rgba(0, 255, 136, 0.5)',
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              padding: '1px 6px',
              cursor: 'pointer',
              borderRadius: '1px',
              boxShadow: speed === s ? '0 0 4px rgba(0, 255, 136, 0.3)' : 'none',
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Tanker Status */}
      <div className="flex items-center gap-1">
        <span style={{ color: 'rgba(0, 255, 136, 0.5)', fontSize: '10px', marginRight: '4px' }}>
          TANKERS:
        </span>
        {tankers.map((t, i) => (
          <span
            key={i}
            style={{
              fontSize: '14px',
              color: t.hasEscaped ? '#3399ff'
                : t.isDestroyed ? '#ff3333'
                : '#ffaa00',
              textShadow: t.hasEscaped ? '0 0 4px #3399ff'
                : t.isDestroyed ? 'none'
                : '0 0 4px #ffaa00',
              opacity: t.isDestroyed ? 0.4 : 1,
            }}
            title={t.name}
          >
            {t.hasEscaped ? '\u2713' : t.isDestroyed ? '\u25CB' : '\u25CF'}
          </span>
        ))}
      </div>
    </div>
  );
}

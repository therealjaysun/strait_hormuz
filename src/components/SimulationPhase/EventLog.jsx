// EventLog — scrolling DEFCON-style terse military event log
// GDD Section 7.4.1

import { useRef, useEffect } from 'react';
import { MAP } from '../../data/constants.js';

const MAX_ENTRIES = 50;

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

/**
 * Convert world position to grid coordinate string.
 */
function gridCoord(position) {
  if (!position) return 'UNKNOWN';
  const latRange = MAP.LAT_MAX - MAP.LAT_MIN;
  const lonRange = MAP.LON_MAX - MAP.LON_MIN;
  const lat = (MAP.LAT_MIN + (1 - position.y / MAP.HEIGHT) * latRange).toFixed(2);
  const lon = (MAP.LON_MIN + (position.x / MAP.WIDTH) * lonRange).toFixed(2);
  return `${lat}N ${lon}E`;
}

/**
 * Format a bearing from position (approximate based on grid).
 */
function bearing(from, to) {
  if (!from || !to) return '---';
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
  angle = (90 - angle + 360) % 360;
  return String(Math.round(angle)).padStart(3, '0');
}

/**
 * Convert an engine event into a terse log message.
 */
function formatEvent(event) {
  const time = formatTime(event.gameTime);
  const data = event.data || {};

  switch (event.type) {
    case 'COMBAT_HIT':
      return `[${time}] ENGAGEMENT — ${(data.attackerName || 'UNKNOWN').toUpperCase()} FIRES ON ${(data.targetName || 'UNKNOWN').toUpperCase()} — HIT — DMG ${data.damage || 0}`;

    case 'COMBAT_MISS':
      return `[${time}] ENGAGEMENT — ${(data.attackerName || 'UNKNOWN').toUpperCase()} FIRES ON ${(data.targetName || 'UNKNOWN').toUpperCase()} — MISS`;

    case 'ASSET_DESTROYED':
      return `[${time}] SPLASH — ${(data.name || 'UNKNOWN').toUpperCase()} DESTROYED BY ${(data.destroyedBy || 'UNKNOWN').toUpperCase()}`;

    case 'MINE_DETONATION':
      return `[${time}] MINE DETONATION — GRID ${gridCoord(data.position)} — ${(data.entityName || 'UNKNOWN').toUpperCase()} STRUCK — DMG ${data.damage || 0}`;

    case 'MINE_REVEALED':
      return `[${time}] MINE REVEALED — GRID ${gridCoord(data.position)} — ${(data.sweeperName || 'MCM').toUpperCase()} SWEEP`;

    case 'MINE_CLEARED':
      return `[${time}] MINE CLEARED — ${data.mineId}`;

    case 'WINCHESTER':
      return `[${time}] WINCHESTER — ${(data.name || 'UNKNOWN').toUpperCase()} MAGAZINE DEPLETED`;

    case 'TANKER_ESCAPED':
      return `[${time}] PASSAGE CONFIRMED — ${(data.name || 'TANKER').toUpperCase()} REACHED OPEN WATER`;

    case 'ABILITY_ACTIVATED':
      return `[${time}] COMMAND — ${(data.abilityName || 'ABILITY').toUpperCase()} ACTIVATED — ${(data.details || '').toUpperCase()}`;

    case 'SIMULATION_END': {
      const winner = data.winner === 'DEFENDER' ? 'IRANIAN COASTAL COMMAND' : 'COALITION NAVAL ESCORT';
      return `[${time}] === OPERATION COMPLETE — ${winner} VICTORY — ${data.reason} ===`;
    }

    default:
      return `[${time}] ${event.type}`;
  }
}

export default function EventLog({ events }) {
  const containerRef = useRef(null);

  // Auto-scroll to top (newest entries at top)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events.length]);

  // Format and reverse to show newest first, limit to MAX_ENTRIES
  const formatted = [];
  const start = Math.max(0, events.length - MAX_ENTRIES);
  for (let i = events.length - 1; i >= start; i--) {
    formatted.push({ key: i, text: formatEvent(events[i]) });
  }

  return (
    <div
      ref={containerRef}
      role="log"
      aria-live="polite"
      aria-label="Combat event log"
      className="absolute bottom-16 left-2 w-80 max-h-48 overflow-y-auto sim-event-log"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        borderRadius: '2px',
        fontFamily: '"Courier New", monospace',
        fontSize: '9px',
        lineHeight: '1.4',
        padding: '4px 6px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#00ff88 #0a0a14',
      }}
    >
      {formatted.length === 0 ? (
        <div style={{ color: 'rgba(0, 255, 136, 0.4)' }}>AWAITING CONTACT...</div>
      ) : (
        formatted.map(entry => (
          <div
            key={entry.key}
            style={{
              color: entry.text.includes('DESTROYED') || entry.text.includes('SPLASH')
                ? '#ff3333'
                : entry.text.includes('OPERATION COMPLETE')
                ? '#ffaa00'
                : entry.text.includes('PASSAGE CONFIRMED')
                ? '#3399ff'
                : entry.text.includes('COMMAND')
                ? '#ffaa00'
                : '#00ff88',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entry.text}
          </div>
        ))
      )}
    </div>
  );
}

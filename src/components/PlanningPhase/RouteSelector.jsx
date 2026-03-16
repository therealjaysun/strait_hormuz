import { ROUTES } from '../../data/mapData.js';

const ROUTE_KEYS = ['ALPHA', 'BRAVO', 'CHARLIE'];
const TOTAL_TANKERS = 5;

export default function RouteSelector({ tankerAllocation, onUpdateAllocation, factionColor }) {
  const totalAssigned = ROUTE_KEYS.reduce((sum, k) => sum + (tankerAllocation[k] || 0), 0);

  function increment(routeKey) {
    if (totalAssigned >= TOTAL_TANKERS) return;
    onUpdateAllocation({
      ...tankerAllocation,
      [routeKey]: (tankerAllocation[routeKey] || 0) + 1,
    });
  }

  function decrement(routeKey) {
    if ((tankerAllocation[routeKey] || 0) <= 0) return;
    onUpdateAllocation({
      ...tankerAllocation,
      [routeKey]: tankerAllocation[routeKey] - 1,
    });
  }

  return (
    <div
      className="flex items-center gap-4 select-none"
      style={{ fontFamily: '"Courier New", monospace', fontSize: '11px' }}
    >
      <span style={{ color: 'var(--color-text)', opacity: 0.5, letterSpacing: '1px' }}>
        TANKERS ({totalAssigned}/{TOTAL_TANKERS}):
      </span>
      {ROUTE_KEYS.map((key) => {
        const count = tankerAllocation[key] || 0;
        const hasAny = count > 0;
        return (
          <div
            key={key}
            className="flex items-center gap-1"
            style={{
              padding: '2px 6px',
              border: `1px solid ${hasAny ? factionColor : 'rgba(0, 255, 136, 0.2)'}`,
              backgroundColor: hasAny ? `${factionColor}15` : 'transparent',
              opacity: hasAny ? 1 : 0.6,
            }}
          >
            <button
              onClick={() => decrement(key)}
              style={{
                color: factionColor,
                cursor: count > 0 ? 'pointer' : 'default',
                opacity: count > 0 ? 1 : 0.3,
                fontSize: '14px',
                lineHeight: 1,
                padding: '0 4px',
                background: 'none',
                border: 'none',
                fontFamily: '"Courier New", monospace',
              }}
              aria-label={`Remove tanker from ${key}`}
            >
              −
            </button>
            <span style={{ color: hasAny ? factionColor : 'var(--color-text)', minWidth: '40px', textAlign: 'center', letterSpacing: '1px' }}>
              {key} {count}
            </span>
            <button
              onClick={() => increment(key)}
              style={{
                color: factionColor,
                cursor: totalAssigned < TOTAL_TANKERS ? 'pointer' : 'default',
                opacity: totalAssigned < TOTAL_TANKERS ? 1 : 0.3,
                fontSize: '14px',
                lineHeight: 1,
                padding: '0 4px',
                background: 'none',
                border: 'none',
                fontFamily: '"Courier New", monospace',
              }}
              aria-label={`Add tanker to ${key}`}
            >
              +
            </button>
          </div>
        );
      })}
    </div>
  );
}

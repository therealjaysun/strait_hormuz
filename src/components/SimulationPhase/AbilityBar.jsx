// AbilityBar — three intervention ability buttons with cooldown indicators
// GDD Section 7.3

const FACTION_GLOW = {
  DEFENDER: '#ff3333',
  ATTACKER: '#3399ff',
};

export default function AbilityBar({ abilities, playerFaction, onActivate, targetingAbility }) {
  const glowColor = FACTION_GLOW[playerFaction] || '#00ff88';

  return (
    <div
      className="absolute bottom-2 right-2 flex flex-col gap-1"
      style={{ width: '220px' }}
    >
      {abilities.map(ability => {
        const isTargeting = targetingAbility === ability.id;
        const cooldownFraction = ability.cooldown > 0
          ? 1 - (ability.cooldownRemaining / ability.cooldown)
          : 1;

        return (
          <button
            key={ability.id}
            onClick={() => !ability.isExpended && ability.isReady && onActivate(ability.id)}
            disabled={ability.isExpended || (!ability.isReady && !isTargeting)}
            className="relative text-left"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: `1px solid ${isTargeting ? '#ffaa00' : ability.isReady ? glowColor : 'rgba(0, 255, 136, 0.2)'}`,
              borderRadius: '2px',
              padding: '4px 8px',
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              color: ability.isExpended ? '#555'
                : ability.isReady ? glowColor
                : '#00ff88',
              cursor: ability.isReady && !ability.isExpended ? 'pointer' : 'default',
              opacity: ability.isExpended ? 0.4 : ability.isReady ? 1 : 0.7,
              boxShadow: ability.isReady && !ability.isExpended
                ? `0 0 6px ${glowColor}40`
                : isTargeting
                ? '0 0 8px rgba(255, 170, 0, 0.4)'
                : 'none',
              textTransform: 'uppercase',
              overflow: 'hidden',
            }}
          >
            {/* Cooldown fill bar */}
            {!ability.isReady && !ability.isExpended && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${cooldownFraction * 100}%`,
                  backgroundColor: `${glowColor}15`,
                  transition: 'width 0.1s linear',
                }}
              />
            )}

            <div className="relative flex items-center justify-between gap-2">
              <span className="truncate" style={{ maxWidth: '140px' }}>
                {ability.name}
              </span>
              <span style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>
                {ability.isExpended
                  ? 'EXPENDED'
                  : isTargeting
                  ? 'TARGETING'
                  : ability.isReady
                  ? 'READY'
                  : `${Math.ceil(ability.cooldownRemaining)}s`
                }
              </span>
            </div>

            {/* Tooltip description */}
            <div
              style={{
                fontSize: '8px',
                color: 'rgba(0, 255, 136, 0.4)',
                marginTop: '1px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ability.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}

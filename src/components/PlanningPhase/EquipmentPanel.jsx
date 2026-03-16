import { useMemo } from 'react';

// Category display labels
const CATEGORY_LABELS = {
  COASTAL_MISSILE: 'COASTAL DEFENSE',
  RADAR: 'RADAR & SURVEILLANCE',
  NAVAL: 'NAVAL ASSETS',
  SUBMARINE: 'SUBMARINE',
  MINE_LAYER: 'MINE WARFARE',
  AERIAL: 'AERIAL ASSETS',
  DRONE: 'DRONE WARFARE',
  ESCORT: 'ESCORT WARSHIPS',
  MCM: 'MINE COUNTERMEASURES',
  EW: 'ELECTRONIC WARFARE',
};

function getKeyStat(item) {
  if (item.radarRange > 0 && item.damage === 0) return `${item.radarRange}NM DET`;
  if (item.weaponRange > 0) return `RNG:${item.weaponRange}NM DMG:${item.damage}`;
  if (item.isEW) return `${item.jammingRadius}NM JAM`;
  if (item.isMinesweeper) return `${item.sweepRadius}NM SWEEP`;
  if (item.category === 'MINE_LAYER') return `${item.ammo} MINES`;
  if (item.isDrone) return `${item.droneCount} MUNITIONS`;
  return `${item.hp} HP`;
}

function groupByCategory(equipment) {
  const groups = {};
  for (const item of equipment) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return groups;
}

export default function EquipmentPanel({
  equipment,
  selectedAssetId,
  onSelectAsset,
  remainingBudget,
  stockUsed,
  factionColor,
  onHoverAsset,
}) {
  const groups = useMemo(() => groupByCategory(equipment), [equipment]);

  return (
    <div
      className="h-full overflow-y-auto select-none"
      style={{
        width: '250px',
        minWidth: '250px',
        backgroundColor: 'rgba(10, 10, 20, 0.9)',
        borderRight: '1px solid rgba(0, 255, 136, 0.15)',
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 12px 8px',
          color: '#00ff88',
          fontWeight: 'bold',
          letterSpacing: '2px',
          fontSize: '12px',
          borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
        }}
      >
        EQUIPMENT ROSTER
      </div>

      {/* Equipment list grouped by category */}
      {Object.entries(groups).map(([category, items]) => (
        <div key={category}>
          {/* Category header */}
          <div
            style={{
              padding: '8px 12px 4px',
              color: factionColor,
              opacity: 0.6,
              letterSpacing: '1px',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {CATEGORY_LABELS[category] || category}
          </div>

          {/* Assets in category */}
          {items.map((item) => {
            const used = stockUsed[item.id] || 0;
            const stockRemaining = item.maxStock - used;
            const canAfford = remainingBudget >= item.cost;
            const available = stockRemaining > 0 && canAfford;
            const isSelected = selectedAssetId === item.id;

            return (
              <button
                key={item.id}
                className="w-full text-left block"
                disabled={!available}
                onClick={() => available && onSelectAsset(isSelected ? null : item.id)}
                onMouseEnter={() => onHoverAsset?.(item)}
                onMouseLeave={() => onHoverAsset?.(null)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isSelected
                    ? `${factionColor}18`
                    : 'transparent',
                  border: 'none',
                  borderLeft: isSelected
                    ? `2px solid ${factionColor}`
                    : '2px solid transparent',
                  cursor: available ? 'pointer' : 'default',
                  opacity: available ? 1 : 0.3,
                  fontFamily: '"Courier New", monospace',
                  fontSize: '11px',
                  color: 'var(--color-text)',
                  transition: 'background-color 0.1s ease',
                  display: 'block',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: isSelected ? factionColor : 'var(--color-text)' }}>
                    {item.name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ opacity: 0.5 }}>{item.cost} PTS</span>
                  <span style={{ opacity: 0.5 }}>
                    STOCK: {stockRemaining}/{item.maxStock}
                  </span>
                </div>
                <div style={{ opacity: 0.4, marginTop: '1px', fontSize: '10px' }}>
                  {getKeyStat(item)}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

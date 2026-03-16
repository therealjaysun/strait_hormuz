import { useEffect, useRef } from 'react';

export default function StatTooltip({ asset, mousePos, containerRef }) {
  const tooltipRef = useRef(null);

  // Reposition tooltip to stay in bounds
  useEffect(() => {
    if (!tooltipRef.current || !containerRef?.current || !mousePos) return;
    const tip = tooltipRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    let left = mousePos.x + 16;
    let top = mousePos.y - 10;

    // Keep within container bounds
    if (left + tip.offsetWidth > rect.width) {
      left = mousePos.x - tip.offsetWidth - 16;
    }
    if (top + tip.offsetHeight > rect.height) {
      top = rect.height - tip.offsetHeight - 8;
    }
    if (top < 0) top = 8;

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }, [mousePos, asset, containerRef]);

  if (!asset || !mousePos) return null;

  const speed = asset.speed === 0 ? 'FIXED' : `${asset.speed} KT`;
  const radar = asset.radarRange === 0
    ? '0 NM (REQ EXT)'
    : `${asset.radarRange} NM`;
  const ammo = asset.ammo === Infinity ? '∞' : String(asset.ammo);

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 pointer-events-none"
      style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        color: 'var(--color-text)',
        backgroundColor: 'rgba(10, 10, 20, 0.95)',
        border: '1px solid rgba(0, 255, 136, 0.4)',
        padding: '8px 10px',
        lineHeight: '1.5',
        minWidth: '220px',
        boxShadow: '0 0 10px rgba(0, 255, 136, 0.15)',
      }}
    >
      <div style={{ color: '#00ff88', fontWeight: 'bold', marginBottom: '4px' }}>
        {asset.name}
      </div>
      <div style={{ borderTop: '1px solid rgba(0, 255, 136, 0.2)', marginBottom: '4px' }} />
      <Row label="COST" value={`${asset.cost} PTS`} />
      <Row label="HP" value={String(asset.hp)} />
      <Row label="SPEED" value={speed} />
      <Row label="RADAR" value={radar} />
      <Row label="WEAPON" value={asset.weaponRange > 0 ? `${asset.weaponRange} NM` : 'NONE'} />
      <Row label="DAMAGE" value={asset.damage > 0 ? String(asset.damage) : '—'} />
      <Row label="RELOAD" value={asset.reloadTime > 0 ? `${asset.reloadTime}S` : '—'} />
      <Row label="AMMO" value={ammo} />
      <Row label="SIGNATURE" value={asset.signature} />
      <Row label="CM" value={asset.countermeasures} />
      {asset.description && (
        <div style={{ marginTop: '4px', opacity: 0.5, fontSize: '10px' }}>
          {asset.description}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
      <span>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

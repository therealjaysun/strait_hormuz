export default function BudgetHUD({ remaining, total, factionColor }) {
  const fraction = total > 0 ? remaining / total : 0;
  const isLow = fraction < 0.1;
  const barWidth = 140;
  const filledWidth = Math.round(barWidth * fraction);

  return (
    <div
      className="absolute top-3 right-3 z-20 select-none"
      style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        color: 'var(--color-text)',
        backgroundColor: 'rgba(10, 10, 20, 0.85)',
        border: `1px solid ${isLow ? '#ff3333' : 'rgba(0, 255, 136, 0.3)'}`,
        padding: '8px 12px',
        boxShadow: isLow ? '0 0 12px rgba(255, 51, 51, 0.3)' : 'none',
      }}
    >
      <div style={{ marginBottom: '4px', letterSpacing: '1px', opacity: 0.6 }}>BUDGET:</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <div
          style={{
            width: `${barWidth}px`,
            height: '8px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${filledWidth}px`,
              height: '100%',
              backgroundColor: factionColor,
              opacity: 0.8,
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      </div>
      <div style={{ letterSpacing: '1px' }}>
        <span style={{ color: factionColor, fontWeight: 'bold' }}>
          {remaining.toLocaleString()}
        </span>
        <span style={{ opacity: 0.5 }}> / {total.toLocaleString()} REMAINING</span>
      </div>
    </div>
  );
}

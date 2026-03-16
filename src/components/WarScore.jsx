// WarScore — After-Action Report Screen
// GDD Section 8.3

import { useState, useEffect } from 'react';
import { calculateWarScore } from '../engine/ScoringEngine.js';

const GRADE_COLORS = {
  S: '#ffaa00',
  A: '#00ff88',
  'B+': '#33ccaa',
  B: '#33ccaa',
  'C+': '#ffaa00',
  C: '#ffaa00',
  D: '#ff6600',
  F: '#ff3333',
};

const mono = { fontFamily: '"Courier New", monospace' };

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function formatBarrels(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

export default function WarScore({ gameState, dispatch }) {
  const [score, setScore] = useState(null);
  const [revealStage, setRevealStage] = useState(0);

  useEffect(() => {
    if (!gameState.simulationResult) return;
    const s = calculateWarScore(gameState.simulationResult);
    setScore(s);

    // Sequential reveal animation
    const timers = [];
    for (let i = 1; i <= 5; i++) {
      timers.push(setTimeout(() => setRevealStage(i), i * 400));
    }
    return () => timers.forEach(clearTimeout);
  }, [gameState.simulationResult]);

  if (!score) {
    return (
      <div className="flex items-center justify-center h-full" style={{ ...mono, color: '#00ff88' }}>
        Calculating War Score...
      </div>
    );
  }

  const playerFaction = score.playerFaction;
  const playerEff = playerFaction === 'DEFENDER' ? score.defenderEffectiveness : score.attackerEffectiveness;
  const opponentEff = playerFaction === 'DEFENDER' ? score.attackerEffectiveness : score.defenderEffectiveness;

  return (
    <div
      className="w-full h-full overflow-y-auto"
      role="main"
      aria-label="After Action Report"
      style={{
        ...mono,
        backgroundColor: '#0a0a14',
        color: '#00ff88',
        fontSize: '12px',
      }}
    >
      <div className="max-w-3xl mx-auto px-6 py-4">
        {/* Header */}
        <Header revealStage={revealStage} winner={score.winner} gameTime={score.gameTime} />

        {/* Tanker Status */}
        {revealStage >= 1 && (
          <Section title="TANKER CONVOY STATUS">
            <TankerStatus tankerStatus={score.tankerStatus} summary={score.tankerSummary} />
          </Section>
        )}

        {/* Military Losses */}
        {revealStage >= 2 && (
          <Section title="MILITARY LOSSES">
            <MilitaryLosses
              defenderLosses={score.defenderLosses}
              attackerLosses={score.attackerLosses}
            />
          </Section>
        )}

        {/* Effectiveness Grades */}
        {revealStage >= 3 && (
          <Section title="EFFECTIVENESS ASSESSMENT">
            <div className="flex gap-8 justify-center">
              <GradePanel
                label="DEFENDER"
                effectiveness={score.defenderEffectiveness}
                isPlayer={playerFaction === 'DEFENDER'}
                isDefender
              />
              <div style={{ width: '1px', backgroundColor: 'rgba(0, 255, 136, 0.2)' }} />
              <GradePanel
                label="ATTACKER"
                effectiveness={score.attackerEffectiveness}
                isPlayer={playerFaction === 'ATTACKER'}
                isDefender={false}
              />
            </div>
          </Section>
        )}

        {/* Budget & Ammo */}
        {revealStage >= 4 && (
          <div className="flex gap-6">
            <Section title="BUDGET UTILIZATION" className="flex-1">
              <BudgetTable
                defBudget={score.defenderBudget}
                atkBudget={score.attackerBudget}
              />
            </Section>
            <Section title="AMMO EXPENDITURE" className="flex-1">
              <AmmoTable
                defAmmo={score.defenderAmmo}
                atkAmmo={score.attackerAmmo}
              />
            </Section>
          </div>
        )}

        {/* Tactical Summary */}
        {revealStage >= 5 && (
          <>
            <Section title="TACTICAL SUMMARY">
              <div
                style={{
                  color: '#ffaa00',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  padding: '8px 12px',
                  borderLeft: '2px solid rgba(255, 170, 0, 0.4)',
                }}
              >
                &ldquo;{score.tacticalSummary}&rdquo;
              </div>
            </Section>

            {/* Action Buttons */}
            <div className="flex justify-center gap-6 mt-6 mb-8">
              <button
                onClick={() => dispatch({ type: 'GO_TO_FACTION_SELECT' })}
                style={{
                  ...mono,
                  fontSize: '14px',
                  padding: '8px 24px',
                  backgroundColor: 'transparent',
                  border: '1px solid #00ff88',
                  color: '#00ff88',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
                onMouseEnter={e => {
                  e.target.style.backgroundColor = 'rgba(0, 255, 136, 0.15)';
                  e.target.style.boxShadow = '0 0 8px rgba(0, 255, 136, 0.3)';
                }}
                onMouseLeave={e => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Play Again
              </button>
              <button
                onClick={() => dispatch({ type: 'RESET' })}
                style={{
                  ...mono,
                  fontSize: '14px',
                  padding: '8px 24px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(0, 255, 136, 0.4)',
                  color: 'rgba(0, 255, 136, 0.6)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
                onMouseEnter={e => {
                  e.target.style.backgroundColor = 'rgba(0, 255, 136, 0.1)';
                }}
                onMouseLeave={e => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Main Menu
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function Header({ revealStage, winner, gameTime }) {
  return (
    <div className="text-center py-4" style={{ borderBottom: '1px solid rgba(0, 255, 136, 0.3)' }}>
      <div
        style={{
          fontSize: '20px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          color: '#ffaa00',
          textShadow: '0 0 12px rgba(255, 170, 0, 0.5)',
        }}
      >
        ★ OPERATION COMPLETE ★
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'rgba(0, 255, 136, 0.6)',
          marginTop: '4px',
          letterSpacing: '2px',
        }}
      >
        STRAIT OF HORMUZ — AFTER ACTION REPORT
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(0, 255, 136, 0.4)', marginTop: '4px' }}>
        DURATION: {formatTime(gameTime)} | VICTOR:{' '}
        <span style={{ color: winner === 'DEFENDER' ? '#ff3333' : '#3399ff' }}>
          {winner === 'DEFENDER' ? 'IRANIAN COASTAL COMMAND' : 'COALITION NAVAL ESCORT'}
        </span>
      </div>
    </div>
  );
}

function Section({ title, children, className = '' }) {
  return (
    <div className={`mt-4 ${className}`}>
      <div
        style={{
          fontSize: '11px',
          color: 'rgba(0, 255, 136, 0.5)',
          letterSpacing: '2px',
          borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
          paddingBottom: '4px',
          marginBottom: '8px',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function TankerStatus({ tankerStatus, summary }) {
  return (
    <div>
      {/* Dot indicators — shape encodes status: ✓ escaped, ✕ destroyed, ● in transit */}
      <div className="flex items-center gap-2 mb-3" role="list" aria-label="Tanker status indicators">
        {tankerStatus.map((t, i) => (
          <span
            key={i}
            role="listitem"
            aria-label={`${t.name}: ${t.status.toLowerCase()}`}
            style={{
              fontSize: '18px',
              color: t.status === 'ESCAPED' ? '#3399ff'
                : t.status === 'DESTROYED' ? '#ff3333'
                : '#ffaa00',
              textShadow: t.status === 'DESTROYED' ? 'none'
                : `0 0 6px ${t.status === 'ESCAPED' ? '#3399ff' : '#ffaa00'}`,
              opacity: t.status === 'DESTROYED' ? 0.5 : 1,
            }}
            title={`${t.name} — ${t.status}`}
          >
            {t.status === 'ESCAPED' ? '\u2713' : t.status === 'DESTROYED' ? '\u2715' : '\u25CF'}
          </span>
        ))}
        <span style={{ marginLeft: '8px', color: '#00ff88' }}>
          {summary.escaped}/5 PASSED
        </span>
      </div>

      {/* Stats */}
      <div className="flex gap-8">
        <div>
          <Row label="Passage Rate" value={`${(summary.passageRate * 100).toFixed(0)}%`} />
          <Row label="Oil Delivered" value={`$${summary.deliveredValue}M`} color="#3399ff" />
          <Row label="Oil Destroyed" value={`$${summary.destroyedValue}M`} color="#ff3333" />
        </div>
        <div>
          <Row label="Barrels Delivered" value={formatBarrels(summary.deliveredBarrels)} color="#3399ff" />
          <Row label="Barrels Destroyed" value={formatBarrels(summary.destroyedBarrels)} color="#ff3333" />
        </div>
      </div>

      {/* Individual tankers */}
      <div style={{ fontSize: '10px', marginTop: '8px', color: 'rgba(0, 255, 136, 0.4)' }}>
        {tankerStatus.map((t, i) => (
          <div key={i} className="flex gap-4">
            <span style={{ width: '180px' }}>{t.name}</span>
            <span style={{
              color: t.status === 'ESCAPED' ? '#3399ff' : t.status === 'DESTROYED' ? '#ff3333' : '#ffaa00',
              width: '80px',
            }}>
              {t.status}
            </span>
            <span>${t.cargoValue}M</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MilitaryLosses({ defenderLosses, attackerLosses }) {
  const exchangeRate = defenderLosses.totalCost > 0 && attackerLosses.totalCost > 0
    ? (attackerLosses.totalCost / defenderLosses.totalCost).toFixed(2)
    : 'N/A';

  return (
    <div className="flex gap-8">
      <div className="flex-1">
        <div style={{ color: '#ff3333', fontSize: '11px', marginBottom: '4px' }}>DEFENDER LOSSES</div>
        {defenderLosses.items.length === 0
          ? <div style={{ color: 'rgba(0, 255, 136, 0.3)', fontSize: '10px' }}>No losses</div>
          : defenderLosses.items.map((item, i) => (
            <div key={i} style={{ fontSize: '10px', color: 'rgba(0, 255, 136, 0.5)' }}>
              {item.count}x {item.name} — {item.totalCost} pts
            </div>
          ))
        }
        <div style={{ fontSize: '11px', marginTop: '4px' }}>
          Total: <span style={{ color: '#ff3333' }}>{defenderLosses.totalCost} pts</span>
        </div>
      </div>

      <div className="flex-1">
        <div style={{ color: '#3399ff', fontSize: '11px', marginBottom: '4px' }}>ATTACKER LOSSES</div>
        {attackerLosses.items.length === 0
          ? <div style={{ color: 'rgba(0, 255, 136, 0.3)', fontSize: '10px' }}>No losses</div>
          : attackerLosses.items.map((item, i) => (
            <div key={i} style={{ fontSize: '10px', color: 'rgba(0, 255, 136, 0.5)' }}>
              {item.count}x {item.name} — {item.totalCost} pts
            </div>
          ))
        }
        <div style={{ fontSize: '11px', marginTop: '4px' }}>
          Total: <span style={{ color: '#3399ff' }}>{attackerLosses.totalCost} pts</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '10px', color: 'rgba(0, 255, 136, 0.5)' }}>EXCHANGE RATE</div>
        <div style={{ fontSize: '16px', color: '#ffaa00' }}>{exchangeRate}</div>
      </div>
    </div>
  );
}

function GradePanel({ label, effectiveness, isPlayer, isDefender }) {
  const gradeColor = GRADE_COLORS[effectiveness.grade] || '#00ff88';
  const c = effectiveness.components;

  return (
    <div
      className="flex-1 text-center"
      style={{
        padding: '12px',
        border: isPlayer ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid rgba(0, 255, 136, 0.1)',
        backgroundColor: isPlayer ? 'rgba(0, 255, 136, 0.03)' : 'transparent',
      }}
    >
      <div style={{
        fontSize: '11px',
        color: isDefender ? '#ff3333' : '#3399ff',
        letterSpacing: '2px',
        marginBottom: '8px',
      }}>
        {label} {isPlayer ? '(YOU)' : ''}
      </div>

      {/* Grade */}
      <div style={{
        fontSize: '36px',
        fontWeight: 'bold',
        color: gradeColor,
        textShadow: `0 0 16px ${gradeColor}`,
        lineHeight: 1,
      }}>
        {effectiveness.grade}
      </div>
      <div style={{ fontSize: '14px', color: gradeColor, marginTop: '2px' }}>
        {effectiveness.score}
      </div>

      {/* Component breakdown */}
      <div style={{ marginTop: '12px', textAlign: 'left', fontSize: '10px' }}>
        <Row
          label={isDefender ? 'Oil Denial' : 'Oil Delivered'}
          value={`${c.oilRate}%`}
        />
        <Row label="Cost Efficiency" value={`${c.costEfficiency}%`} />
        <Row label="Exchange Rate" value={`${c.exchangeRate}`} />
        <Row label="Survival Rate" value={`${c.survivalRate}%`} />
      </div>
    </div>
  );
}

function BudgetTable({ defBudget, atkBudget }) {
  return (
    <div style={{ fontSize: '10px' }}>
      <div className="flex justify-between" style={{ color: 'rgba(0, 255, 136, 0.4)' }}>
        <span>FACTION</span>
        <span>SPENT</span>
      </div>
      <div className="flex justify-between mt-1">
        <span style={{ color: '#ff3333' }}>DEF</span>
        <span>{defBudget.spent} pts</span>
      </div>
      <div className="flex justify-between mt-1">
        <span style={{ color: '#3399ff' }}>ATK</span>
        <span>{atkBudget.spent} pts</span>
      </div>
    </div>
  );
}

function AmmoTable({ defAmmo, atkAmmo }) {
  return (
    <div style={{ fontSize: '10px' }}>
      <div className="flex justify-between" style={{ color: 'rgba(0, 255, 136, 0.4)' }}>
        <span>FACTION</span>
        <span>FIRED</span>
        <span>HIT RATE</span>
      </div>
      <div className="flex justify-between mt-1">
        <span style={{ color: '#ff3333' }}>DEF</span>
        <span>{defAmmo.totalFired}</span>
        <span>{(defAmmo.hitRate * 100).toFixed(0)}%</span>
      </div>
      <div className="flex justify-between mt-1">
        <span style={{ color: '#3399ff' }}>ATK</span>
        <span>{atkAmmo.totalFired}</span>
        <span>{(atkAmmo.hitRate * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className="flex justify-between" style={{ marginTop: '2px' }}>
      <span style={{ color: 'rgba(0, 255, 136, 0.5)' }}>{label}:</span>
      <span style={{ color: color || '#00ff88' }}>{value}</span>
    </div>
  );
}

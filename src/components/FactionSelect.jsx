import { useState } from 'react';
import { PHASES, DIFFICULTY_INFO } from '../data/constants';

const FACTIONS = [
  {
    id: 'DEFENDER',
    title: 'DEFENDER',
    subtitle: 'IRANIAN COASTAL COMMAND',
    color: '#ff3333',
    lines: [
      '"Close the strait.',
      ' Deny passage.',
      ' Destroy the',
      ' tankers."',
    ],
  },
  {
    id: 'ATTACKER',
    title: 'ATTACKER',
    subtitle: 'COALITION NAVAL ESCORT',
    color: '#3399ff',
    lines: [
      '"Escort the convoy.',
      ' Protect the tankers.',
      ' Keep the oil',
      ' flowing."',
    ],
  },
];

const DIFFICULTY_KEYS = ['ADVISORY', 'ELEVATED', 'SEVERE', 'CRITICAL'];

export default function FactionSelect({ dispatch }) {
  const [selectedFaction, setSelectedFaction] = useState(null);

  // Step 2: Difficulty selection
  if (selectedFaction) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 select-none px-4">
        <h2
          className="text-2xl font-bold tracking-widest text-glow-strong"
          style={{ color: 'var(--color-text)' }}
        >
          SELECT THREAT LEVEL
        </h2>

        <div className="flex flex-col gap-3 w-full max-w-lg mt-4" role="group" aria-label="Difficulty selection">
          {DIFFICULTY_KEYS.map((key) => {
            const info = DIFFICULTY_INFO[key];
            return (
              <button
                key={key}
                className="crt-button text-left px-6 py-3"
                aria-label={`${info.name} difficulty — ${info.description}`}
                onClick={() =>
                  dispatch({
                    type: 'SELECT_FACTION_AND_DIFFICULTY',
                    faction: selectedFaction,
                    difficulty: key,
                  })
                }
              >
                <span className="font-bold tracking-wider">{info.name.toUpperCase()}</span>
                <span
                  className="block text-xs mt-1 opacity-60"
                  style={{ color: 'var(--color-text)' }}
                >
                  {info.description}
                </span>
              </button>
            );
          })}
        </div>

        <button
          className="crt-button mt-6 text-sm py-2 px-6"
          onClick={() => setSelectedFaction(null)}
        >
          ← Back
        </button>
      </div>
    );
  }

  // Step 1: Faction selection
  return (
    <div className="flex flex-col items-center justify-center h-full select-none px-4">
      <h2
        className="text-2xl font-bold tracking-widest text-glow-strong mb-8"
        style={{ color: 'var(--color-text)' }}
      >
        SELECT YOUR COMMAND
      </h2>

      <div className="flex flex-col sm:flex-row gap-0 w-full max-w-3xl" role="group" aria-label="Faction selection">
        {FACTIONS.map((f, i) => (
          <button
            key={f.id}
            className="flex-1 group cursor-pointer transition-all duration-200"
            aria-label={`Select ${f.title} — ${f.subtitle}`}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              borderRight: i === 0 ? '1px solid rgba(0,255,136,0.2)' : 'none',
            }}
            onClick={() => setSelectedFaction(f.id)}
          >
            <div
              className="flex flex-col items-center justify-center py-12 px-6 transition-all duration-200 hover:bg-opacity-10"
              style={{
                '--hover-color': f.color,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${f.color}11`;
                e.currentTarget.style.boxShadow = `inset 0 0 30px ${f.color}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span
                className="text-xl font-bold tracking-widest mb-2"
                style={{ color: f.color }}
              >
                ★ {f.title} ★
              </span>
              <span
                className="text-xs tracking-wider mb-6 opacity-80"
                style={{ color: f.color }}
              >
                {f.subtitle}
              </span>
              <div className="text-sm mb-8" style={{ color: f.color, opacity: 0.7, fontFamily: 'Courier New, monospace' }}>
                {f.lines.map((line, j) => (
                  <div key={j}>{line}</div>
                ))}
              </div>
              <span
                className="crt-button text-sm py-2 px-8"
                style={{ borderColor: f.color, color: f.color }}
              >
                SELECT
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        className="crt-button mt-8 text-sm py-2 px-6"
        onClick={() => dispatch({ type: 'SET_PHASE', phase: PHASES.MENU })}
      >
        ← Back
      </button>
    </div>
  );
}

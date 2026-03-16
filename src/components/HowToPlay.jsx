import { PHASES } from '../data/constants';

const SECTIONS = [
  {
    title: 'OVERVIEW',
    content: [
      'HORMUZ is an asymmetric tower-defense strategy game set in the Strait of Hormuz.',
      'One side defends the coastline to deny passage; the other escorts an oil convoy through.',
      'Plan your forces, then watch the engagement unfold in a real-time auto-battle simulation.',
    ],
  },
  {
    title: 'FACTIONS',
    content: [
      'DEFENDER — Iranian Coastal Command',
      '  Place coastal missile batteries, radar stations, naval vessels, mines, and aircraft',
      '  along the Iranian coast and strategic islands. Your goal: destroy all tankers.',
      '',
      'ATTACKER — Coalition Naval Escort',
      '  Choose a convoy route and position escort warships, submarines, aircraft, and',
      '  electronic warfare assets. Your goal: get at least one tanker through safely.',
    ],
  },
  {
    title: 'PLANNING PHASE',
    content: [
      'You receive a budget based on faction and difficulty level.',
      'Place assets into designated zones on the map:',
      '  - Click an asset in the equipment panel to select it',
      '  - Click a valid placement zone on the map to deploy',
      '  - Aircraft and EW assets are assigned to patrol/CAP stations, then launch into the fight at sim start',
      '  - Right-click a placed asset to remove it and refund the cost',
      '  - Attackers must also select a convoy route (Alpha, Bravo, or Charlie)',
      '',
      'Each zone has a capacity limit. Coastal batteries require radar coverage to fire.',
      'Press COMMENCE OPERATION when ready.',
    ],
  },
  {
    title: 'SIMULATION PHASE',
    content: [
      'The battle plays out automatically at adjustable speed (1x, 2x, 4x, 8x).',
      'Watch your forces engage the enemy in real-time.',
      '',
      'You have 3 faction-specific abilities with cooldowns:',
      '  DEFENDER: Concentrate Fire, Scramble Reserves, Activate Decoys',
      '  ATTACKER: Emergency Evasion, Tomahawk Strike, Smoke Screen',
      '',
      'The event log shows combat events in DEFCON-style terse format.',
      'The simulation ends when all tankers are destroyed/escaped or time runs out.',
    ],
  },
  {
    title: 'WAR SCORE',
    content: [
      'After the battle, your performance is graded on four factors:',
      '  - Oil Objective (40%): Tankers destroyed vs escaped',
      '  - Cost Efficiency (25%): Damage dealt per point spent',
      '  - Exchange Rate (20%): Value of enemy assets destroyed vs yours lost',
      '  - Survival (15%): Percentage of your forces that survived',
      '',
      'Letter grades: S (90+), A (80+), B+ (70+), B (60+), C+ (50+), C (40+), D (30+), F (<30)',
    ],
  },
  {
    title: 'CONTROLS',
    content: [
      '  Left-click   — Select / place asset',
      '  Right-click   — Remove placed asset (refund)',
      '  Hover         — View asset stats tooltip',
      '  Scroll        — Zoom map (if supported)',
      '  1-4 keys      — Set simulation speed',
      '  Space         — Pause/resume simulation',
    ],
  },
];

export default function HowToPlay({ dispatch }) {
  return (
    <div className="flex flex-col h-full select-none">
      <div
        className="flex-1 overflow-y-auto px-6 py-8"
        style={{ fontFamily: '"Courier New", monospace' }}
      >
        <div className="max-w-2xl mx-auto">
          <h1
            className="text-2xl font-bold tracking-widest text-glow-strong mb-8"
            style={{ color: 'var(--color-text)' }}
          >
            HOW TO PLAY
          </h1>

          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-8">
              <h2
                className="text-sm font-bold tracking-widest mb-3"
                style={{ color: '#00ff88' }}
              >
                {section.title}
              </h2>
              <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text)', opacity: 0.8 }}>
                {section.content.map((line, i) => (
                  <div key={i} className={line === '' ? 'h-3' : ''}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            className="crt-button mt-4 mb-8 text-sm py-2 px-6"
            onClick={() => dispatch({ type: 'SET_PHASE', phase: PHASES.MENU })}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

import { PHASES, BUDGETS } from '../data/constants';
import { defenderEquipment } from '../data/defenderEquipment';
import { attackerEquipment } from '../data/attackerEquipment';

// Group equipment by category for display
function groupEquipment(equipment) {
  const groups = {};
  for (const item of equipment) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return groups;
}

// Category display names
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

// Key stat to highlight per equipment
function getKeyStat(item) {
  if (item.radarRange > 0 && item.damage === 0) return `${item.radarRange}nm detection`;
  if (item.weaponRange > 0) return `${item.weaponRange}nm range, ${item.damage} dmg`;
  if (item.isEW) return `${item.jammingRadius}nm jamming radius`;
  if (item.isMinesweeper) return `${item.sweepRadius}nm sweep radius`;
  if (item.category === 'MINE_LAYER') return `${item.ammo} contact mines`;
  if (item.isDrone) return `${item.droneCount} loitering munitions`;
  return `${item.hp} HP`;
}

const DEFENDER_BRIEFING = {
  mission: 'DENY PASSAGE',
  objective: 'Destroy or disable all enemy tankers before they reach the Gulf of Oman.',
  context: [
    'The Strait of Hormuz is 21nm wide at its narrowest. You control',
    'the Iranian coastline, four strategic islands, and coastal waters.',
    'The enemy will attempt to escort an oil convoy through the strait.',
    'Your mission is to prevent any tanker from reaching open water.',
  ],
  intel: [
    'Coastal batteries REQUIRE radar coverage to fire',
    'Mines are invisible until swept or detonated',
    'The enemy does not know your placements',
  ],
};

const ATTACKER_BRIEFING = {
  mission: 'ESCORT CONVOY',
  objective: 'Get at least 1 tanker safely through the Strait of Hormuz to the Gulf of Oman.',
  context: [
    'Five oil tankers must transit the Strait of Hormuz under escort.',
    'Iranian forces have fortified the coastline and mined the narrows.',
    'Your fleet must protect the convoy from air, surface, and subsurface threats.',
    'At least one tanker must reach the exit point to claim victory.',
  ],
  intel: [
    'Route selection determines convoy path — choose wisely',
    'Minesweepers detect mines in a 3nm radius — keep them ahead of the convoy',
    'Enemy placements are hidden until detected by your radar',
    'EA-18G Growler jams enemy radar in 40nm radius',
  ],
};

export default function Briefing({ gameState, dispatch }) {
  const { playerFaction, difficulty } = gameState;
  const isDefender = playerFaction === 'DEFENDER';
  const briefing = isDefender ? DEFENDER_BRIEFING : ATTACKER_BRIEFING;
  const equipment = isDefender ? defenderEquipment : attackerEquipment;
  const groups = groupEquipment(equipment);
  const budget = BUDGETS[difficulty]?.[playerFaction] ?? 0;
  const factionColor = isDefender ? '#ff3333' : '#3399ff';

  return (
    <div className="flex flex-col h-full select-none">
      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto px-6 py-8"
        style={{ fontFamily: '"Courier New", monospace' }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <h1
            className="text-xl font-bold tracking-widest text-glow-strong mb-1"
            style={{ color: factionColor }}
          >
            OPERATION HORMUZ — {playerFaction} BRIEFING
          </h1>
          <p className="text-xs tracking-wider mb-8 opacity-40" style={{ color: 'var(--color-text)' }}>
            CLASSIFICATION: TOP SECRET
          </p>

          {/* Mission */}
          <Section label="MISSION" color={factionColor}>
            {briefing.mission}
          </Section>

          <Section label="OBJECTIVE" color={factionColor}>
            {briefing.objective}
          </Section>

          {/* Strategic Context */}
          <Section label="STRATEGIC CONTEXT" color={factionColor}>
            {briefing.context.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </Section>

          {/* Budget */}
          <Section label="BUDGET" color={factionColor}>
            <span className="text-lg font-bold">{budget} POINTS</span>
            <span className="text-xs opacity-50 ml-3">({difficulty} difficulty)</span>
          </Section>

          {/* Equipment Roster */}
          <Section label="AVAILABLE ASSETS" color={factionColor}>
            {Object.entries(groups).map(([category, items]) => (
              <div key={category} className="mb-4">
                <div className="text-xs tracking-wider opacity-50 mb-1">
                  {CATEGORY_LABELS[category] || category}:
                </div>
                {items.map((item) => (
                  <div key={item.id} className="ml-4 mb-1 text-sm">
                    <span style={{ color: factionColor }}>- {item.name}</span>
                    <span className="opacity-50"> ({item.cost} pts)</span>
                    <span className="opacity-40"> — {getKeyStat(item)}</span>
                  </div>
                ))}
              </div>
            ))}
          </Section>

          {/* Key Intel */}
          <Section label="KEY INTEL" color={factionColor}>
            {briefing.intel.map((line, i) => (
              <div key={i} className="ml-4 mb-1">
                <span className="opacity-50">- </span>
                {line}
              </div>
            ))}
          </Section>

          {/* Action buttons */}
          <div className="flex items-center gap-4 mt-10 mb-6">
            <button
              className="crt-button py-3 px-8 text-base font-bold tracking-wider"
              style={{ borderColor: factionColor, color: factionColor }}
              onClick={() => dispatch({ type: 'START_PLANNING' })}
            >
              COMMENCE PLANNING
            </button>
            <button
              className="crt-button text-sm py-2 px-6"
              onClick={() => dispatch({ type: 'GO_TO_FACTION_SELECT' })}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, color, children }) {
  return (
    <div className="mb-6">
      <div
        className="text-xs font-bold tracking-widest mb-2"
        style={{ color }}
      >
        {label}:
      </div>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text)', opacity: 0.8 }}>
        {children}
      </div>
    </div>
  );
}

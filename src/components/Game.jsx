import { useReducer, useState, useCallback, useEffect } from 'react';
import { PHASES, BUDGETS, SIMULATION } from '../data/constants';
import MainMenu from './MainMenu';
import FactionSelect from './FactionSelect';
import Briefing from './Briefing';
import HowToPlay from './HowToPlay';
import MapViewer from './MapViewer';
import Settings from './Settings';
import PlanningPhase from './PlanningPhase/PlanningPhase';
import SimulationPhase from './SimulationPhase/SimulationPhase';
import WarScore from './WarScore';

const DEFAULT_SETTINGS = {
  defaultSpeed: SIMULATION.DEFAULT_SPEED,
  highContrast: false,
  showFps: false,
};

const initialGameState = {
  phase: PHASES.MENU,
  playerFaction: null,
  difficulty: null,
  playerBudget: 0,
  aiBudget: 0,
  playerPlacements: [],
  aiPlacements: [],
  selectedRoute: null,
  tankerAllocation: null,
  simulationResult: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'SELECT_FACTION_AND_DIFFICULTY': {
      const { faction, difficulty } = action;
      const budgets = BUDGETS[difficulty];
      const aiFaction = faction === 'DEFENDER' ? 'ATTACKER' : 'DEFENDER';
      return {
        ...state,
        phase: PHASES.BRIEFING,
        playerFaction: faction,
        difficulty,
        playerBudget: budgets[faction],
        aiBudget: budgets[aiFaction],
      };
    }

    case 'START_PLANNING':
      return { ...state, phase: PHASES.PLANNING };

    case 'SET_PLACEMENTS':
      return { ...state, playerPlacements: action.placements };

    case 'SET_AI_PLACEMENTS':
      return { ...state, aiPlacements: action.placements };

    case 'SET_ROUTE':
      return { ...state, selectedRoute: action.route };

    case 'SET_TANKER_ALLOCATION':
      return { ...state, tankerAllocation: action.tankerAllocation };

    case 'START_SIMULATION':
      return { ...state, phase: PHASES.SIMULATION };

    case 'SET_SIMULATION_RESULT':
      return { ...state, simulationResult: action.result, phase: PHASES.WAR_SCORE };

    case 'RESET':
      return { ...initialGameState };

    case 'GO_TO_FACTION_SELECT':
      return { ...initialGameState, phase: PHASES.FACTION_SELECT };

    case 'RESTART_PLANNING':
      return {
        ...state,
        phase: PHASES.PLANNING,
        playerPlacements: [],
        aiPlacements: [],
        selectedRoute: null,
        tankerAllocation: null,
        simulationResult: null,
      };

    default:
      return state;
  }
}

export default function Game() {
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // Apply high-contrast class to root element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [settings.highContrast]);

  // aria-live region for phase transitions
  const phaseLabel = {
    [PHASES.MENU]: 'Main Menu',
    [PHASES.FACTION_SELECT]: 'Faction Selection',
    [PHASES.BRIEFING]: 'Mission Briefing',
    [PHASES.PLANNING]: 'Planning Phase',
    [PHASES.SIMULATION]: 'Simulation Running',
    [PHASES.WAR_SCORE]: 'After Action Report',
    [PHASES.SETTINGS]: 'Settings',
    [PHASES.HOW_TO_PLAY]: 'How to Play',
  }[gameState.phase] || '';

  const renderPhase = () => {
    switch (gameState.phase) {
      case PHASES.MENU:
        return <MainMenu dispatch={dispatch} />;

      case PHASES.FACTION_SELECT:
        return <FactionSelect dispatch={dispatch} />;

      case PHASES.HOW_TO_PLAY:
        return <HowToPlay dispatch={dispatch} />;

      case PHASES.SETTINGS:
        return (
          <Settings
            settings={settings}
            onUpdateSettings={updateSettings}
            onBack={() => dispatch({ type: 'SET_PHASE', phase: PHASES.MENU })}
          />
        );

      case PHASES.BRIEFING:
        return <Briefing gameState={gameState} dispatch={dispatch} />;

      case PHASES.PLANNING:
        return <PlanningPhase gameState={gameState} dispatch={dispatch} settings={settings} />;

      case PHASES.SIMULATION:
        return <SimulationPhase gameState={gameState} dispatch={dispatch} settings={settings} />;

      case PHASES.WAR_SCORE:
        return <WarScore gameState={gameState} dispatch={dispatch} />;

      case PHASES.MAP_VIEWER:
        return <MapViewer dispatch={dispatch} />;

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Screen reader phase announcer */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {phaseLabel}
      </div>

      {renderPhase()}

      {/* Small screen warning */}
      <div className="small-screen-block" role="alert">
        <div className="small-screen-block-content">
          <div className="text-glow-strong" style={{ fontSize: '24px', color: 'var(--color-text)' }}>
            HORMUZ
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(0, 255, 136, 0.6)', marginTop: '12px' }}>
            REQUIRES A WIDER DISPLAY
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(0, 255, 136, 0.4)', marginTop: '8px' }}>
            PLEASE ROTATE YOUR DEVICE OR USE A LARGER SCREEN
          </div>
        </div>
      </div>

      <div className="crt-overlay" />
      <div className="crt-vignette" />
    </div>
  );
}

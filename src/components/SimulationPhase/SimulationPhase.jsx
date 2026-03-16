// SimulationPhase — orchestrator connecting the simulation engine to the UI
// GDD Section 7

import { useRef, useEffect, useState, useCallback } from 'react';
import { SIMULATION, MAP } from '../../data/constants.js';
import { distance } from '../../utils/geometry.js';
import SimulationEngine from '../../engine/SimulationEngine.js';
import AbilitySystem from '../../engine/AbilitySystem.js';
import AIAbilities from '../../engine/AIAbilities.js';
import SimCanvas from './SimCanvas.jsx';
import SimHUD from './SimHUD.jsx';
import EventLog from './EventLog.jsx';
import AbilityBar from './AbilityBar.jsx';

const NM_TO_WORLD = MAP.NM_TO_WORLD;

// Throttle React state updates to every N ticks
const HUD_UPDATE_INTERVAL = 5;

export default function SimulationPhase({ gameState, dispatch, settings = {} }) {
  const engineRef = useRef(null);
  const abilityRef = useRef(null);
  const aiAbilityRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const tickCountRef = useRef(0);

  // React state for HUD elements only (throttled updates)
  const [hudState, setHudState] = useState({
    gameTime: 0,
    speed: SIMULATION.DEFAULT_SPEED,
    tankers: [],
    events: [],
    abilities: [],
    isComplete: false,
  });

  // Targeting mode for abilities
  const [targetingMode, setTargetingMode] = useState(null); // null | 'ENTITY' | 'TANKER' | 'POINT' | 'FIXED_EMPLACEMENT'
  const [targetingAbilityId, setTargetingAbilityId] = useState(null);

  // Initialize engine on mount
  useEffect(() => {
    const engine = new SimulationEngine({
      playerFaction: gameState.playerFaction,
      difficulty: gameState.difficulty,
      playerPlacements: gameState.playerPlacements,
      aiPlacements: gameState.aiPlacements,
      selectedRoute: gameState.selectedRoute,
      aiRoute: gameState.selectedRoute,
      tankerAllocation: gameState.tankerAllocation,
      rngSeed: Date.now(),
    });

    const abilities = new AbilitySystem(gameState.playerFaction);
    const aiFaction = gameState.playerFaction === 'DEFENDER' ? 'ATTACKER' : 'DEFENDER';
    const aiAbilities = new AIAbilities(aiFaction, gameState.difficulty);

    engineRef.current = engine;
    abilityRef.current = abilities;
    aiAbilityRef.current = aiAbilities;
    engine.start();

    // Initial HUD state
    updateHudState(engine, abilities);

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, []);

  // Tick loop — runs at tickRate interval
  useEffect(() => {
    const tickMs = 1000 / SIMULATION.TICK_RATE;

    tickIntervalRef.current = setInterval(() => {
      const engine = engineRef.current;
      const abilities = abilityRef.current;
      if (!engine || !engine.isRunning || engine.isComplete) return;

      // Run engine tick
      engine.tick();

      // Process ability tick effects (decoy expiry, forced target expiry, etc.)
      const deltaTime = (1 / engine.tickRate) * engine.speedMultiplier;
      if (abilities) {
        abilities.update(deltaTime);
        abilities.processTickEffects(engine);
      }

      // AI ability usage
      const aiAb = aiAbilityRef.current;
      if (aiAb) {
        aiAb.update(engine, deltaTime);
      }

      tickCountRef.current++;

      // Throttled HUD state updates
      if (tickCountRef.current % HUD_UPDATE_INTERVAL === 0) {
        updateHudState(engine, abilities);
      }

      // Check if sim ended this tick
      if (engine.isComplete) {
        updateHudState(engine, abilities);
        // Transition to WAR_SCORE after a brief delay
        setTimeout(() => {
          dispatch({
            type: 'SET_SIMULATION_RESULT',
            result: {
              winner: engine.winner,
              winReason: engine.winReason,
              gameTime: engine.gameTime,
              events: engine.events,
              entities: engine.entities,
              destroyedEntities: engine.destroyedEntities,
              playerFaction: gameState.playerFaction,
              difficulty: gameState.difficulty,
            },
          });
        }, 3000);
      }
    }, tickMs);

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [dispatch, gameState.playerFaction, gameState.difficulty]);

  function updateHudState(engine, abilities) {
    const tankers = engine.entities.filter(e => e.type === 'TANKER');
    setHudState({
      gameTime: engine.gameTime,
      speed: engine.speedMultiplier,
      tankers: tankers.map(t => ({
        name: t.name,
        hp: t.hp,
        maxHp: t.maxHp,
        isDestroyed: t.isDestroyed,
        hasEscaped: t.hasEscaped,
        progress: t.progress,
      })),
      events: [...engine.events],
      abilities: abilities ? abilities.getAbilityStates() : [],
      isComplete: engine.isComplete,
    });
  }

  // Speed change handler
  const handleSpeedChange = useCallback((speed) => {
    const engine = engineRef.current;
    if (engine && engine.isRunning) {
      engine.setSpeed(speed);
      setHudState(prev => ({ ...prev, speed }));
    }
  }, []);

  const pauseSimulation = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.isComplete) return;
    engine.pause();
    setShowPauseMenu(true);
  }, []);

  const resumeSimulation = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.isComplete) return;
    engine.start();
    setShowPauseMenu(false);
    updateHudState(engine, abilityRef.current);
  }, []);

  // Ability activation handler
  const handleAbilityActivate = useCallback((abilityId) => {
    const abilities = abilityRef.current;
    if (!abilities) return;

    const ability = abilities.abilities.find(a => a.id === abilityId);
    if (!ability || !ability.isReady || ability.isExpended) return;

    // If ability needs targeting, enter targeting mode
    if (ability.requiresTarget) {
      setTargetingMode(ability.requiresTarget);
      setTargetingAbilityId(abilityId);
      return;
    }

    // Auto-activate abilities (no target needed)
    const engine = engineRef.current;
    const event = abilities.activate(abilityId, engine, null);
    if (event) {
      engine.events.push({
        tick: engine.currentTick,
        gameTime: engine.gameTime,
        type: event.type,
        data: event,
      });
      updateHudState(engine, abilities);
    }
  }, []);

  // Canvas click handler — used for ability targeting
  const handleCanvasClick = useCallback((worldPos) => {
    if (!targetingMode || !targetingAbilityId) return;

    const engine = engineRef.current;
    const abilities = abilityRef.current;
    if (!engine || !abilities) return;

    let target = null;

    switch (targetingMode) {
      case 'ENTITY': {
        // Find nearest detected enemy entity near click
        target = findNearestEntity(engine, worldPos, e =>
          e.faction !== gameState.playerFaction && !e.isDestroyed &&
          e.detectedBy.has(gameState.playerFaction)
        );
        break;
      }
      case 'TANKER': {
        target = findNearestEntity(engine, worldPos, e =>
          e.type === 'TANKER' && !e.isDestroyed && !e.hasEscaped
        );
        break;
      }
      case 'FIXED_EMPLACEMENT': {
        target = findNearestEntity(engine, worldPos, e =>
          e.type === 'FIXED' && !e.isDestroyed &&
          e.detectedBy.has(gameState.playerFaction)
        );
        break;
      }
      case 'POINT': {
        target = worldPos;
        break;
      }
    }

    if (!target) return;

    const event = abilities.activate(targetingAbilityId, engine, target);
    if (event) {
      engine.events.push({
        tick: engine.currentTick,
        gameTime: engine.gameTime,
        type: event.type,
        data: event,
      });
      updateHudState(engine, abilities);
    }

    // Exit targeting mode
    setTargetingMode(null);
    setTargetingAbilityId(null);
  }, [targetingMode, targetingAbilityId, gameState.playerFaction]);

  // Keyboard shortcut help overlay
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Pause menu
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Escape — cancel targeting, close overlays, or show pause menu
      if (e.key === 'Escape') {
        if (targetingMode) {
          setTargetingMode(null);
          setTargetingAbilityId(null);
          return;
        }
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (showPauseMenu) {
          resumeSimulation();
          return;
        }
        // Show pause menu
        pauseSimulation();
        return;
      }

      // ? — toggle shortcut overlay
      if (e.key === '?') {
        setShowShortcuts(prev => !prev);
        return;
      }

      // 1/2/3 — activate ability
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 3) {
        const abilities = abilityRef.current;
        if (abilities && abilities.abilities[num - 1]) {
          handleAbilityActivate(abilities.abilities[num - 1].id);
        }
        return;
      }

      // [ ] — decrease/increase speed
      if (e.key === '[') {
        const engine = engineRef.current;
        if (engine) {
          const speeds = SIMULATION.SPEEDS;
          const idx = speeds.indexOf(engine.speedMultiplier);
          if (idx > 0) handleSpeedChange(speeds[idx - 1]);
        }
        return;
      }
      if (e.key === ']') {
        const engine = engineRef.current;
        if (engine) {
          const speeds = SIMULATION.SPEEDS;
          const idx = speeds.indexOf(engine.speedMultiplier);
          if (idx < speeds.length - 1) handleSpeedChange(speeds[idx + 1]);
        }
        return;
      }

      // Space — pause/resume (toggle between speed 0 and previous speed)
      if (e.key === ' ') {
        e.preventDefault();
        const engine = engineRef.current;
        if (engine) {
          if (engine.isRunning) {
            pauseSimulation();
          } else {
            resumeSimulation();
          }
        }
        return;
      }

      // F — toggle FPS counter (dev)
      if (e.key === 'f' || e.key === 'F') {
        // Toggle via SimCanvas showFps prop (handled via settings)
        return;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targetingMode, showShortcuts, showPauseMenu, handleAbilityActivate, handleSpeedChange, pauseSimulation, resumeSimulation]);

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: '#0a0a14' }}>
      {/* Canvas — full viewport */}
      <SimCanvas
        engineRef={engineRef}
        playerFaction={gameState.playerFaction}
        onCanvasClick={handleCanvasClick}
        targetingMode={targetingMode}
        showFps={settings.showFps}
      />

      {/* HUD Top Bar */}
      <SimHUD
        gameTime={hudState.gameTime}
        speed={hudState.speed}
        tankers={hudState.tankers}
        onSpeedChange={handleSpeedChange}
      />

      {/* Event Log — bottom left */}
      <EventLog events={hudState.events} />

      {/* Ability Bar — bottom right */}
      <AbilityBar
        abilities={hudState.abilities}
        playerFaction={gameState.playerFaction}
        onActivate={handleAbilityActivate}
        targetingAbility={targetingAbilityId}
      />

      {/* Pause menu overlay */}
      {showPauseMenu && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 35 }}
        >
          <div
            style={{
              fontFamily: '"Courier New", monospace',
              textAlign: 'center',
              padding: '30px 50px',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              backgroundColor: 'rgba(10, 10, 20, 0.95)',
            }}
          >
            <div style={{ fontSize: '18px', color: '#00ff88', marginBottom: '24px', letterSpacing: '3px', textTransform: 'uppercase' }}>
              PAUSED
            </div>
            <div className="flex flex-col gap-3">
              <button
                className="crt-button py-2 px-8"
                onClick={resumeSimulation}
                aria-label="Resume simulation"
              >
                RESUME
              </button>
              <button
                className="crt-button py-2 px-8"
                onClick={() => dispatch({ type: 'RESTART_PLANNING' })}
                aria-label="Restart from planning phase"
              >
                RESTART
              </button>
              <button
                className="crt-button py-2 px-8"
                onClick={() => dispatch({ type: 'RESET' })}
                aria-label="Return to main menu"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcut overlay */}
      {showShortcuts && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 30 }}
          onClick={() => setShowShortcuts(false)}
        >
          <div
            style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '12px',
              color: '#00ff88',
              padding: '20px 30px',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              backgroundColor: 'rgba(10, 10, 20, 0.95)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            <div style={{ fontSize: '14px', marginBottom: '12px', color: '#ffaa00' }}>KEYBOARD SHORTCUTS</div>
            {[
              ['1 / 2 / 3', 'Activate ability'],
              ['[  /  ]', 'Decrease / increase speed'],
              ['Space', 'Pause / resume'],
              ['Escape', 'Cancel targeting'],
              ['?', 'Toggle this overlay'],
            ].map(([key, desc]) => (
              <div key={key} className="flex gap-4 py-1">
                <span style={{ color: '#ffaa00', width: '100px', textAlign: 'right' }}>{key}</span>
                <span style={{ color: 'rgba(0, 255, 136, 0.7)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulation Complete overlay */}
      {hudState.isComplete && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 20 }}
        >
          <div
            style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '24px',
              color: '#00ff88',
              textShadow: '0 0 12px #00ff88',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            <div>Operation Complete</div>
            <div style={{ fontSize: '16px', marginTop: '8px', color: '#ffaa00' }}>
              {engineRef.current?.winner === 'DEFENDER'
                ? 'Iranian Coastal Command Victory'
                : 'Coalition Naval Escort Victory'
              }
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(0, 255, 136, 0.5)' }}>
              Loading War Score...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Find the nearest entity to a world position that matches a filter.
 */
function findNearestEntity(engine, worldPos, filter) {
  let best = null;
  let bestDist = 30; // Must click within ~30 world units

  for (const entity of engine.entities) {
    if (!filter(entity)) continue;
    const d = distance(worldPos, entity.position);
    if (d < bestDist) {
      bestDist = d;
      best = entity;
    }
  }

  return best;
}

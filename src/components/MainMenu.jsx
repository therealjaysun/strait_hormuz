import { PHASES } from '../data/constants';

export default function MainMenu({ dispatch }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4 select-none"
      role="main"
      aria-label="Main Menu"
    >
      {/* Title */}
      <h1
        className="text-6xl font-bold tracking-widest text-glow-strong mb-2"
        style={{ color: 'var(--color-text)' }}
      >
        HORMUZ
      </h1>
      <p
        className="text-sm tracking-wider mb-12 opacity-60"
        style={{ color: 'var(--color-text)' }}
      >
        Strait of Hormuz — Tactical Command
      </p>

      {/* Menu buttons */}
      <nav className="flex flex-col gap-4 w-72" aria-label="Main navigation">
        <button
          className="crt-button"
          onClick={() => dispatch({ type: 'SET_PHASE', phase: PHASES.FACTION_SELECT })}
          aria-label="Start a new skirmish"
        >
          New Skirmish
        </button>
        <button
          className="crt-button"
          onClick={() => dispatch({ type: 'SET_PHASE', phase: PHASES.HOW_TO_PLAY })}
          aria-label="How to play"
        >
          How to Play
        </button>
        <button
          className="crt-button"
          onClick={() => dispatch({ type: 'SET_PHASE', phase: PHASES.SETTINGS })}
          aria-label="Open settings"
        >
          Settings
        </button>
        <button
          className="crt-button"
          onClick={() => dispatch({ type: 'SET_PHASE', phase: PHASES.MAP_VIEWER })}
          style={{ opacity: 0.5, fontSize: '0.75rem' }}
          aria-label="Open development map viewer"
        >
          [DEV] Map Viewer
        </button>
      </nav>
    </div>
  );
}

// Settings screen — configurable game options
// GDD Phase 8

import { SIMULATION } from '../data/constants.js';

const mono = { fontFamily: '"Courier New", monospace' };

export default function Settings({ settings, onUpdateSettings, onBack }) {
  const speeds = SIMULATION.SPEEDS;

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-6 select-none"
      role="dialog"
      aria-label="Game Settings"
    >
      <h2
        className="text-2xl font-bold tracking-widest text-glow-strong"
        style={{ color: 'var(--color-text)' }}
      >
        SETTINGS
      </h2>

      <div
        className="w-full max-w-lg"
        style={{
          ...mono,
          border: '1px solid rgba(0, 255, 136, 0.3)',
          padding: '24px',
          backgroundColor: 'rgba(0, 255, 136, 0.02)',
        }}
      >
        {/* Default Speed */}
        <SettingRow label="DEFAULT SPEED">
          <div className="flex gap-2">
            {speeds.map((s) => (
              <button
                key={s}
                className="crt-button text-xs py-1 px-4"
                style={{
                  backgroundColor:
                    settings.defaultSpeed === s
                      ? 'rgba(0, 255, 136, 0.2)'
                      : 'transparent',
                  borderColor:
                    settings.defaultSpeed === s
                      ? '#00ff88'
                      : 'rgba(0, 255, 136, 0.3)',
                }}
                onClick={() => onUpdateSettings({ defaultSpeed: s })}
                aria-pressed={settings.defaultSpeed === s}
                aria-label={`Speed ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>
        </SettingRow>

        {/* High Contrast */}
        <SettingRow label="HIGH CONTRAST">
          <ToggleButtons
            value={settings.highContrast}
            onChange={(v) => onUpdateSettings({ highContrast: v })}
            ariaLabel="High contrast mode"
          />
        </SettingRow>

        {/* Show FPS */}
        <SettingRow label="SHOW FPS">
          <ToggleButtons
            value={settings.showFps}
            onChange={(v) => onUpdateSettings({ showFps: v })}
            ariaLabel="Show FPS counter"
          />
        </SettingRow>

        {/* Audio placeholder */}
        <SettingRow label="AUDIO">
          <span
            style={{
              ...mono,
              fontSize: '11px',
              color: 'rgba(0, 255, 136, 0.3)',
              letterSpacing: '1px',
            }}
          >
            COMING SOON
          </span>
        </SettingRow>
      </div>

      <button
        className="crt-button mt-2"
        onClick={onBack}
        aria-label="Back to main menu"
      >
        &larr; Back
      </button>
    </div>
  );
}

function SettingRow({ label, children }) {
  return (
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid rgba(0, 255, 136, 0.1)' }}
    >
      <span
        style={{
          ...mono,
          fontSize: '12px',
          color: 'rgba(0, 255, 136, 0.7)',
          letterSpacing: '1px',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function ToggleButtons({ value, onChange, ariaLabel }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={ariaLabel}>
      <button
        className="crt-button text-xs py-1 px-4"
        style={{
          backgroundColor: value ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
          borderColor: value ? '#00ff88' : 'rgba(0, 255, 136, 0.3)',
        }}
        onClick={() => onChange(true)}
        role="radio"
        aria-checked={value}
      >
        ON
      </button>
      <button
        className="crt-button text-xs py-1 px-4"
        style={{
          backgroundColor: !value ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
          borderColor: !value ? '#00ff88' : 'rgba(0, 255, 136, 0.3)',
        }}
        onClick={() => onChange(false)}
        role="radio"
        aria-checked={!value}
      >
        OFF
      </button>
    </div>
  );
}

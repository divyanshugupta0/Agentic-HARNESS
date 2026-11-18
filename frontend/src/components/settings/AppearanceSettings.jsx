import React, { useState } from 'react';
import { Check, ChevronDown, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { APPEARANCE_THEMES, CHATGPT_THEMES, CODEX_THEMES } from '../../context/ThemeContext';
import { useTheme } from '../../hooks/useTheme';

const MODES = [
  { value: 'system', label: 'System default', description: 'Follows your device', Icon: Monitor },
  { value: 'light', label: 'Light', description: 'Light appearance', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Dark appearance', Icon: Moon }
];

const ACCENTS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' }
];

function ThemeMenu({ selected, onSelect, onClose }) {
  const sections = [
    { title: 'ChatGPT Themes', themes: CHATGPT_THEMES },
    { title: 'Codex Themes', themes: CODEX_THEMES }
  ];

  return (
    <div className="appearance-theme-menu" role="listbox" aria-label="Available themes">
      {sections.map(({ title, themes }) => (
        <section className="appearance-theme-menu__section" key={title}>
          <h5 className="appearance-theme-menu__heading">{title}</h5>
          {themes.map((theme) => (
            <button
              type="button"
              role="option"
              aria-selected={selected === theme.id}
              className="appearance-theme-menu__option"
              key={theme.id}
              onClick={() => {
                onSelect(theme.id);
                onClose();
              }}
            >
              <span className="appearance-theme-menu__swatch" aria-hidden="true">
                <span style={{ backgroundColor: theme.colors[0] }} />
                <span style={{ backgroundColor: theme.colors[1] }} />
              </span>
              <span>{theme.label}</span>
              {selected === theme.id && <Check size={15} aria-label="Selected" />}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

export function AppearanceSettings() {
  const {
    mode,
    setMode,
    colorTheme,
    setColorTheme,
    accent,
    setAccent,
    background,
    setBackground,
    foreground,
    setForeground,
    resolvedBackground,
    resolvedForeground,
    resolvedAccent,
    resetAppearance,
    restoreDefaultTheme
  } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const selectedTheme = APPEARANCE_THEMES.find(({ id }) => id === colorTheme) || CHATGPT_THEMES[0];
  const hasCustomColors = Boolean(accent || background || foreground);

  return (
    <div className="appearance-settings">
      <h2 className="appearance-settings__title">Appearance</h2>
      <h3 className="appearance-settings__section-title">Visual style</h3>

      <section className="appearance-settings__panel" aria-label="Visual style settings">
        <div className="appearance-settings__mode-row">
          <div className="appearance-settings__row-label">
            <span>Mode</span>
            <small>Choose how the workspace looks</small>
          </div>
          <div className="appearance-mode-options" role="radiogroup" aria-label="Appearance mode">
            {MODES.map(({ value, label, description, Icon }) => (
              <button
                type="button"
                role="radio"
                aria-checked={mode === value}
                aria-label={`${label}: ${description}`}
                title={`${label} — ${description}`}
                className={`appearance-mode-card${mode === value ? ' appearance-mode-card--selected' : ''}`}
                key={value}
                onClick={() => setMode(value)}
              >
                <span className={`appearance-mode-card__preview appearance-mode-card__preview--${value}`}>
                  <span className="appearance-mode-card__preview-sidebar" />
                  <span className="appearance-mode-card__preview-page">
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                <span className="appearance-mode-card__label">
                  <Icon size={14} />
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="appearance-settings__row appearance-settings__theme-row">
          <div className="appearance-settings__row-label">
            <span>Theme</span>
            <small>Choose a color palette</small>
          </div>
          <div className="appearance-theme-picker">
            <button
              type="button"
              className="appearance-theme-picker__trigger"
              aria-haspopup="listbox"
              aria-expanded={isThemeMenuOpen}
              onClick={() => setIsThemeMenuOpen((open) => !open)}
            >
              <span className="appearance-theme-menu__swatch" aria-hidden="true">
                <span style={{ backgroundColor: selectedTheme.colors[0] }} />
                <span style={{ backgroundColor: selectedTheme.colors[1] }} />
              </span>
              <span>{selectedTheme.label}</span>
              <ChevronDown size={15} className={isThemeMenuOpen ? 'appearance-theme-picker__chevron--open' : ''} />
            </button>
            {isThemeMenuOpen && (
              <>
                <button
                  type="button"
                  className="appearance-theme-menu__dismiss"
                  aria-label="Close theme menu"
                  onClick={() => setIsThemeMenuOpen(false)}
                />
                <ThemeMenu selected={colorTheme} onSelect={setColorTheme} onClose={() => setIsThemeMenuOpen(false)} />
              </>
            )}
          </div>
        </div>

        <div className="appearance-settings__row">
          <div className="appearance-settings__row-label">
            <span>Accent</span>
            <small>Buttons, links, and selected states</small>
          </div>
          <div className="appearance-accent-options" role="group" aria-label="Accent color">
            {ACCENTS.map(({ name, value }) => (
              <button
                type="button"
                key={name}
                className={`appearance-accent-swatch${(accent || resolvedAccent).toLowerCase() === value ? ' appearance-accent-swatch--selected' : ''}`}
                style={{ '--swatch-color': value }}
                aria-label={`${name} accent`}
                aria-pressed={(accent || resolvedAccent).toLowerCase() === value}
                title={name}
                onClick={() => setAccent(value)}
              >
                {(accent || resolvedAccent).toLowerCase() === value && <Check size={13} />}
              </button>
            ))}
            <label className="appearance-custom-color" title="Custom accent color">
              <input
                type="color"
                aria-label="Custom accent color"
                value={accent || resolvedAccent}
                onChange={(event) => setAccent(event.target.value)}
              />
              <span>Custom</span>
            </label>
          </div>
        </div>

        <ColorSetting
          label="Background"
          description="Workspace background color"
          value={background}
          defaultValue={resolvedBackground}
          onChange={setBackground}
        />
        <ColorSetting
          label="Foreground"
          description="Primary text color"
          value={foreground}
          defaultValue={resolvedForeground}
          onChange={setForeground}
          last
        />
      </section>

      <details className="appearance-advanced">
        <summary>Advanced</summary>
        <div className="appearance-advanced__content">
          <div>
            <strong>Theme customization</strong>
            <p>Custom accent, background, and foreground colors override the selected theme palette.</p>
          </div>
          {(hasCustomColors || colorTheme !== 'default') && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={restoreDefaultTheme}>
              <RotateCcw size={13} />
              Restore default theme
            </button>
          )}
          <button type="button" className="btn btn--secondary btn--sm" onClick={resetAppearance}>
            Reset appearance settings
          </button>
        </div>
      </details>
    </div>
  );
}

function ColorSetting({ label, description, value, defaultValue, onChange, last = false }) {
  return (
    <div className={`appearance-settings__row${last ? ' appearance-settings__row--last' : ''}`}>
      <div className="appearance-settings__row-label">
        <span>{label}</span>
        <small>{description}</small>
      </div>
      <label className="appearance-color-control">
        <span className="appearance-color-control__value">{value || defaultValue}</span>
        <input
          type="color"
          aria-label={`${label} color`}
          value={value || defaultValue}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

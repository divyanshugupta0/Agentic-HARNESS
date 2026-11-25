import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const APPEARANCE_STORAGE_KEY = 'agentic_harness_appearance';
const LEGACY_THEME_STORAGE_KEY = 'agentic_harness_theme';

export const CHATGPT_THEMES = [
  { id: 'default', label: 'Default', colors: ['#1d4ed8', '#38bdf8'] },
  { id: 'light', label: 'Light', colors: ['#2563eb', '#dbeafe'] },
  { id: 'dark', label: 'Dark', colors: ['#0f172a', '#38bdf8'] }
];

export const CODEX_THEMES = [
  { id: 'absolutely', label: 'Absolutely', colors: ['#fb8062', '#fce8df'] },
  { id: 'catppuccin', label: 'Catppuccin', colors: ['#cba6f7', '#f5c2e7'] },
  { id: 'everforest', label: 'Everforest', colors: ['#a7c080', '#d3c6aa'] },
  { id: 'github', label: 'GitHub', colors: ['#0969da', '#1f883d'] },
  { id: 'gruvbox', label: 'Gruvbox', colors: ['#d79921', '#98971a'] },
  { id: 'linear', label: 'Linear', colors: ['#8b7bff', '#d5d0ff'] },
  { id: 'notion', label: 'Notion', colors: ['#37352f', '#e9e9e7'] },
  { id: 'one', label: 'One', colors: ['#61afef', '#c678dd'] },
  { id: 'proof', label: 'Proof', colors: ['#72a89a', '#c9ded8'] }
];

export const APPEARANCE_THEMES = [...CHATGPT_THEMES, ...CODEX_THEMES];
const VALID_MODES = ['system', 'light', 'dark'];
const DEFAULT_ACCENT = '#3b82f6';
const ACCENT_PRESETS = {
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#10b981',
  orange: '#f97316',
  red: '#ef4444',
  pink: '#ec4899'
};

const PALETTES = {
  default: { dark: ['#090b10', '#0f1219', '#151a23', '#202936', '#f3f6fb', '#a6b1c2', '#7b8798'], light: ['#f5f7fb', '#edf2fb', '#e8eefb', '#dfe7f4', '#111827', '#475569', '#64748b'] },
  light: { dark: ['#10141c', '#171d27', '#202735', '#303c4d', '#f4f7fc', '#b6c1d1', '#8e9aab'], light: ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#172033', '#475569', '#64748b'] },
  dark: { dark: ['#07090d', '#0c0f14', '#141920', '#242d38', '#f5f7fa', '#aab4c2', '#7a8695'], light: ['#eef2f7', '#e3e9f1', '#d9e1eb', '#c8d2df', '#111827', '#475569', '#64748b'] },
  absolutely: { dark: ['#17100f', '#211715', '#30211e', '#47302a', '#fff4f0', '#dfbcb2', '#b89086'], light: ['#fff8f5', '#fff0e9', '#ffe8df', '#f4d8cb', '#32211d', '#705249', '#8d6a60'] },
  catppuccin: { dark: ['#1e1e2e', '#242438', '#302f46', '#45445f', '#f5e0dc', '#c6c1dc', '#a6adc8'], light: ['#eff1f5', '#e6e9ef', '#dce0e8', '#ccd0da', '#4c4f69', '#5c5f77', '#6c6f85'] },
  everforest: { dark: ['#272e33', '#2e383c', '#374145', '#4a555b', '#d3c6aa', '#b5c1a0', '#9da995'], light: ['#fdf6e3', '#f4f0d9', '#e8e4cf', '#d8d5c0', '#3c4841', '#5c6a5e', '#778477'] },
  github: { dark: ['#0d1117', '#161b22', '#21262d', '#30363d', '#e6edf3', '#b1bac4', '#8b949e'], light: ['#ffffff', '#f6f8fa', '#f0f3f6', '#d1d9e0', '#1f2328', '#59636e', '#6e7781'] },
  gruvbox: { dark: ['#1d2021', '#282828', '#32302f', '#504945', '#ebdbb2', '#d5c4a1', '#a89984'], light: ['#fbf1c7', '#f2e5bc', '#ebdbb2', '#d5c4a1', '#3c3836', '#665c54', '#7c6f64'] },
  linear: { dark: ['#111116', '#19191f', '#22222b', '#34343f', '#f2f2f5', '#b9b9c6', '#858592'], light: ['#ffffff', '#f7f7f9', '#eeeeF2', '#dedee5', '#22222b', '#545461', '#747480'] },
  notion: { dark: ['#191919', '#202020', '#292929', '#3b3b3b', '#f1f1ef', '#c8c8c5', '#999994'], light: ['#ffffff', '#fbfbfa', '#f7f7f5', '#e9e9e7', '#37352f', '#5f5e5b', '#787774'] },
  one: { dark: ['#282c34', '#21252b', '#2c313a', '#3e4451', '#abb2bf', '#c8ccd4', '#828997'], light: ['#fafafa', '#f0f0f0', '#e5e5e6', '#d0d0d2', '#282c34', '#555b66', '#747b87'] },
  proof: { dark: ['#14201e', '#1b2926', '#243632', '#38504a', '#e8f1ee', '#b8d0c8', '#91aaa2'], light: ['#f4faf8', '#eaf3f0', '#dcebe6', '#c7ddd5', '#203b34', '#49675f', '#668078'] }
};

const ThemeContext = createContext(null);

function readAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) || '{}');
    const preferences = saved && typeof saved === 'object' ? saved : {};
    const legacyMode = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    const validColor = (value) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
    return {
      mode: VALID_MODES.includes(preferences.mode) ? preferences.mode : (VALID_MODES.includes(legacyMode) ? legacyMode : 'system'),
      colorTheme: APPEARANCE_THEMES.some(({ id }) => id === preferences.colorTheme) ? preferences.colorTheme : 'default',
      accent: validColor(preferences.accent) ? preferences.accent : '',
      background: validColor(preferences.background) ? preferences.background : '',
      foreground: validColor(preferences.foreground) ? preferences.foreground : ''
    };
  } catch (_error) {
    return { mode: 'system', colorTheme: 'default', accent: '', background: '', foreground: '' };
  }
}

function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getPalette(colorTheme, mode) {
  const [background, surface, elevated, border, foreground, secondary, muted] = PALETTES[colorTheme][mode];
  const themeAccent = APPEARANCE_THEMES.find(({ id }) => id === colorTheme)?.colors[0] || DEFAULT_ACCENT;
  return { background, surface, elevated, border, foreground, secondary, muted, themeAccent };
}

function getContrastForeground(color) {
  const hex = color.replace('#', '');
  const normalized = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
  if (!/^[\da-f]{6}$/i.test(normalized)) return '#111827';
  const channels = [0, 2, 4].map((index) => {
    const channel = parseInt(normalized.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  return luminance > 0.179 ? '#111827' : '#f3f6fb';
}

export function ThemeProvider({ children }) {
  const [appearance, setAppearance] = useState(readAppearance);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = appearance.mode === 'system' ? systemTheme : appearance.mode;

  const updateAppearance = (key, value) => {
    setAppearance((current) => ({ ...current, [key]: value }));
  };
  const setMode = (mode) => {
    if (VALID_MODES.includes(mode)) updateAppearance('mode', mode);
  };
  const setColorTheme = (colorTheme) => {
    if (APPEARANCE_THEMES.some(({ id }) => id === colorTheme)) updateAppearance('colorTheme', colorTheme);
  };
  const setAccent = (accent) => updateAppearance('accent', accent);
  const setBackground = (background) => updateAppearance('background', background);
  const setForeground = (foreground) => updateAppearance('foreground', foreground);
  const resetAppearance = () => setAppearance({ mode: 'system', colorTheme: 'default', accent: '', background: '', foreground: '' });
  const restoreDefaultTheme = () => setAppearance((current) => ({ ...current, colorTheme: 'default', accent: '', background: '', foreground: '' }));

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) return undefined;
    const handleChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const palette = getPalette(appearance.colorTheme, resolvedTheme);
    const accent = appearance.accent || palette.themeAccent;
    const background = appearance.background || palette.background;
    const foreground = appearance.foreground
      || (appearance.background ? getContrastForeground(appearance.background) : palette.foreground);

    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-color-theme', appearance.colorTheme);
    root.style.setProperty('--bg-primary', background);
    root.style.setProperty('--background', background);
    root.style.setProperty('--bg-secondary', palette.surface);
    root.style.setProperty('--bg-tertiary', palette.elevated);
    root.style.setProperty('--bg-elevated', palette.elevated);
    root.style.setProperty('--bg-input', palette.surface);
    root.style.setProperty('--bg-hover', palette.elevated);
    root.style.setProperty('--bg-active', palette.border);
    root.style.setProperty('--bg-overlay', resolvedTheme === 'dark' ? 'rgba(4, 6, 10, 0.82)' : 'rgba(15, 23, 42, 0.4)');
    root.style.setProperty('--border-subtle', palette.border);
    root.style.setProperty('--border-default', palette.border);
    root.style.setProperty('--text-primary', foreground);
    root.style.setProperty('--foreground', foreground);
    root.style.setProperty('--text-secondary', palette.secondary);
    root.style.setProperty('--text-muted', palette.muted);
    root.style.setProperty('--accent-color', accent);
    root.style.setProperty('--accent-foreground', getContrastForeground(accent));
    root.style.setProperty('--accent-blue', accent);
    root.style.setProperty('--accent-cyan', accent);
    root.style.setProperty('--accent-indigo', accent);
    root.style.setProperty('--border-focus', accent);
    root.style.setProperty('--border-accent', accent);
    root.style.setProperty('--shadow-sm', `0 1px 2px 0 ${resolvedTheme === 'dark' ? 'rgba(0,0,0,.4)' : 'rgba(15,23,42,.08)'}`);
    root.style.setProperty('--shadow-md', `0 4px 8px -2px ${resolvedTheme === 'dark' ? 'rgba(0,0,0,.5)' : 'rgba(15,23,42,.12)'}`);
    root.style.setProperty('--shadow-lg', `0 12px 28px -6px ${resolvedTheme === 'dark' ? 'rgba(0,0,0,.65)' : 'rgba(15,23,42,.18)'}`);
    root.style.setProperty('--shadow-glow', `0 0 15px color-mix(in srgb, ${accent} 25%, transparent)`);

    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, appearance.mode);
    } catch (_error) {
      // Appearance still applies for this session when persistent storage is unavailable.
    }
  }, [appearance, resolvedTheme]);

  const value = useMemo(() => ({
    theme: appearance.mode,
    setTheme: setMode,
    mode: appearance.mode,
    setMode,
    resolvedTheme,
    colorTheme: appearance.colorTheme,
    setColorTheme,
    accent: appearance.accent,
    setAccent,
    background: appearance.background,
    setBackground,
    foreground: appearance.foreground,
    setForeground,
    resolvedBackground: appearance.background || getPalette(appearance.colorTheme, resolvedTheme).background,
    resolvedForeground: appearance.foreground || getPalette(appearance.colorTheme, resolvedTheme).foreground,
    resolvedAccent: appearance.accent || getPalette(appearance.colorTheme, resolvedTheme).themeAccent,
    resetAppearance,
    restoreDefaultTheme,
    accentPresets: ACCENT_PRESETS,
    availableThemes: APPEARANCE_THEMES
  }), [appearance, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

export type Theme = 'light' | 'dark';
export type ThemePreference = 'system' | Theme;

export const THEME_STORAGE_KEY = 'mopiq-theme';
export const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

const listeners = new Set<(theme: Theme) => void>();
let media: MediaQueryList | null = null;

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference)
    ? value as ThemePreference
    : 'light';
}

export function getThemePreference(): ThemePreference {
  try {
    return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'light';
  }
}

export function resolvedTheme(preference: ThemePreference = getThemePreference()): Theme {
  return preference === 'system' ? systemTheme() : preference;
}

export function getTheme(): Theme {
  return resolvedTheme();
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function publish() {
  const theme = getTheme();
  applyTheme(theme);
  for (const listener of listeners) listener(theme);
}

export function setThemePreference(preference: ThemePreference): void {
  const next = normalizeThemePreference(preference);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  publish();
}

export function setTheme(theme: Theme): void {
  setThemePreference(theme);
}

export function subscribeTheme(listener: (theme: Theme) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initTheme(): void {
  applyTheme(getTheme());
  if (typeof window === 'undefined' || media) return;
  media = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (getThemePreference() === 'system') publish();
  };
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onChange);
  } else if (typeof media.addListener === 'function') {
    media.addListener(onChange);
  }
}

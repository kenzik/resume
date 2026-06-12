/**
 * Unit tests for useTheme composable.
 * Quasar LocalStorage is mocked by test/setup/vitest-setup.ts.
 *
 * Note: useTheme has module-level singleton state.  Each test file gets its own
 * module instance (Vitest default isolation), so these tests start from a clean
 * state relative to other test files.  Within this file, tests build on shared
 * state — order matters.
 */
import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { LocalStorage } from 'quasar';
import { useTheme } from '../../src/composables/useTheme';
import { themes, isValidThemeName } from '../../src/themes/index';
import { STORAGE_KEYS } from '../../src/constants';

describe('useTheme', () => {
  it('returns expected API shape', () => {
    const theme = useTheme();
    expect(theme).toHaveProperty('currentTheme');
    expect(theme).toHaveProperty('currentThemeName');
    expect(theme).toHaveProperty('setTheme');
    expect(theme).toHaveProperty('toggleTheme');
    expect(theme).toHaveProperty('resetToAuto');
    expect(theme).toHaveProperty('isAuto');
  });

  it('defaults to "auto" when no preference is stored', () => {
    const { currentThemeName, isAuto } = useTheme();
    expect(currentThemeName.value).toBe('auto');
    expect(isAuto.value).toBe(true);
  });

  it('setTheme("dark") updates currentThemeName', () => {
    const { setTheme, currentThemeName } = useTheme();
    setTheme('dark');
    expect(currentThemeName.value).toBe('dark');
  });

  it('setTheme("light") updates currentThemeName', () => {
    const { setTheme, currentThemeName } = useTheme();
    setTheme('light');
    expect(currentThemeName.value).toBe('light');
  });

  it('resetToAuto() returns theme to "auto"', () => {
    const { setTheme, resetToAuto, currentThemeName, isAuto } = useTheme();
    setTheme('dark');
    resetToAuto();
    expect(currentThemeName.value).toBe('auto');
    expect(isAuto.value).toBe(true);
  });

  it('toggleTheme() cycles between dark and light', () => {
    const { setTheme, toggleTheme, currentThemeName } = useTheme();
    setTheme('dark');
    toggleTheme();
    expect(currentThemeName.value).toBe('light');
    toggleTheme();
    expect(currentThemeName.value).toBe('dark');
  });

  it('currentTheme resolves to the correct Theme object', () => {
    const { setTheme, currentTheme } = useTheme();
    setTheme('dark');
    expect(currentTheme.value).toEqual(themes.dark);
    setTheme('light');
    expect(currentTheme.value).toEqual(themes.light);
  });

  it('applies theme CSS variables to document.documentElement', async () => {
    const { setTheme } = useTheme();
    setTheme('dark');
    // Vue watchers flush asynchronously; wait one tick for applyTheme() to run
    await nextTick();

    const root = document.documentElement;
    // At least one canonical dark-theme variable should be set
    expect(root.style.getPropertyValue('--color-background')).toBe('#1e1e1e');
    expect(root.style.getPropertyValue('--terminal-prompt')).toBe('#929292');
  });

  it('setTheme("amber") persists amber to LocalStorage', () => {
    const { setTheme, currentThemeName } = useTheme();
    setTheme('amber');
    expect(currentThemeName.value).toBe('amber');
    const stored = LocalStorage.getItem<string>(STORAGE_KEYS.theme);
    expect(stored).toBe('amber');
  });

  it('setTheme("green") persists green to LocalStorage', () => {
    const { setTheme, currentThemeName } = useTheme();
    setTheme('green');
    expect(currentThemeName.value).toBe('green');
    const stored = LocalStorage.getItem<string>(STORAGE_KEYS.theme);
    expect(stored).toBe('green');
  });

  it('currentTheme resolves amber to the amber Theme object', async () => {
    const { setTheme, currentTheme } = useTheme();
    setTheme('amber');
    await nextTick();
    expect(currentTheme.value).toEqual(themes.amber);
    expect(currentTheme.value.colors.background).toBe('#160e02');
  });

  it('currentTheme resolves green to the green Theme object', async () => {
    const { setTheme, currentTheme } = useTheme();
    setTheme('green');
    await nextTick();
    expect(currentTheme.value).toEqual(themes.green);
    expect(currentTheme.value.colors.background).toBe('#0a0f0a');
  });
});

// ── Registry validator tests ─────────────────────────────────────────────────
// These tests are intentionally in their own describe block (no shared singleton
// state dependency) so they can be read independently of the useTheme singleton.

describe('isValidThemeName (§9.3 registry-driven validator)', () => {
  it('accepts all registered theme keys', () => {
    for (const key of Object.keys(themes)) {
      expect(isValidThemeName(key), `"${key}" should be valid`).toBe(true);
    }
  });

  it('accepts "auto"', () => {
    expect(isValidThemeName('auto')).toBe(true);
  });

  it('rejects garbage values', () => {
    expect(isValidThemeName('garbage')).toBe(false);
    expect(isValidThemeName('nonexistent')).toBe(false);
    expect(isValidThemeName('DARK')).toBe(false);
    expect(isValidThemeName('')).toBe(false);
    expect(isValidThemeName(null)).toBe(false);
    expect(isValidThemeName(undefined)).toBe(false);
  });

  it('amber and green are valid — they survive LocalStorage round-trip', () => {
    expect(isValidThemeName('amber')).toBe(true);
    expect(isValidThemeName('green')).toBe(true);
    // Stale dark/light also survive
    expect(isValidThemeName('dark')).toBe(true);
    expect(isValidThemeName('light')).toBe(true);
  });
});

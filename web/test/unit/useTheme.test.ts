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
import { useTheme } from '../../src/composables/useTheme';
import { themes } from '../../src/themes/index';

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
});

/**
 * Vitest global setup file.
 * - Mocks the `quasar` package (LocalStorage, useMeta, useTimeout)
 *   so composables can be tested outside a Quasar app context.
 * - Stubs window.matchMedia for useTheme's system-preference watcher.
 */
import { vi, beforeEach } from 'vitest';

// --------------------------------------------------------------------------
// quasar mock
// vi.hoisted ensures this runs before the hoisted vi.mock() factory so the
// map reference is available inside the factory closure.
// --------------------------------------------------------------------------
const _storage = vi.hoisted(() => new Map<string, unknown>());

vi.mock('quasar', () => {
  const LocalStorage = {
    getItem: (key: string) => _storage.get(key) ?? null,
    set: (key: string, value: unknown) => { _storage.set(key, value); },
    remove: (key: string) => { _storage.delete(key); },
    clear: () => { _storage.clear(); },
  };

  // useTimeout: stub that executes callbacks synchronously (avoids real timers)
  const useTimeout = () => ({
    registerTimeout: (fn: () => void, _delay: number) => { fn(); return 0; },
  });

  return {
    LocalStorage,
    useTimeout,
    useMeta: vi.fn(),
  };
});

// --------------------------------------------------------------------------
// window.matchMedia stub (required by useTheme's media-query watcher)
// --------------------------------------------------------------------------
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

// --------------------------------------------------------------------------
// Reset storage and mocks between tests
// --------------------------------------------------------------------------
beforeEach(() => {
  _storage.clear();
  vi.clearAllMocks();
});

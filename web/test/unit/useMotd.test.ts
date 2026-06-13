/**
 * Unit tests for useMotd — §10 Offline Doctrine update-notice contract.
 *
 * Contract under test: getMotd() checks localStorage for the PWA update flag
 * set by src-pwa/register-service-worker.ts updated() hook, appends exactly
 * one "System updated." line to the base MOTD (or returns it alone when the
 * base is empty), and immediately clears the flag so it only fires once.
 *
 * Implementation notes:
 * - useMotd has module-level singleton state (motdContent, isLoaded refs).
 *   All tests in this file share one module instance (Vitest isolation is
 *   per-file, not per-test).  Tests are ordered: the first describe block
 *   exercises the empty-cache state (loadMotd not yet called), then beforeAll
 *   in the second describe populates motdContent via the mocked loadWebConfig.
 * - useMotd uses native window.localStorage (not Quasar LocalStorage), so
 *   the vitest-setup.ts Quasar mock is irrelevant here.  We manage the native
 *   localStorage key manually in beforeEach.
 * - yamlLoader is mocked so no real fetch() occurs.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { STORAGE_KEYS } from '../../src/constants/index';

// vi.mock is hoisted above imports by Vitest — this mock is in place when
// useMotd.ts is first evaluated and its import of loadWebConfig is resolved.
vi.mock('../../src/utils/yamlLoader', () => ({
  loadWebConfig: vi.fn().mockResolvedValue({ motd: 'Test MOTD' }),
}));

import { useMotd } from '../../src/composables/useMotd';

const KEY = STORAGE_KEYS.pwaUpdatePending; // 'kenzik-resume-pwa-update'

// ── Helpers ──────────────────────────────────────────────────────────────────

function setUpdateFlag() {
  localStorage.setItem(KEY, '1');
}

function clearUpdateFlag() {
  localStorage.removeItem(KEY);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useMotd — getMotd() PWA update-notice contract (§10)', () => {
  beforeEach(() => {
    // Reset native localStorage state between tests.
    // (vitest-setup.ts only clears Quasar LocalStorage, not native.)
    clearUpdateFlag();
  });

  // ── Phase 1: motdContent is null (loadMotd never called) ─────────────────
  // At this point motdContent.value === null → base resolves to ''.

  describe('flag set, MOTD cache empty (loadMotd not yet called)', () => {
    it('returns "System updated." when base MOTD is empty', () => {
      setUpdateFlag();
      const { getMotd } = useMotd();
      expect(getMotd()).toBe('System updated.');
    });

    it('clears the flag — second call returns empty string (no duplicate line)', () => {
      setUpdateFlag();
      const { getMotd } = useMotd();
      getMotd(); // first call: emits line + removes flag
      expect(getMotd()).toBe(''); // second call: flag gone → base only (= '')
    });

    it('flag absent → returns empty string (no update line emitted)', () => {
      // flag not set — baseline: pure empty string
      const { getMotd } = useMotd();
      expect(getMotd()).toBe('');
    });
  });

  // ── Phase 2: motdContent populated via loadMotd() ─────────────────────────
  // beforeAll runs once, before any test in this describe block, after all
  // tests in the previous block complete.  The mock returns { motd: 'Test MOTD' }
  // so motdContent.value becomes 'Test MOTD' after loadMotd() resolves.

  describe('flag set, MOTD cache populated (loadMotd resolved)', () => {
    beforeAll(async () => {
      const { loadMotd } = useMotd();
      await loadMotd(); // populates motdContent.value = 'Test MOTD'
    });

    it('appends exactly one "System updated." line to base MOTD', () => {
      setUpdateFlag();
      const { getMotd } = useMotd();
      expect(getMotd()).toBe('Test MOTD\nSystem updated.');
    });

    it('clears the flag — second call returns only base MOTD (no duplicate)', () => {
      setUpdateFlag();
      const { getMotd } = useMotd();
      getMotd(); // first call: emits appended line + removes flag
      expect(getMotd()).toBe('Test MOTD'); // second call: flag gone → base only
    });

    it('flag absent → returns only base MOTD (no update line emitted)', () => {
      // No flag set — verify the steady-state path.
      const { getMotd } = useMotd();
      expect(getMotd()).toBe('Test MOTD');
    });
  });
});

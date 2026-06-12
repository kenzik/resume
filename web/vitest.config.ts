/**
 * Standalone Vitest config — intentionally does NOT reuse @quasar/app-vite's
 * Vite pipeline (Risk 2 in modernization-2026.md §6: Quasar+Vitest quirks).
 * Quasar composables that touch LocalStorage are mocked via test/setup/vitest-setup.ts.
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup/vitest-setup.ts'],
    include: ['test/unit/**/*.test.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      // Mirror the tsconfig.json "src/*" path alias
      src: resolve(__dirname, './src'),
    },
  },
  define: {
    // Inject build-time globals that obfuscate-plugin.js normally provides
    // (unused in unit tests, but prevents ReferenceErrors in imported modules)
    __BUILD_HASH__: JSON.stringify('test'),
    __BUILD_VERSION__: JSON.stringify('test'),
    __BUILD_BRANCH__: JSON.stringify('test'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __ENCODED_TRIGGERS__: JSON.stringify({}),
    __RESPONSE_PREFIX__: JSON.stringify(''),
    __DOOM_PREFIX__: JSON.stringify(''),
    __WOPR_PREFIX__: JSON.stringify(''),
  },
});

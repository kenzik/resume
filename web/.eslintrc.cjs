/* eslint-env node */
/**
 * ESLint configuration.
 * Scoped to src/ only (see package.json "lint" script).
 *
 * Rules that conflict with pre-existing code patterns are documented here
 * and disabled; they should be re-evaluated when the relevant code is
 * refactored in later phases.
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-essential',
  ],
  rules: {
    // ── Vue ────────────────────────────────────────────────────────────────
    // Page components (Index.vue, Landing.vue) use single-word names by
    // Quasar convention; multi-word enforcement would require renaming files.
    'vue/multi-word-component-names': 'off',

    // ── Regex ──────────────────────────────────────────────────────────────
    // ansiToHtml.ts uses control characters (\x1b) in regex intentionally
    // for ANSI escape sequence parsing — this is correct terminal behaviour.
    'no-control-regex': 'off',

    // ── Variables ──────────────────────────────────────────────────────────
    // pre-existing let-that-could-be-const; Phase 2 refactor will clean up
    'prefer-const': 'warn',

    // TypeScript unused-var pattern — allow _-prefixed intentional unused
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // no-explicit-any: warn only; generics and legacy interop need any sometimes
    '@typescript-eslint/no-explicit-any': 'warn',

    // ── TypeScript/no-require-imports ─────────────────────────────────────
    // quasar.config.js and build/ use require() (CJS context); src/ code is
    // module-based but the rule would fire on indirect imports.
    '@typescript-eslint/no-require-imports': 'warn',
  },
};

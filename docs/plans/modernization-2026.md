# Plan: Modernize kenzik.com (Retro-Preserving) with a Persisted Subagent Team

## Context

kenzik.com is a retro-CRT terminal resume (Vue 3.4 + Quasar 2.14 + TS strict, Cloudflare Pages). DESIGN_GUIDE.md §9 names a "vibe-coded" modernization backlog. Dave wants it executed — **full scope**: architecture refactor, visual evolution, UX/a11y, and new capabilities — by a **persisted roster of project subagents** (opus + sonnet families) in `.claude/agents/`, guided by a new **companion vision doc `DESIGN_GUIDE_2026-2.md`**, with a **Vitest + Playwright** safety net added first. Prime directive holds: every change reads as earnest CRT emulation; zero visual regression on default dark theme; the ~3.5s boot ritual is preserved except under `prefers-reduced-motion`.

**Post-approval step:** copy this plan to `docs/plans/modernization-2026.md` in the repo.

## Live-site & code findings driving the plan (verified)

- **BUG (light theme):** inline code chips render `--color-brightGreen`-text-on-`--color-brightBlack` boxes — unreadable. Root cause `Terminal.vue:2044` `background: var(--color-brightBlack, #666666)`; needs a new semantic `terminal.codeBackground` token (brightBlack is also load-bearing for borders at `Terminal.vue:1979,2110`).
- **DESIGN_GUIDE §9.7 is wrong that new themes are "no code changes":** `ThemeName` union hardcoded at `themes/index.ts:54`, whitelists at `useTheme.ts:46` and `commands/settings.ts:60` — must become registry-driven.
- **`cssDefaults.ts` has drift** (`prompt/command: #0dbc79/#3b8eea` vs dark's `#929292`; `brightBlack #666666` vs `#333333`) — fix to dark-theme canon before centralizing fallbacks.
- **Boot is dual-clocked:** CSS keyframes (`Landing.vue:175-300`) + JS timers (`Landing.vue:46-60`, 3500ms / `VITE_POWER_ON_DELAY_MS` 5000 redirect). Reduced-motion must branch both.
- No `aria-label` on terminal inputs (`Terminal.vue:57,98`); modals already have dialog ARIA. No tests anywhere. PWA block dormant at `quasar.config.js:158-173`. 11MB `public/games/doom/freedoom.jsdos` must never be precached. Perf is healthy (180KB transfer, 0 console errors). `data/kenzik.yml` is gitignored — tests use `data/example.yml`.

## 1. Subagent roster — `.claude/agents/*.md` (7 files)

Format: markdown + YAML frontmatter (`name`, `description`, `model`, `tools`). Opus = judgment/taste; sonnet = well-specified mechanics.

| Agent | Model | Role |
|---|---|---|
| `design-director` | **opus** | Authors DESIGN_GUIDE_2026-2.md; produces exact token tables (amber P3, green P1, codeBackground) with WCAG figures; specs reduced-motion boot; adjudicates "does this read as CRT?". Never edits runtime code. Tools: Read, Glob, Grep, Write, Edit, WebSearch, WebFetch |
| `crt-effects-engineer` | **opus** | Named animation constants (`--crt-*` vars, new `css/crt-timing.scss`); extracts smack/roll keyframes to `css/crt-effects.scss`; reduced-motion boot visuals; `@supports`-gated modern CSS (OKLCH, view transitions) only where pixel-identical. Tools: Read, Glob, Grep, Edit, Write, Bash |
| `refactor-surgeon` | **sonnet** | Decomposes Terminal.vue (SCSS out first, then optional TerminalOutput.vue); centralizes `var(--x, #hex)` fallbacks through fixed cssDefaults.ts; removes dead `font.lineHeight`; annotates load-bearing tokens. One mechanical move per commit; never changes a rendered value. Tools: Read, Glob, Grep, Edit, Write, Bash |
| `theme-smith` | **sonnet** | Implements design-director's token tables: `terminal.codeBackground` (light-theme bug fix), `themes/amber.json` + `green.json`, registry-driven `ThemeName` + validation in useTheme/settings. Tools: Read, Glob, Grep, Edit, Write, Bash |
| `a11y-engineer` | **sonnet** | ARIA on inputs, `role="log"`/`aria-live` evaluation on output, focus restoration after modals, keyboard hint line, reduced-motion media-query wiring + verification. Tools: Read, Glob, Grep, Edit, Write, Bash |
| `test-engineer` | **sonnet** | Vitest (standalone config, happy-dom, quasar mocks; composables/commands/utils + theme-completeness test) and Playwright smoke (boot, help, pipe, theme×4, easter-egg smack/roll class, contrast regression, reduced-motion via emulateMedia); screenshot baselines; `.github/workflows/test.yml`; perf budget gate (app JS+CSS ≤250KB, `games/**` excluded). Tools: Read, Glob, Grep, Edit, Write, Bash |
| `retro-reviewer` | **opus** | Read-only gate on every PR: diff vs DESIGN_GUIDE §8 + 2026-2 tier list; screenshot baseline comparison; dist grep for plaintext easter-egg triggers; boot-timing check; written verdict with file:line citations. Tools: Read, Glob, Grep, Bash |

**Orchestration playbook** (included in plan doc): main thread is conductor; never two agents on Terminal.vue concurrently; handoff artifacts live in DESIGN_GUIDE_2026-2.md (not chat memory); every phase ends with tests green → retro-reviewer verdict → PR to `development` (conventional commits); implementing agents escalate spec-vs-retro conflicts to design-director rather than improvising; Phase 0 ∥ Phase 1 parallel-safe, 2→3→4 serial, 5 ∥ 4.

## 2. Phases & PR map (branch off `development`)

| # | PR | Agent(s) | Contents | Why this order |
|---|---|---|---|---|
| 0 | `docs: add 2026 design vision and agent roster` | design-director | 7 `.claude/agents/*.md` + `DESIGN_GUIDE_2026-2.md` | Downstream agents implement *from* the guide |
| 1 | `test: add vitest unit + playwright smoke suites and CI` | test-engineer | `web/vitest.config.ts`, `web/playwright.config.ts`, `web/test/**`, devDeps, `.github/workflows/test.yml`, screenshot baselines. Contrast test lands as expected-fail documenting the bug. Playwright sets `VITE_POWER_ON_DELAY_MS` low except one full-boot test | Refactor is only safe with baselines locked |
| 2 | `refactor: decompose Terminal.vue and centralize CSS fallbacks` | refactor-surgeon + crt-effects-engineer | SCSS → `css/{terminal,crt-effects,crt-timing}.scss`; named timing vars + `BOOT_TIMINGS` in `constants/index.ts`; cssDefaults drift fixed then fallback sweep; dead `font.lineHeight` removed; token-usage annotations; (stretch) `TerminalOutput.vue` | Gate: 0-px screenshot diff; obfuscation grep clean |
| 3 | `fix: light-theme code chips, reduced-motion boot, terminal ARIA` | a11y-engineer + crt-effects-engineer + theme-smith | `terminal.codeBackground` token (flip contrast test to pass); input ARIA + focus restore; reduced-motion fast boot (≤300ms ignite, CSS + JS timer branch); keyboard hint | Needs Phase 2's extracted SCSS/central defaults |
| 4 | `feat: amber P3 and green P1 phosphor themes` | theme-smith + crt-effects-engineer (+ design-director sign-off) | `themes/{amber,green}.json` (all blocks; completeness test enforces); registry-driven ThemeName/validation; optional `--terminal-glow` token (default `none` — preserves "no glow on default text"); `@supports`-gated OKLCH / view-transition re-tint | Themes must include codeBackground from day one |
| 5 | `feat: enable PWA offline mode and CI performance budget` | test-engineer + refactor-surgeon | Quasar PWA mode (`src-pwa/`, manifest, icons); `generateSW` with `globIgnores: ['games/**']`; update notice as MOTD line (no toasts); perf budget blocking in CI. Rollback = `pwa: false` | Parallel with 4 after 2; soak on preview deploy |
| 6 | `docs: sync DESIGN_GUIDE.md with as-built changes` | design-director | True-up as-built guide + CLAUDE.md Key Files (stale: points at useCommands.ts instead of `commands/` registry) | Last, reflects reality |

## 3. Critical files

- `web/src/components/Terminal.vue` — decomposition target; bug at :2044; ARIA at :57/:98; smack/roll keyframes :1623-1834
- `web/src/themes/index.ts` (:54 ThemeName union), `web/src/composables/useTheme.ts` (:46), `web/src/commands/settings.ts` (:60) — registry-driven validation
- `web/src/config/cssDefaults.ts` — fix drift, then becomes fallback SSOT
- `web/src/pages/Landing.vue` — boot keyframes :175-300, JS timers :46-60
- `web/quasar.config.js` — obfuscate plugin (:140), dormant PWA block (:158-173)
- New: `web/src/css/{terminal,crt-effects,crt-timing}.scss`, `web/src/themes/{amber,green}.json`, `web/test/**`, `web/src-pwa/**`, `.claude/agents/*.md`, `DESIGN_GUIDE_2026-2.md`, `.github/workflows/test.yml`

## 4. DESIGN_GUIDE_2026-2.md outline

1. Charter & relationship to DESIGN_GUIDE.md (companion; as-built guide stays truth; code wins)
2. Prime Directive 2026: "would a 1980s phosphor monitor do this?" + "would a 2026 browser let us fake it for free?"
3. **CRT Authenticity Tier List** — S: boot ritual / phosphor palette / monospace grid (untouchable); A: scanlines, vignette, bezel (tunable within alpha limits); B: smack/roll, glow (easter-egg-only); F: toasts, spinners, parallax (forbidden) — retro-reviewer's rubric
4. **Phosphor Physics Primer** — P1 green / P3 amber / P4 white; persistence→glow decay, bloom→text-shadow radii, temperature→background tint, mapped to tokens
5. **Theme Specifications** — full token tables for amber & green incl. codeBackground + glow, WCAG AA figures; `auto` still resolves only dark/light
6. **Modern CSS Under the Retro Skin** doctrine — OKLCH, `@property`, View Transitions, container queries; iron rule: `@supports`-gated + pixel-identical-or-invisible
7. **Accessibility as Period-Correct Feature** — reduced-motion = the "fast boot" DIP switch real terminals had; ARIA mapping table; keyboard-first as the native model
8. **Motion Spec v2** — named `--crt-*` timeline table (~3.5s) + reduced-motion variant (≤300ms, no flicker)
9. **Token Architecture v2** — codeBackground/glow semantics, canonical-fallback policy (= dark theme), load-bearing annotations, registry-driven names
10. **Offline Doctrine** — "the terminal works when the mainframe is down"; precache app shell, never games; update-as-MOTD
11. **Quality Gates** — ≤250KB app transfer, test matrix, screenshot policy, obfuscation smoke check
12. **Backlog & Non-Goals** — out: sound, SSR, more games, theme editor

## 5. Verification per phase

| Phase | Checks |
|---|---|
| 0 | markdownlint (optional); `/agents` lists 7; sanity-read token tables |
| 1 | `cd web && yarn lint && yarn vitest run && yarn playwright test && yarn build`; baselines match live; contrast test xfail |
| 2 | Full suite, 0-diff screenshots; `grep -rE "xyzzy|iddqd|plugh" web/dist/spa/assets` → empty; manual dark+light pass (boot, help, pipe, xyzzy smack/roll, mobile) |
| 3 | Contrast test now passes; reduced-motion e2e via `emulateMedia({reducedMotion:'reduce'})`; axe-core/VoiceOver spot check; normal boot still ~3.5s |
| 4 | Theme-completeness covers 4 themes; LocalStorage migration (`amber` survives reload, garbage falls back); dark default 0-diff; new baselines |
| 5 | PWA build + Lighthouse installable; offline reload works; precache excludes `games/**`; perf gate green; preview deploy unaffected |

Every PR gets a retro-reviewer verdict before merge.

## 6. Top risks

1. **Terminal.vue split regression** (cursor px math, mobile/desktop branches, pager/game modes) → tests-first, SCSS-only extraction before script moves, one move per commit (bisectable), 0-diff gate, stretch goals droppable.
2. **Quasar+Vitest quirks** (LocalStorage/useMeta imports, app-vite owns vite config) → standalone vitest.config.ts, `vi.mock('quasar')`, lean on Playwright for integration.
3. **Token blast radius** (missed key = silent fallback) → `TerminalColors` interface makes omissions compile errors + completeness test; canonical fallback = on-brand dark values anyway.
4. **Theme persistence/validation paths** (hardcoded whitelists, stale LocalStorage, `auto` semantics) → single registry validator + explicit unit tests.
5. **PWA staleness / asset bloat** (11MB doom; SW vs Cloudflare cache) → `globIgnores: ['games/**']`, skipWaiting+clientsClaim with MOTD, ship last + soak on preview, one-line rollback.

## Execution kickoff (after approval)

1. `mkdir -p docs/plans` (exists) and copy this plan → `docs/plans/modernization-2026.md`.
2. Branch `feature/modernization-2026-charter` off `development`; run Phase 0 (roster + vision doc); PR.
3. Proceed phase-by-phase per §2, conducting subagents per the playbook.

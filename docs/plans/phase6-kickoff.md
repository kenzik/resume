# Phase 6 Kickoff — fresh-session handoff

> Written at the end of the Phase 3–5 conductor session (2026-06-12). Paste §1 into a fresh
> Claude Code session at the repo root. §2–§3 are state + operational learnings the new
> session won't otherwise have. Delete this file AND docs/plans/phase3-kickoff.md as part of
> Phase 6 itself (this is the docs true-up phase — the handoffs are part of the debt).

## 1. Prompt to paste

```
Execute Phase 6 (final phase) of the approved modernization plan. You are the conductor;
implementation is done by the persisted project subagents in .claude/agents/ (they are
registered with the session's Agent tool — dispatch directly, pin models per frontmatter).

Read in order before acting:
1. docs/plans/modernization-2026.md — §2 Phase 6 row, §5 verification
2. DESIGN_GUIDE_2026-2.md — entire doc, especially §10 (rollback text is stale), §11.1/§11.2
   (precedents added mid-flight), §5.3/§7/§8/§9 (now as-built)
3. DESIGN_GUIDE.md — the as-built guide this phase trues up
4. docs/plans/phase6-kickoff.md §2–§3 (binding)
5. CLAUDE.md (repo root) — Key Files / commands are stale

Then: branch docs/modernization-2026-phase6 off development (NOTE: use a branch prefix that
triggers CI — test.yml triggers on feature/**, test/**, fix/** pushes; docs/** does NOT, so
either name it fix/modernization-2026-phase6 or rely on the pull_request trigger) and deliver
"docs: sync DESIGN_GUIDE.md with as-built changes":

a) design-director (opus) — the bulk of the phase, docs only:
   - True-up DESIGN_GUIDE.md with everything Phases 2–5 built: decomposed SCSS
     (css/{terminal,crt-effects,crt-timing}.scss), BOOT_TIMINGS + CRT_TRANSITION_TIMINGS
     (src/constants/index.ts), codeBackground + glow tokens, the 4-theme system with
     registry-driven ThemeName/isValidThemeName, reduced-motion boot (§8.2 as-built),
     terminal ARIA + sr-only announcer (incl. the typewriter-chatter finding currently
     documented only at Terminal.vue:34-49), PWA/offline behavior, the per-platform
     screenshot-baseline system (3 screens × 2 platforms).
   - Fix DESIGN_GUIDE_2026-2.md §10 rollback line: there is no `pwa: false` — the one-line
     rollback is `"build": "quasar build"` in web/package.json (revert of `-m pwa`).
   - Rule on widening the §11 obfuscation gate path from dist/spa/assets to all of dist/spa
     (sw.js lives at dist/spa/sw.js; retro-reviewer note N2, Phase 5). If ruled yes, the
     test.yml change is test-engineer's, one tiny commit.
   - CLAUDE.md true-up: Key Files points at useCommands.ts instead of the commands/ registry;
     add test commands (test:unit, test:e2e, test:e2e:offline); note build is now PWA mode;
     theme list now dark/light/amber/green/auto.
b) Mechanical one-liners (refactor-surgeon, sonnet, or fold into conductor review):
   - themes/index.ts TOKEN_USAGE: brightMagenta tagged `ansi-slot` while listing a real
     consumer — fix the label.
   - quasar.config.js: one-line comment near workboxMode noting custom-service-worker.ts is
     unused under generateSW (retro-reviewer note N1, Phase 5).
   - Delete docs/plans/phase3-kickoff.md and docs/plans/phase6-kickoff.md.
c) Verify yourself after each agent and at the end: cd web && yarn lint && yarn vitest run
   (118) && yarn playwright test (35, baselines 0-diff) && yarn build && yarn test:e2e:offline
   (3); obfuscation grep (xyzzy|plugh|iddqd|idkfa|idspispopd) over dist/spa empty; gzip
   JS+CSS ≤250KB (currently ~179KB). Docs-only changes still get the full gate run — cheap
   insurance. Then retro-reviewer (opus) verdict, fix anything raised, push, PR to
   development, watch CI green, pause and report. Conventional commits, no AI co-author
   trailers, agents never checkout/merge/push development.
```

## 2. State of the world (as of this handoff)

- **Merged:** Phase 0 (#46), 1 (#47), 2 (#48), 3 (#49), 4 (#50), 5 (#51). development tip
  `aaf19bb`. Phase 6 is the last phase.
- **Suites on development:** vitest 118; playwright 35 (darwin) incl. 6 screenshot baselines
  (dark/amber/green-home × darwin/linux, strict 0-diff, no tolerances); offline e2e 3 (separate
  playwright.offline.config.ts, runs against the BUILT app). CI jobs: unit, e2e, build-and-perf
  (250KB gzip budget + §10 precache-policy gate), offline-e2e, plus preview/deploy workflows.
- **As-built since the plan was written** (the plan/guides cite old locations):
  - Inline-code chip rule: web/src/css/terminal.scss (var --terminal-codeBackground).
  - Smack/roll keyframes: web/src/css/crt-effects.scss; boot CSS vars: crt-timing.scss;
    JS clocks: BOOT_TIMINGS + CRT_TRANSITION_TIMINGS in web/src/constants/index.ts.
  - Themes: 4 JSONs; ThemeName/isValidThemeName registry-driven in themes/index.ts;
    terminal.glow consumed as ONE inherited text-shadow on .terminal (terminal.scss).
  - PWA: build = `quasar build -m pwa`, distDir pinned to dist/spa; precache policy in
    quasar.config.js extendGenerateSWOptions; update notice = MOTD line via
    STORAGE_KEYS.pwaUpdatePending (register-service-worker.ts → useMotd.getMotd()).
- **Mid-flight guide additions** (design-director-authored, already in 2026-2): §11.1
  (baseline REGEN precedent — Phase 3 FreeType incident, audit trail in
  docs/evidence/phase3-linux-baseline/), §11.2 (net-new baseline precedent + whole-tube glow
  intent ruling).
- **Known/accepted, do not "fix":** plaintext `joshua`/`wopr` in built JS is BY DESIGN (only
  the five typed triggers are obfuscated; joshua is the WOPR in-game password).
  web/public/data is a symlink to ../../data — local builds copy personal files into dist;
  CI/production builds are clean (example.yml + secret-reconstructed kenzik.yml only).

## 3. Operational notes (Phases 3–5, learned the hard way)

1. **Conductor verifies everything** — run the suites yourself after each agent; read the
   actual PNGs; agents occasionally misreport. Both review agents (design-director,
   retro-reviewer) write rulings into DESIGN_GUIDE_2026-2.md / verdicts — commit their guide
   edits (they don't commit).
2. **Linux is reproducible locally via Docker** (image mcr.microsoft.com/playwright:v1.60.0-jammy
   pulled): see memory file `linux-screenshot-baseline-freetype` for the exact loop, including
   THREE hard-won gotchas: (a) always mount the ABSOLUTE repo path, never $PWD — a mis-rooted
   mount once let the container's yarn rewrite the HOST web/node_modules with linux bindings
   (fix: rm -rf web/node_modules && yarn install); (b) always pass `--output /tmp/pw-results`
   in-container; (c) the full-boot timing e2e FAILS under Docker-on-Mac (waitForFunction
   startup latency) — it passes on darwin and native CI; never chase it, never tolerate it.
3. **Screenshot policy:** strict 0-diff per platform, no maxDiffPixels ever. Regen needs
   §11.1's five gates + design-director sign-off; net-new needs §11.2. Even invisible DOM/text
   changes can reshade linux FreeType antialiasing — docs-only Phase 6 should be safe, but the
   gate run is the proof, not the assumption.
4. **Git/CI:** obfuscation gate = five triggers only. CI Test Suite does NOT trigger on a push
   of an existing commit to a new branch (path filter no-ops) — PR triggers always work.
   Conventional commits, no AI co-author trailers, conductor owns push/PR/merge-watching.
5. **Subagent roster is registered with the Agent tool** in recent sessions (theme-smith,
   crt-effects-engineer, a11y-engineer, test-engineer, refactor-surgeon, design-director,
   retro-reviewer) — dispatch directly; the Phase-3-era "inline the .md as a role" workaround
   is only needed if the roster is missing from the tool's agent list.
6. **Perf budget** is gzip transfer over dist/spa/assets js+css: ~179KB of 250KB. The sw.js +
   workbox runtime live at dist/spa/ root and are deliberately outside the measurement.

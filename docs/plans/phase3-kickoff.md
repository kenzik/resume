# Phase 3 Kickoff — fresh-session handoff

> Written at the end of the Phase 1+2 conductor session (2026-06-12). Paste §1 into a fresh
> Claude Code session at the repo root. §2–§3 are state + operational learnings the new
> session won't otherwise have. Delete this file in the Phase 6 docs true-up.

## 1. Prompt to paste

```
Execute Phase 3 of the approved modernization plan. You are the conductor; implementation
is done by the persisted project subagents in .claude/agents/.

Read in order before acting:
1. docs/plans/modernization-2026.md — §2 Phase 3 row, §5 verification, §6 risks
2. DESIGN_GUIDE_2026-2.md — §5.3 (codeBackground spec), §7 (ARIA mapping), §8.2 (reduced-motion boot), §9 (token rules), §11 (gates)
3. docs/plans/phase3-kickoff.md — §2 state and §3 operational notes (binding)
4. .claude/agents/{theme-smith,crt-effects-engineer,a11y-engineer,retro-reviewer}.md

Then: branch fix/modernization-2026-phase3 off development and deliver
"fix: light-theme code chips, reduced-motion boot, terminal ARIA":

a) theme-smith (sonnet): terminal.codeBackground token per §5.3 verbatim — dark #333333,
   light #e8e8e8 — added to the TerminalColors interface, both theme JSONs, cssDefaults.ts
   (canonical fallback = dark value) in ONE commit per §9.1; re-point the inline-code chip
   background (now in web/src/css/terminal.scss, NOT Terminal.vue — moved in Phase 2) from
   var(--color-brightBlack, #333333) to var(--terminal-codeBackground, #333333). brightBlack
   itself stays untouched (still load-bearing for borders). Flip the vitest contrast xfail
   (web/test/unit/contrast-regression.test.ts) to a passing test in the same commit.
b) crt-effects-engineer (opus): reduced-motion boot per §8.2 verbatim — CSS
   prefers-reduced-motion branch AND the matching matchMedia branch of the JS clock
   (BOOT_TIMINGS in web/src/constants/index.ts, added in Phase 2): single ignite ≤300ms,
   poweredOnMs→300, redirect→800, steady cursor, smack/roll suppressed, scanlines/vignette
   stay. Flip the playwright reduced-motion xfail (web/test/e2e/boot.spec.ts test.fail()).
   Normal boot must stay byte-identical (~3.5s, 0-px dark baseline).
c) a11y-engineer (sonnet): §7 ARIA mapping — aria-label on desktop+mobile command inputs,
   role="log"/aria-live evaluation on output (document the typewriter-chatter finding either
   way), focus restoration to the input when game/quit modals close, keyboard hint as one
   MOTD-style terminal output line (never chrome).

Serialize any two agents that touch the same file (Terminal.vue, terminal.scss, Landing.vue)
— never concurrent. Verify everything yourself after each agent and at the end:
cd web && yarn lint && yarn vitest run && yarn playwright test && yarn build, the 5-trigger
obfuscation grep (see §3.3) must be empty, gzip budget ≤250KB. Expected final counts: the
two xfails become real passes; dark-home baseline still 0-px. Then a retro-reviewer (opus)
verdict with file:line citations, fix anything it raises, push, open the PR to development,
watch CI to green, pause and report. Conventional commits, no AI co-author trailers, agents
never checkout/merge/push development.
```

## 2. State of the world (as of this handoff)

- **Merged:** Phase 0 (charter, PR #46), Phase 1 (test safety net, PR #47), Phase 2
  (decomposition + fallback centralization, PR #48, fast-forwarded — tip `13e5ba4`).
- **Suites on development:** vitest 87 passed + 1 expected fail (the §5.3 contrast bug);
  playwright 24 passed incl. 1 expected fail (reduced-motion boot). Phase 3 flips both.
- **Phase 2 moved things the plan still cites by old location:** the inline-code chip rule
  (plan says Terminal.vue:2044) now lives in `web/src/css/terminal.scss`; smack/roll
  keyframes are in `web/src/css/crt-effects.scss`; boot timing vars in
  `web/src/css/crt-timing.scss`; JS boot clock in `BOOT_TIMINGS`
  (`web/src/constants/index.ts`). Landing.vue consumes both clocks.
- **Sequencing after Phase 3:** Phase 4 (amber/green themes) needs 3 merged; Phase 5 (PWA)
  can run parallel with 4; Phase 6 (docs true-up) last.
- Low-severity carry-forward for Phase 6: `TOKEN_USAGE` in `themes/index.ts` tags
  `brightMagenta` as `ansi-slot` while listing a real consumer — label inconsistency only.

## 3. Operational notes (learned the hard way in Phases 1–2)

1. **Subagent invocation:** the `.claude/agents/` roster may not be registered with the
   session's Agent tool. Workaround: spawn a general agent, inline the agent's `.md` body
   as its role, and pin the frontmatter model (sonnet/opus). Preserve each agent's hard
   rules verbatim — they caught real issues.
2. **Git discipline for agents:** explicitly forbid agents from checkout/merge/commit/push
   of `development` or pushing at all (a Phase 1 agent fast-forwarded local development,
   which masked the real PR state). Conductor owns push/PR/merge-watching.
3. **Obfuscation gate:** FIVE triggers — xyzzy, plugh, iddqd, idkfa, idspispopd. Plaintext
   may appear in shell commands only, never in committed files (CI reconstructs from hex).
   `joshua` is NOT in the set — it ships plaintext by design (WOPR in-game password).
4. **Screenshot baselines are per-platform** (`{arg}-{platform}{ext}`, strict 0-diff, no
   maxDiffPixels): `dark-home-darwin.png` + `dark-home-linux.png` exist. A different Mac
   (e.g. other CPU/scale) may render differently → a local-only diff on an unchanged screen
   is a baseline-coverage gap, NOT a regression. Trust CI (linux) for the 0-diff verdict and
   inspect the actual diff image before even thinking about regenerating a committed
   baseline. CI uploads `test-results/` as an artifact on e2e failure (`gh run download`).
5. **Verification is conductor work** — run the suites yourself after each agent; agents
   have skipped or misreported gates (one omitted the playwright run; one shipped a gate
   that failed on healthy builds). Read the actual pngs.
6. **Data hygiene:** `data/kenzik.yml` is a gitignored secret; tests/CI provision
   `data/example.yml` (which now includes a `web.motd` block the baseline depends on).
7. **Perf budget** is gzip transfer (`gzip -c | wc -c` summed over dist/spa/assets js+css),
   currently ~176KB of 250KB.
8. **Boot e2e is timing-sensitive but robust:** it measures the in-page
   powering-on→powered-on delta (2500–5000ms window) via performance.now(), not wall clock.
   Reduced-motion work must keep the un-shortened full-boot test passing.

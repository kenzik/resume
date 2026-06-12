# DESIGN_GUIDE_2026-2.md — The Terminal, Forward

> **Audience:** the project's subagent roster (`.claude/agents/`) and any human steering them.
> **Status:** Forward-looking vision & specification. Companion to `DESIGN_GUIDE.md`, which remains the as-built source of truth. Where this document and the code disagree, the code wins until a phase lands; where this document and `DESIGN_GUIDE.md` disagree about the *future*, this document wins.
> **Owner:** `design-director`. Implementing agents build from the tables here — never from chat memory, never from taste.

---

## 1. Charter

`DESIGN_GUIDE.md` answered *"what is this thing?"* This document answers *"what does it become without ceasing to be itself?"*

The site is a working Unix shell on a simulated CRT. The 2026 effort modernizes its internals — decomposed components, centralized tokens, a test harness, new phosphor themes, offline capability, accessibility — while holding one line absolutely: **a visitor in 2026 should have the same flicker of recognition a visitor had on day one.** The screen warms up. The phosphor glows. The prompt waits.

Modernization that a visitor can *see* has failed. Modernization a visitor can *feel* — faster, sturdier, kinder to their eyes and their motion preferences — has succeeded.

## 2. Prime Directive, 2026 Restatement

The original test stands:

> *"Would this have been possible on a 1980s phosphor monitor?"*

It gains a second clause:

> *"…and would a 2026 browser let us fake it for free?"*

Both must be answerable. The first clause rejects toasts, spinners, parallax, and proportional type. The second clause demands we use modern platform features — OKLCH, `@property`, View Transitions, service workers — **wherever they are invisible**. The CRT is the costume; the browser underneath should be thoroughly, boringly current.

## 3. CRT Authenticity Tier List

The rubric `retro-reviewer` enforces on every PR. A change's tier determines its burden of proof.

| Tier | Elements | Rule |
|------|----------|------|
| **S — Untouchable** | The boot ritual (~3.5s warm-up choreography), the phosphor palette per theme, the monospace grid, the block-cursor prompt | Changes require an explicit spec in this document, authored by `design-director`. No exceptions — not for performance, not for tests, not for cleverness. The only sanctioned variant is the reduced-motion boot (§8). |
| **A — Tunable within limits** | Scanlines, vignette, bezel shadows, glass curvature, screen glow | Alphas may be *refactored* (named, centralized, OKLCH-derived) but never *raised*. The restraint is the design. New overlay layers slot below scanlines (z-100) / vignette (z-99). |
| **B — Easter-egg-only** | Smack/roll transitions, phosphor text glow in dark/light themes, WOPR/DOOM color modes | May not leak into ordinary command output. (Exception: phosphor themes carry their own spec'd glow — §5 — because there the *whole screen* is the easter egg.) |
| **F — Forbidden** | Toasts, snackbars, spinners, skeletons, slide-ins, parallax, icon fonts, proportional type, hover cards, gradient buttons | Automatic request-changes. The boot sequence is the loading state. Terminal output is the notification system. |

## 4. Phosphor Physics Primer

The new themes are not "color schemes." They are emulations of specific phosphor compounds, and their token values derive from how those compounds actually behaved.

| Phosphor | Compound era | Color | Persistence | Seen in |
|----------|-------------|-------|-------------|---------|
| **P1** | Zn₂SiO₄:Mn | Yellowish-green, 525nm | Medium-long — visible decay trails | IBM 5151, most early monochrome terminals |
| **P3** | Zn(Cd)S:Cu | Amber, ~602nm | Medium | Wyse, ADM-3A successors, "ergonomic" 80s offices |
| **P4** | Mixed sulfides | Bluish-white | Short | TVs, the dark/light themes' spiritual ancestor |

Physics → token mapping:

- **Persistence → glow decay.** Longer persistence = wider, softer `text-shadow`. P1 green gets a larger glow radius than P3 amber (§5). Dark/light (P4-ish) get none — short persistence, crisp text, per the existing rule.
- **Single-gun reality → monochrome ramps.** A P1 or P3 tube has *one* electron gun and *one* phosphor. There is no red on an amber terminal — only intensity. Therefore the full 20-key ANSI block in these themes is an **intensity ladder**, not a hue wheel. Semantic distinctions (error/success/warning) map to brightness tiers and heat, exactly as real monochrome software did.
- **Beam intensity → color temperature.** Brighter amber drifts yellow-white (`#ffeeb3` at full beam); brighter green drifts toward mint (`#ccffcc`). The bright* tokens follow that drift.
- **Tube tint → background.** A powered-on but unlit phosphor screen isn't black; it's the glass plus a whisper of the phosphor's color. Backgrounds carry that cast: `#160e02` (warm) for amber, `#0a0f0a` (green-shifted) for green.

## 5. Theme Specifications

Implementer: `theme-smith`, byte-for-byte. Contrast ratios are WCAG 2.1, computed (not estimated) against the theme background. Body-text roles must be ≥ 4.5:1 (AA); most figures below clear 7:1 (AAA). `brightBlack`/`blue`-tier values are decorative (borders, dim chrome) and exempt from text contrast.

`auto` continues to resolve **only** to dark/light via `prefers-color-scheme`. Phosphor themes are deliberate choices: `theme amber`, `theme green`.

### 5.1 `amber.json` — Amber P3

`name: "amber"`, `displayName: "Amber P3"`, `font: { size: "18px", weight: "400" }`, `spacing: { padding: "20px" }`.

**colors** (intensity ladder, dim → hot):

| Token | Value | | Token | Value |
|-------|-------|---|-------|-------|
| `background` | `#160e02` | | `brightBlack` | `#664400` |
| `foreground` | `#ffb000` | | `brightRed` | `#ff9233` |
| `cursor` | `#ffb000` | | `brightGreen` | `#ffc94d` |
| `selection` | `#4d3300` | | `brightYellow` | `#ffe066` |
| `black` | `#160e02` | | `brightBlue` | `#cc8800` |
| `red` | `#cc8800` | | `brightMagenta` | `#d9920f` |
| `green` | `#ffb000` | | `brightCyan` | `#ffd98c` |
| `yellow` | `#ffc94d` | | `brightWhite` | `#ffeeb3` |
| `blue` | `#996600` | | `white` | `#ffdd80` |
| `magenta` | `#b37700` | | `cyan` | `#ffd060` |

**terminal** (semantic roles, contrast vs `#160e02`):

| Token | Value | Contrast | Note |
|-------|-------|----------|------|
| `prompt` | `#cc8800` | 6.46:1 | Dim beam — the prompt recedes |
| `command` | `#cc8800` | 6.46:1 | Matches prompt, as dark theme does |
| `output` | `#ffb000` | 10.44:1 | The canonical P3 amber |
| `error` | `#ff9233` | 8.57:1 | Heat, not hue — the hottest the tube gets |
| `success` | `#ffc94d` | 12.49:1 | One tier brighter than body |
| `warning` | `#ffe066` | 14.67:1 | Near full beam |
| `info` | `#ffd060` | 13.16:1 | Prompt-path role |
| `codeBackground` | `#3d2900` | 7.56:1 (output on it) | Inline-chip well |

**glow:** `0 0 6px rgba(255, 176, 0, 0.30)` — medium persistence, tight bloom.

### 5.2 `green.json` — Green P1

`name: "green"`, `displayName: "Green P1"`, `font: { size: "18px", weight: "400" }`, `spacing: { padding: "20px" }`.

**colors:**

| Token | Value | | Token | Value |
|-------|-------|---|-------|-------|
| `background` | `#0a0f0a` | | `brightBlack` | `#1d661d` |
| `foreground` | `#33ff33` | | `brightRed` | `#ccffcc` |
| `cursor` | `#33ff33` | | `brightGreen` | `#66ff66` |
| `selection` | `#145214` | | `brightYellow` | `#99ff99` |
| `black` | `#0a0f0a` | | `brightBlue` | `#29cc29` |
| `red` | `#29cc29` | | `brightMagenta` | `#2eb82e` |
| `green` | `#33ff33` | | `brightCyan` | `#8cff8c` |
| `yellow` | `#66ff66` | | `brightWhite` | `#ccffcc` |
| `blue` | `#1f9e1f` | | `white` | `#99ff99` |
| `magenta` | `#24b324` | | `cyan` | `#5cf75c` |

**terminal** (contrast vs `#0a0f0a`):

| Token | Value | Contrast | Note |
|-------|-------|----------|------|
| `prompt` | `#29cc29` | 8.99:1 | Dim beam |
| `command` | `#29cc29` | 8.99:1 | |
| `output` | `#33ff33` | 14.27:1 | The canonical P1 green |
| `error` | `#ccffcc` | 17.27:1 | Full-beam "alarm white" — monochrome terminals shouted by getting *brighter* |
| `success` | `#66ff66` | 14.79:1 | |
| `warning` | `#99ff99` | 15.77:1 | |
| `info` | `#5cf75c` | 13.74:1 | |
| `codeBackground` | `#103810` | 9.71:1 (output on it) | |

**glow:** `0 0 8px rgba(51, 255, 51, 0.35)` — long persistence, wider bloom than amber.

### 5.3 Existing-theme amendments

Carried by Phase 3, not Phase 4:

| Theme | `terminal.codeBackground` | Rationale |
|-------|---------------------------|-----------|
| dark | `#333333` | Identical to current rendered value (`--color-brightBlack`) — **zero visual change** |
| light | `#e8e8e8` | Fixes the live bug: chips currently render 2.20:1 (`#333333` text on `#666666`); the fix yields 10.31:1 |

Both also gain `terminal.glow: "none"` when the glow token lands (§9) — the "default text is not glowed" rule is preserved by construction.

## 6. Modern CSS Under the Retro Skin

The doctrine: **hex is the stored truth; modern CSS is plumbing, never paint.**

| Feature | Sanctioned use | Iron rule |
|---------|---------------|-----------|
| **OKLCH** | Deriving glow alphas and selection tints from a theme's base phosphor color, so one hex edit re-derives the family | `@supports (color: oklch(0% 0 0))`-gated; rendered output must be pixel-identical or imperceptible. Stored values stay hex. |
| **`@property`** | Typing the `--crt-*` animation variables (§8) so they interpolate properly | Registration only; no new animation behavior |
| **View Transitions** | The `theme` command re-tint — an instant phosphor swap, styled as nothing at all | Must be imperceptible-or-better vs. today's swap. Any visible "morph" is F-tier motion → request-changes |
| **Container queries** | Only if the Terminal.vue decomposition surfaces a genuinely cleaner responsive unit than the 768/480 breakpoints | Not a goal; do not hunt for a use |
| **`color-mix()`** | Scanline/vignette alpha layers derived from theme background | Same `@supports` + zero-diff gate |

Anything in this table failing its gate ships as plain hex/px. There is no partial credit for modernity.

## 7. Accessibility as Period-Correct Feature

Accessibility is not a 2026 imposition on a 1980s aesthetic — the hardware we emulate *had these features*, and we restore them:

| 1980s hardware reality | 2026 implementation |
|------------------------|---------------------|
| Fast-boot DIP switch / warm-start jumper | `prefers-reduced-motion` → the §8 fast boot. The user set the switch; we respect it on both clocks (CSS keyframes *and* JS timers) |
| Brightness & contrast knobs | Theme system (4 themes), per-font size/line-height persistence — already shipped |
| Keyboard-first by necessity | Keyboard-first by design: every interaction must work without a pointer; the block cursor *is* the focus indicator |
| The bell and the status line | Terminal output lines as the only notification channel (`Type 'help' to begin`, PWA update notices as MOTD — §10) |
| Dumb-terminal serial discipline | A screen reader is a terminal. Semantic mapping below |

**ARIA mapping** (implementer: `a11y-engineer`):

| Element | Treatment |
|---------|-----------|
| Command input (desktop + mobile) | `aria-label="Terminal command input"` |
| Output region | Evaluate `role="log"` + `aria-live="polite"` against a real screen reader; the typewriter effect must not produce per-tick announcements. If it chatters, scope live-region updates to completed command results. Document the finding either way |
| Game/quit modals | Already correct (`role="dialog"`, `aria-modal`, `aria-labelledby`) — preserve; add focus restoration to the terminal input on close |
| Keyboard hint | One terminal output line in the boot/MOTD flow — never a banner, never chrome |

## 8. Motion Spec v2

### 8.1 Named timeline (full boot, ~3.5s — unchanged choreography, now legible)

All literals promoted to `--crt-*` custom properties in `web/src/css/crt-timing.scss`; the JS clock constants move to `BOOT_TIMINGS` in `web/src/constants/index.ts`. Same numbers, named once.

| Variable | Value | Drives |
|----------|-------|--------|
| `--crt-line-ignite` | `0.5s` | `powerLineAppear` — the scan line strikes |
| `--crt-line-flicker` | `0.1s × 3 @ 0.2s` | `powerLineFlicker` — ignition stutter |
| `--crt-bloom` | `2s @ 0.5s` | `powerLineExpand` — line blooms to full screen |
| `--crt-phosphor-warmup` | `2s @ 0.3s` | `phosphorWarmup` — radial green settles to 0.3 |
| `--crt-screen-warmup` | `2s @ 0.5s` | `screenWarmup` — brightness 0.5 → 1.2 → 1 |
| `--crt-smack-duration` / `--crt-roll-duration` | `1.8s` | Easter-egg transitions |
| `BOOT_TIMINGS.poweredOnMs` | `3500` | JS clock — content reveal |
| `BOOT_TIMINGS.redirectMs` | `5000` (env-overridable) | JS clock — route to `/resume` |

These are choreographed: change one, re-derive all, and update this table in the same commit.

### 8.2 Reduced-motion variant — "the fast-boot switch"

Under `@media (prefers-reduced-motion: reduce)` and the matching `matchMedia` branch:

- Single ignite step ≤ **300ms**: screen goes from off to lit with one opacity ease — no flicker, no bloom sweep, no brightness oscillation.
- JS clocks collapse proportionally: `poweredOnMs → 300`, redirect → `800ms`.
- Cursor blink becomes a steady block (no `blink` animation).
- `crt-smack-triple` / `crt-roll-triple` are suppressed entirely; easter eggs cut directly to their mode.
- Scanlines/vignette/bezel remain — they are static texture, not motion.

The reduced-motion boot is still a *boot* — the screen still turns on. It is the DIP-switch warm start, not a different machine.

## 9. Token Architecture v2

1. **New semantic tokens** on `TerminalColors`: `codeBackground` (Phase 3, all themes — §5.3) and `glow` (Phase 4; a full `text-shadow` value string; `"none"` for dark/light). Adding a token means: TypeScript interface + every theme JSON + `cssDefaults.ts` + this document, in one commit. The theme-completeness test enforces it.
2. **Canonical-fallback policy:** every `var(--token, fallback)` in a component routes through `web/src/config/cssDefaults.ts`, and the canonical fallback **is the dark-theme value** — a failed token load must render the on-brand default screen. Known drift to fix first: `prompt`/`command` → `#929292`, `brightBlack` → `#333333`.
3. **Registry-driven names:** `ThemeName` derives from the `themes` registry keys (+ `'auto'`). Exactly one validator, consumed by both `useTheme.loadThemePreference` and the `theme` command. Stale LocalStorage values fall back to dark (existing `getTheme` contract).
4. **Load-bearing annotations:** a `TOKEN_USAGE` map in `web/src/themes/index.ts`, generated from actual `--color-*` greps, recording which palette keys the UI consumes. JSON cannot carry comments; the map is the annotation.

## 10. Offline Doctrine

*The terminal works when the mainframe is down.* A real terminal didn't stop existing when the modem dropped — and a resume should survive conference-room Wi-Fi.

- **Precache:** the app shell — JS, CSS, fonts, theme JSONs, `example`/resume YAML, the favicon set. Total well under a megabyte.
- **Never precache:** `public/games/**` (11MB FreeDoom bundle, Zork story file). Runtime `CacheFirst` after first deliberate play, `NetworkOnly` before.
- **Update flow:** `skipWaiting` + `clientsClaim`; the *only* user-visible signal is a MOTD-style terminal line on next visit (e.g. `System updated. 4 themes available.`). No toast. No refresh button. F-tier rules apply to service-worker UX too.
- **Manifest:** `name: "kenzik.com"`, `theme_color`/`background_color: #1e1e1e`, CRT-bezel icon set.
- **Rollback:** `pwa: false` in `quasar.config.js` — one line, documented here so nobody has to rediscover it during an incident.

## 11. Quality Gates

Every phase PR clears all of these before `retro-reviewer` even reads the diff:

| Gate | Threshold |
|------|-----------|
| Unit suite | `yarn vitest run` green; theme-completeness covers every registered theme |
| E2E smoke | boot, `help`, pipe chain, theme switch × all themes, easter-egg entry (class assertion), reduced-motion boot |
| Screenshot baseline | Default dark home screen: **0-pixel diff** on refactor phases; new baselines only with design-director sign-off |
| Contrast regression | Light-theme code chips ≥ 4.5:1 (the live bug ships as an expected-fail test until Phase 3 flips it) |
| Performance budget | Built `dist/spa` JS+CSS transfer ≤ **250KB** (excludes `public/games/**`); current baseline ~180KB — headroom, not a target |
| Obfuscation | `grep -rE "<trigger words>" web/dist/spa/assets` → empty |
| Boot timing | Full choreography ~3.5s preserved (one un-shortened e2e test); reduced-motion variant ≤ 300ms ignite |

Then the human gate: `retro-reviewer` verdict with file:line citations, judged against §3.

### 11.1 Baseline-regeneration precedent — Phase 3 (linux, dark-home)

**Ruling (design-director, 2026-06-12): SIGN-OFF, conditional.** The §7 screen-reader
announcer (a non-painting `clip-rect` `aria-live="polite"` div in `Terminal.vue`) causes
the linux Chromium/FreeType rasterizer to deterministically reshade **102 pixels
(0.011%)** of edge antialiasing on three MOTD glyph clusters ("eri", "ail"). No layout
shift, no color-token change, no content change, no glyph-cell move — AA coverage on
glyph edges only, indistinguishable at 3× zoom. darwin stays 0-diff. Regenerating
`dark-home-linux.png` from the Phase 3 branch is authorized.

This does **not** weaken §11. The strict 0-diff policy (no `maxDiffPixels` tolerance) is
retained; the new linux baseline must itself be 0-diff deterministic across runs/retries.
§11 already anticipates this path — "new baselines only with design-director sign-off" —
for feature phases (Phase 3 implements §7; it is not a pure refactor, which would remain
locked at 0-diff against the existing baseline).

**A baseline regen is sanctioned only when ALL five hold** (absent any one, escalate again):
1. Cause is forensically traced to a spec-required feature (here: §7).
2. Change is sub-perceptual: no layout, no color token, no content, no glyph-cell change — AA coverage only.
3. Deterministic across runs and retries.
4. The canonical/companion platform (darwin) remains 0-diff — corroborating that design intent rendered identically.
5. Strict 0-diff is retained going forward; no tolerance is introduced.

A "visible" modernization is one a *visitor* can perceive (§2 failure test). Sub-glyph AA
reshading at 1× on one CI rasterizer is not visible and does not engage the §3 tier list:
nothing in S/A/B was altered by intent. It is platform raster noise below the design layer,
and it is the sanctioned cost of §2's second clause ("use modern platform features wherever
they are invisible").

### 11.2 Net-new baseline precedent — Phase 4 (amber/green home)

**Ruling (design-director, 2026-06-12): SIGN-OFF.** The four new baselines
(`amber|green-home-{darwin,linux}.png`) are *net-new* artifacts for net-new themes —
there is no prior baseline to regress, so §11.1's five-condition regen gate does not apply.
Distinct path: §11.1 governs *regenerating an existing* baseline; §11.2 governs *adding* one.
Committing net-new per-platform baselines is sanctioned when: (1) the theme JSON matches the
§5 table byte-for-byte; (2) rendered output passes the §4 physics read (verified below);
(3) capture is deterministic ×3 on both platforms under strict 0-diff (no `maxDiffPixels`
tolerance introduced); (4) the dark/light zero-regression invariant is structurally intact —
here by construction: dark/light store `glow:"none"`, fallback is `none`, so `text-shadow`
resolves to `none` and dark/light stay pixel-identical.

**Whole-tube glow is intended (Q3 affirmed).** The §5 `glow` token is consumed as a single
inherited `text-shadow` on `.terminal`, blooming every lit glyph — output, prompt, command,
input, cursor. This is correct, not a scope error: a real P1/P3 tube glows *every* excited
phosphor; glow-on-output-only would encode a web-app semantic ("glow = this is output"),
precisely the skin/parody failure §4 rejects. The dim-beam prompt blooms *less* because its
base color is darker (fixed alpha × darker glyph = fainter halo) — the correct physical
behavior, and what renders. §3's "the whole screen is the easter egg" exception authorizes,
and in fact requires, the whole-tube treatment in phosphor themes only.

## 12. Backlog & Non-Goals

**Explicitly out of scope** (so nobody "helpfully" adds them): sound/beep emulation, SSR, additional games, an in-terminal theme editor, telemetry/analytics, auth, comments, dark-mode toggles outside the `theme` command.

**Future backlog, in spirit but unscheduled:** a `P4 white` theme (the full phosphor set), `--terminal-glow` decay animation on text print (true persistence emulation — needs a perf budget conversation), Zork save-state via the PWA cache.

---

*Authored as the Phase 0 charter of `docs/plans/modernization-2026.md`. Token values verified by computed WCAG 2.1 ratios at authoring time. When a phase lands, `design-director` true-ups `DESIGN_GUIDE.md`; this document stays the horizon.*

# DESIGN_GUIDE.md — Terminal Resume

> **Audience:** AI agents (Cursor / Claude) editing this codebase, and any human keeping the design coherent.
> **Purpose:** Capture the as-built retro-CRT design system as a single source of truth, define the rules that keep edits on-brand, and name the "vibe-coded" artifacts worth modernizing — *without losing the retro look and feel.*
>
> **Prime directive:** Every visual change must read as an *earnest emulation of a real CRT terminal*, not a parody and not a generic dark-mode web app. When in doubt, ask: "Would this have been possible on a 1980s phosphor monitor?" If not, it needs a reason.

---

## 1. Design Philosophy

The site is a working Unix-like shell rendered on a simulated CRT monitor. The aesthetic rests on four pillars:

1. **The boot ritual is the signature moment.** On load the screen is *off*, a single horizontal scan-line ignites, the line blooms into a lit screen, phosphor warms up, and content scrolls in. Nothing should undercut this sequence — it sets the tone before a single word is read.
2. **Monospace honesty.** Everything is a monospace grid. Alignment, spacing, and rhythm follow the character cell. No proportional fonts, no off-grid flourishes.
3. **Phosphor, not paint.** Color and glow simulate a cathode-ray tube: a small palette, additive glow (`text-shadow` / inset `box-shadow`), scanlines, vignette, slight barrel curvature. Effects are *subtle* — the screenshot reads as a calm terminal, not a glitch demo.
4. **Theme-token discipline.** All color, size, and spacing flow through CSS custom properties set at runtime. Components never hardcode brand values (only safe fallbacks). This is what makes the system themeable and is the rule most often broken by vibe-coded edits.

---

## 2. Color System

### 2.1 Architecture

Colors live in JSON theme files and are applied to `:root` as CSS custom properties at runtime by `useTheme.ts`.

- **Theme files (4):** `web/src/themes/{dark,light,amber,green}.json`, registered in the `_themeRegistry` object of `web/src/themes/index.ts`.
- **Registry-driven names:** `ThemeName` is derived from the registry keys + the `'auto'` alias (`themes/index.ts:79`), and a single validator `isValidThemeName()` (`themes/index.ts:88`) is consumed by both `useTheme.loadThemePreference()` and the `theme` command in `commands/settings.ts` — adding a theme to the registry is the only edit needed. The old hardcoded `ThemeName` union and the two validation whitelists are gone. See DESIGN_GUIDE_2026-2.md §9.3.
- **Applier:** `web/src/composables/useTheme.ts` — `applyTheme()` (lines 59-84) sets every `colors.*` key as `--color-<key>` and every `terminal.*` key as `--terminal-<key>`; because it iterates the blocks, the new semantic tokens (`codeBackground`, `glow`) apply automatically.
- **Default:** `'auto'` (`useTheme.ts:6`) — follows `prefers-color-scheme`; resolves to `dark` or `light` **only** (amber/green are deliberate explicit choices, never auto-selected). Users override via the `theme` command; choice persists to LocalStorage key `kenzik-resume-theme`; stale/garbage values fall back to dark via `getTheme`.

### 2.2 Two token families

| Family | Prefix | Role | Source block |
|--------|--------|------|--------------|
| **Palette** | `--color-*` | Full 16-color ANSI set + `background`/`foreground`/`cursor`/`selection`. Raw colors. | `colors` block in theme JSON |
| **Semantic** | `--terminal-*` | Meaning-based roles used by terminal output. | `terminal` block in theme JSON |

### 2.3 Dark theme (default) values

Palette (`dark.json:4-25`):

| Token | Value | | Token | Value |
|-------|-------|---|-------|-------|
| `--color-background` | `#1e1e1e` | | `--color-green` | `#0dbc79` |
| `--color-foreground` | `#d4d4d4` | | `--color-yellow` | `#e5e510` |
| `--color-cursor` | `#aeafad` | | `--color-blue` | `#2472c8` |
| `--color-selection` | `#264f78` | | `--color-cyan` | `#11a8cd` |
| `--color-red` | `#cd3131` | | `--color-brightGreen` | `#23d18b` |
| `--color-brightBlack` | `#333333` | | `--color-brightYellow` | `#f5f543` |
| `--color-brightBlue` | `#3b8eea` | | `--color-brightCyan` | `#29b8db` |

(Full ANSI set also defines `black`, `magenta`, `white`, `brightRed`, `brightMagenta`, `brightWhite`.)

Semantic (`dark.json:26-34`):

| Token | Dark | Light | Meaning |
|-------|------|-------|---------|
| `--terminal-prompt` | `#929292` | `#0dbc79` | Prompt user segment |
| `--terminal-command` | `#929292` | `#2472c8` | Typed command / input text |
| `--terminal-output` | `#d4d4d4` | `#333333` | Body / command output |
| `--terminal-error` | `#f14c4c` | `#cd3131` | Errors |
| `--terminal-success` | `#23d18b` | `#0dbc79` | Success **+ the power-on phosphor green** |
| `--terminal-warning` | `#f5f543` | `#e5e510` | Warnings |
| `--terminal-info` | `#29b8db` | `#11a8cd` | Info / prompt path (cyan) |
| `--terminal-codeBackground` | `#333333` | `#e8e8e8` | Inline-code chip well (NEW token, §3.3). Dark value = the old rendered `--color-brightBlack` (zero visual change); light value fixes the previously-unreadable chip (was `#333333`-on-`#666666` ≈ 2.2:1, now ≈ 10.3:1) |
| `--terminal-glow` | `none` | `none` | Full `text-shadow` string for whole-tube phosphor bloom (NEW token, §4). `none` for dark/light keeps default text crisp by construction; amber/green carry a real value — see DESIGN_GUIDE_2026-2.md §5 |

Both new semantic tokens are declared on the `TerminalColors` interface (`themes/index.ts:24-35`), so a theme missing either is a TypeScript error and is also caught by the theme-completeness unit test.

### 2.4 On-screen roles (home page)

The landing content maps to tokens as follows — match these when adding content:

- **Amber/yellow heading** ("Hi. I'm Dave.") → yellow family.
- **Blue subtitle** ("Cloud-Native Principal Architect | …") → blue family.
- **Green section headers** ("About Me", "Technical Arsenal") and **inline highlight phrases** ("proven, enterprise-scale experience") → green / `--terminal-success`.
- **Grey body text** → `--color-foreground` / `--terminal-output`.
- **Prompt** (`dave@resume:~$`) → `--terminal-prompt` (grey, dark theme), separator `--color-foreground`, path `--terminal-info` (cyan). See `TerminalPrompt.vue:22-43`.

### 2.5 Rules

- **Do** read color from tokens: `color: var(--terminal-success);`
- **Do** include the existing fallback when touching a line that has one (don't strip it), but treat the token as the real value.
- **Don't** introduce a new hex literal in a component as the *primary* value.
- **Don't** add a new theme without populating **both** the `colors` (full ANSI) and `terminal` blocks, plus `font` and `spacing` — `applyTheme()` reads all of them.

### 2.6 Phosphor themes (amber, green)

Two single-gun phosphor themes ship alongside dark/light: **Amber P3** (`amber.json`, `#ffb000` on `#160e02`) and **Green P1** (`green.json`, `#33ff33` on `#0a0f0a`). They are not "color schemes" — they emulate specific phosphor compounds, so their full ANSI block is an **intensity ladder**, not a hue wheel (one gun, one phosphor, brightness is the only variable). The exact token tables, computed WCAG figures, and the phosphor-physics rationale are owned by **DESIGN_GUIDE_2026-2.md §4–§5** — that is the spec; do not duplicate the values here.

As-built notes specific to this guide:

- **Whole-tube glow.** Each phosphor theme stores a `terminal.glow` `text-shadow` string (amber `0 0 6px rgba(255,176,0,.30)`, green `0 0 8px rgba(51,255,51,.35)`). It is consumed as a **single inherited `text-shadow: var(--terminal-glow, none)` on `.terminal`** in `web/src/css/terminal.scss`, so it blooms *every* lit glyph — output, prompt, command, input, cursor, headings, code. This is intentional (a real P1/P3 tube glows every excited phosphor); it is the §4 / DESIGN_GUIDE_2026-2.md §11.2 ruling, not a scope error. The dim-beam prompt blooms less only because its base color is darker (fixed alpha × darker glyph = fainter halo).
- **`auto` never selects them.** `auto` resolves to dark/light only; amber/green are reached solely via `theme amber` / `theme green`.

### 2.7 Token-usage annotations

`themes/index.ts` carries `COLOR_TOKEN_USAGE` and `TERMINAL_TOKEN_USAGE` maps (generated from `--color-*` / `--terminal-*` greps across `web/src`). Each entry tags a token `load-bearing` (a wrong value visibly breaks the UI), `decorative` (borders/chrome; exempt from text-contrast floors), or `ansi-slot` (present only to fill the 16-color ANSI set, not consumed by component CSS). JSON cannot carry comments — this map *is* the annotation layer. Grep it before assuming a palette key is unused.

---

## 3. Typography

### 3.1 Font roster

Defined in `web/src/config/fonts.json`. Ten monospace families; **Fira Code** is default (`fonts.json:2`), base size **18px**, base line-height **1.6** (`fonts.json:3-4`).

| Font | Source | Notes |
|------|--------|-------|
| Unscii | Self-hosted (`/fonts/unscii.css`) | 8×8 bitmap; overrides size 14 / line-height 1.9 |
| JuliaMono | Self-hosted (`/fonts/juliamono.css`) | 6 weights, woff2 |
| JetBrains Mono | Google Fonts | wght 400/500/700 |
| **Fira Code** | Google Fonts | **default** |
| Source Code Pro | Google Fonts | wght 400/500/700 |
| IBM Plex Mono | Google Fonts | wght 400/500/700 |
| Menlo / Monaco | System (macOS) | no web load |
| Consolas | System (Windows) | no web load |
| Courier New | System (universal) | fallback |

### 3.2 Switching & persistence

- **Composable:** `web/src/composables/useFont.ts`. Sets `--font-family`, `--font-size`, `--font-line-height` on `:root`; applies synchronously (CSS-var swap, no re-render).
- **Per-font preferences:** each font persists its own size (8–32px) and line-height (0.5–3.0) under keys derived from `kenzik-resume-font*`.
- **Command:** `font` (no args) lists fonts + current; `font <name>` switches; `font spacing <0.5–3.0>` sets line-height. See `web/src/commands/settings.ts:75-132`.

### 3.3 Type scale

Body uses `--font-size` / `--font-line-height`. Markdown rendering in `Terminal.vue`:

| Element | Size |
|---------|------|
| h1 | `1.4em` |
| h2 | `1.0em` |
| h3 | `0.75em` |
| `code` (inline) | base, `--terminal-codeBackground` background, 2px 6px pad (`web/src/css/terminal.scss` `:deep(code)`) |
| `pre` | base, `white-space: pre-wrap` |

Responsive base size: 18px desktop → 15px (≤768px) → 14px (≤480px); line-height 1.6 → 1.5 → 1.4 (`app.scss` media queries). Mobile input is forced to 16px to block iOS auto-zoom.

### 3.4 Rules

- **Do** keep everything monospace — `var(--font-family, monospace)`.
- **Don't** add display/proportional fonts or icon fonts; emoji are acceptable (see the 👋).
- **Don't** hardcode `font-size` in px in a component; use the token so per-font sizing keeps working.

---

## 4. CRT Visual Language

All in `web/src/components/CRTFrame.vue` unless noted. The effect is built from stacked, mostly-transparent layers — keep them subtle.

> **SCSS file map (as-built).** The ~600 lines of style that used to live inline in `Terminal.vue` were extracted in Phase 2 into three partials under `web/src/css/`, imported into `Terminal.vue`'s scoped `<style>` so Vue still scopes the selectors and keyframe names:
> - `terminal.scss` — terminal layout, cursor, markdown (`:deep(code)`/`:deep(pre)`), the inline-code chip, the screen-glow `box-shadow`, and the single inherited `text-shadow: var(--terminal-glow, none)`.
> - `crt-effects.scss` — the `crt-smack-triple` / `crt-roll-triple` keyframes and their reduced-motion suppression (§5.3, §5.4).
> - `crt-timing.scss` — the named `--crt-*` boot/transition timing custom properties (§5.1), defined on `:root` via `app.scss` so both Landing and Terminal inherit them.
>
> This was a pure refactor: zero rendered-value change, gated by the 0-pixel screenshot baseline.

| Layer | Technique | Key values |
|-------|-----------|------------|
| **Outer bezel** | Inset `box-shadow` (6 layers) | radius 20/14/10px responsive |
| **Inner bezel** | Inset shadows → recessed screen | radius 16/10/8px |
| **Glass curve** | 3× `radial-gradient` (top-left highlight, center bulge, edge barrel-darkening) | low alphas (0.01–0.04) |
| **Scanlines** | `repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0-1px, transparent 1-3px)` | `z-index: 100` |
| **Vignette** | `radial-gradient` edge darkening | `z-index: 99` |
| **Screen glow** | Terminal container inset `box-shadow` | `inset 0 0 100px rgba(0,20,20,0.3)`, `inset 0 0 50px rgba(0,150,120,0.02)` (`web/src/css/terminal.scss`) |

Global frame tokens (`app.scss:14-27`): `--terminal-max-width: 1200px`, `--terminal-max-height: 900px` (4:3), `--terminal-border-radius: 16px`, `--terminal-bezel-shadow` (4-layer).

Phosphor text glow appears in special modes (e.g. WOPR green `text-shadow: 0 0 10px rgba(51,255,51,0.3)`, DOOM red).

**The "default resume text is not glowed" rule, as-built:**

- **dark / light themes:** still true, by construction. Both store `terminal.glow: "none"`, the canonical fallback in `cssDefaults.ts` is `"none"`, so the `text-shadow: var(--terminal-glow, none)` on `.terminal` resolves to `none` — text is crisp and these themes render pixel-identical to before the token landed.
- **amber / green phosphor themes:** carry a deliberate, spec'd **whole-tube glow** (§2.6). This is the one sanctioned place ordinary output glows, because in a monochrome phosphor theme the *whole screen* is the easter egg (DESIGN_GUIDE_2026-2.md §3 B-tier exception, ruling §11.2). It is **not** a per-role "glow = output" web-app semantic; it is one inherited `text-shadow` blooming every excited phosphor.

Do not add a `text-shadow` to ordinary output for dark/light, and do not glow individual roles in the phosphor themes — the single inherited declaration is the entire mechanism.

### Rules

- **Do** add new overlays as additional low-alpha layers with explicit `z-index` below scanlines (100) / vignette (99).
- **Don't** raise scanline opacity or saturation to "make it pop" — the restraint is the design.

---

## 5. Motion & Boot Sequence

The boot is **dual-clocked**: CSS keyframes drive the visuals, JS timers drive content reveal + redirect. As of Phase 2 both clocks are named, not magic numbers:

- **CSS timing vars** live in `web/src/css/crt-timing.scss` as `--crt-*` custom properties on `:root` (durations only; the choreography `@ Xs` delays and the ×3 flicker count remain literals at their call sites in `Landing.vue` / `crt-effects.scss`).
- **JS clock constants** live in `web/src/constants/index.ts` as `BOOT_TIMINGS` (`poweredOnMs: 3500`, `redirectMs: 5000`) and `CRT_TRANSITION_TIMINGS` (`durationMs: 1800`). `redirectMs` is env-overridable via `VITE_POWER_ON_DELAY_MS` (the test harness sets it low; production leaves it at 5000).

Same numbers, named once — change a phase here and re-derive the CSS timeline in the same commit. Full named timeline: DESIGN_GUIDE_2026-2.md §8.1.

### 5.1 Power-on warm-up (`web/src/pages/Landing.vue`)

The marquee animation. Phosphor green is `--terminal-success` (`#23d18b`). Timeline (keyframes in `Landing.vue`, durations from `crt-timing.scss`):

| Layer | Animation | Duration / delay | Keyframe |
|-------|-----------|------------------|----------|
| Power line | `powerLineAppear` | 0.5s | line ignites from `scaleY(0)`, brightness flash |
| Power line | `powerLineExpand` | 2s @ 0.5s delay | line blooms to full screen, green → background |
| Power line | `powerLineFlicker` | 0.1s ×3 @ 0.2s | ignition flicker |
| Phosphor glow | `phosphorWarmup` | 2s @ 0.3s | radial green glow fades in then settles to 0.3 |
| Screen | `screenWarmup` | 2s @ 0.5s | brightness/saturate ramp 0.5 → 1.2 → 1 |
| Cursor | `cursorBlink` | 1s infinite | top-left startup cursor |

Total warm-up ≈ 3.5s. Keep these timings in sync if you touch any one — they're choreographed.

### 5.2 Cursor & typewriter

- **Blink:** `@keyframes blink { 0%,50% opacity:1; 51%,100% opacity:0 }`, `blink 1s infinite` (`web/src/css/terminal.scss`). Hidden on mobile (native caret used). Under reduced motion the cursor is a steady block (§5.4).
- **Typewriter:** `web/src/composables/useTypewriter.ts`, speeds in `constants/index.ts:36-40`:
  - `default` `{ delay: 5, charsPerTick: 5 }`
  - `pager` `{ delay: 2, charsPerTick: 50 }`
  - `zmachine` `{ delay: 3, charsPerTick: 8 }`
  - ANSI-aware (won't split escape sequences); cancellable.

### 5.3 Mode transitions

`crt-smack-triple` and `crt-roll-triple` (both `1.8s` via `--crt-smack-duration` / `--crt-roll-duration`, keyframes in `web/src/css/crt-effects.scss`) fire when entering Zork / DOOM / WOPR — simulate hitting the TV (horizontal glitch) and vertical-hold sync loss. The JS side waits `CRT_TRANSITION_TIMINGS.durationMs` (`constants/index.ts`) on a `setTimeout` before switching mode — *not* `animationend` — so under reduced motion (where the animation is suppressed) the egg cuts straight to its mode. Reserved for easter-egg entry; don't reuse for ordinary command output.

### 5.4 Reduced-motion boot — the "fast-boot switch"

As of Phase 3, `prefers-reduced-motion: reduce` is honored on **both** clocks (DESIGN_GUIDE_2026-2.md §8.2 is now as-built):

- **CSS half:** an `@media (prefers-reduced-motion: reduce)` block in `Landing.vue` collapses the warm-up to a single opacity ease (`--crt-reduced-ignite: 0.2s` in `crt-timing.scss`) — no flicker, no bloom sweep, no brightness oscillation.
- **JS half:** `Landing.vue` reads `window.matchMedia('(prefers-reduced-motion: reduce)')` and switches to `BOOT_TIMINGS.reducedMotion` (`poweredOnMs → 300`, `redirectMs → 800`). `VITE_POWER_ON_DELAY_MS` still overrides the redirect under both variants, so the fast-boot test path is preserved.
- Cursor blink becomes a **steady block**; `crt-smack-triple` / `crt-roll-triple` are suppressed entirely (`crt-effects.scss`), easter eggs cut directly to their mode.
- Scanlines / vignette / bezel remain — they are static texture, not motion.

It is still a *boot* — the screen still turns on. It is the DIP-switch warm start, not a different machine.

---

## 6. Layout & Responsive

| Aspect | Desktop | ≤768px | ≤480px |
|--------|---------|--------|--------|
| Terminal padding | 20px | 14px | 10px |
| Base font | 18px | 15px | 14px |
| Line height | 1.6 | 1.5 | 1.4 |
| Bezel radius | 20px | 14px | 10px |
| Width | `min(90vw, 1200px)` | 96vw | 98vw |

Layout is flex-column: scrolling output region (`flex: 1`) above a fixed input line. Mobile switches to a native-scroll output container with `caret-color` visible and 16px input (iOS zoom guard). Breakpoint constant: `MOBILE_BREAKPOINT = 768` (`constants/index.ts:20`).

---

## 7. Token Reference (appendix)

Set at runtime — grep here before inventing a variable.

**By `useTheme.ts`** (per active theme): `--color-{background,foreground,cursor,selection,black,red,green,yellow,blue,magenta,cyan,white,brightBlack,brightRed,brightGreen,brightYellow,brightBlue,brightMagenta,brightCyan,brightWhite}`, `--terminal-{prompt,command,output,error,success,warning,info,codeBackground,glow}`, `--font-size`, `--font-weight`, `--spacing-padding`. (`codeBackground` and `glow` are the two tokens added in 2026.)

**By `web/src/css/crt-timing.scss`** (`:root`, static): `--crt-line-ignite`, `--crt-line-flicker`, `--crt-bloom`, `--crt-phosphor-warmup`, `--crt-screen-warmup`, `--crt-smack-duration`, `--crt-roll-duration`, `--crt-reduced-ignite`. See §5.

**Canonical fallbacks:** every `var(--token, fallback)` routes through `web/src/config/cssDefaults.ts` (`CSS_DEFAULTS`), and the canonical fallback **is the dark-theme value** — a failed token load renders the on-brand dark screen. `codeBackground` falls back to `#333333`, `glow` to `none`.

**By `useFont.ts`** (per active font): `--font-family`, `--font-size` *(overrides theme size)*, `--font-line-height`.

**By `app.scss` `:root`** (static): `--terminal-max-width`, `--terminal-max-height`, `--terminal-width`, `--terminal-height`, `--terminal-border-radius`, `--terminal-bezel-shadow`.

**LocalStorage keys** (`STORAGE_KEYS`, `constants/index.ts:26-33`): `kenzik-resume-theme`, `kenzik-resume-font`, `kenzik-resume-line-height` (+ per-font derived keys), and `kenzik-resume-pwa-update` (`pwaUpdatePending` — set by the service-worker `updated()` hook, read-and-cleared once by `useMotd` to emit the update line; §10).

---

## 8. Do / Don't for AI Edits

**Do**
- Read color/size/spacing from the tokens in §7; let the theme/font systems own the values.
- Preserve the boot sequence choreography and its ≈3.5s timing when touching `Landing.vue`.
- Keep the phosphor green `#23d18b` (`--terminal-success`) as the power-on / success color.
- Add overlays as new low-alpha layers respecting the z-index stack (scanlines 100, vignette 99).
- Keep everything on the monospace grid.

**Don't**
- Hardcode a brand hex/size as a component's primary value (fallbacks-only).
- Add spinners, skeletons, or generic web-app chrome — the boot sequence *is* the loading state.
- Introduce proportional fonts, icon-font libraries, or non-CRT motion (slide-ins, parallax).
- Crank scanline/vignette/glow opacity for emphasis.
- Add a theme without filling **all** blocks (`colors`, `terminal`, `font`, `spacing`).

---

## 9. Accessibility (as-built)

Accessibility here is treated as period-correct: the hardware we emulate had a fast-boot jumper, brightness knobs, and serial-terminal discipline. Spec and rationale: DESIGN_GUIDE_2026-2.md §7.

- **Input ARIA.** Both command inputs (desktop QScrollArea path and mobile native-scroll path) carry `aria-label="Terminal command input"` (`Terminal.vue`).
- **Output regions.** Each output scroll container carries `role="log"` **+ `aria-live="off"`** and `aria-label="Terminal output"`. The `aria-live="off"` is deliberate and load-bearing: the typewriter replaces the line's `innerHTML` on *every* tick, so an implicitly-polite `role="log"` would chatter one announcement per character. WAI-ARIA lets `aria-live="off"` override the implicit politeness that `role="log"` would otherwise imply.
- **Single-shot announcer.** A non-painting `clip-rect` `sr-only` div with `aria-live="polite"` + `aria-atomic="true"` receives a plain-text update **once per completed command** (after the typewriter pass finishes), giving screen readers one clean announcement per result instead of per-tick chatter. This finding was previously documented only in the `Terminal.vue` comment block (~lines 34-49); it is recorded here per DESIGN_GUIDE_2026-2.md §7 ("document the finding either way"). VoiceOver cannot be driven headless; the chatter risk is established by static analysis of the per-tick `innerHTML` swap.
  - *Side effect of record:* this otherwise-invisible div's text content makes linux Chromium/FreeType deterministically reshade ~102px of glyph-edge antialiasing on the MOTD line, which is why `dark-home-linux.png` was rebased under the design-director sign-off in DESIGN_GUIDE_2026-2.md §11.1 (darwin stays 0-diff).
- **Modal focus restoration.** Game / quit modals already had correct dialog ARIA (`role="dialog"`, `aria-modal`, `aria-labelledby`). As-built, closing a game/modal restores focus to the terminal input (covers desktop + mobile) rather than dropping focus to `<body>`.
- **Reduced motion.** The §5.4 fast boot is the screen-reader-and-vestibular-safe path; it is wired on both the CSS and JS clocks.

---

## 10. Offline & PWA (as-built)

*The terminal works when the mainframe is down.* Doctrine and rationale: DESIGN_GUIDE_2026-2.md §10.

- **Build mode.** `web/package.json` `build` script is `quasar build -m pwa`; `distDir` is pinned to `dist/spa` in `quasar.config.js` (so CI, the Cloudflare deploy, and the `afterBuild` data-copy hook need no path changes). The service worker is emitted at `dist/spa/sw.js` with a Workbox runtime at the `dist/spa` root.
- **Workbox.** `workboxMode: 'generateSW'`; precache policy is set in `quasar.config.js` `extendGenerateSWOptions`:
  - **Precache (app shell only):** hashed `**/*.{js,css}`, `index.html`, the favicon/PWA-icon set, the two **Latin-subset** JuliaMono woff2 + `unscii-8` (the full ~1 MB-each JuliaMono weights are deliberately excluded), the font CSS, and `data/example.yml`.
  - **Never precache:** `games/**` (`globIgnores`) — the 11 MB FreeDoom bundle + Zork story file. Games are runtime `CacheFirst` only after a deliberate first play.
  - **Runtime:** YAML via `NetworkFirst` (10 s timeout → cache when offline; `kenzik.yml` is copied *after* the glob runs so it can't be precached); games `CacheFirst`.
- **Update flow.** The only user-visible update signal is a **MOTD terminal line on next visit** — no toast, no banner, no refresh button (§3 F-tier applies to SW UX too). `src-pwa/register-service-worker.ts` `updated()` sets `STORAGE_KEYS.pwaUpdatePending`; `useMotd` reads-and-clears it to emit one line.
- **Rollback.** One line: change `build` in `web/package.json` back to `quasar build` (SPA mode). There is **no** `pwa: false` config toggle — Quasar selects mode via the `-m` CLI flag.

---

## 11. Testing, baselines & CI (as-built)

A Vitest + Playwright safety net was added in Phase 1 and grew with each phase. None of it ships to users; all of it gates merges.

- **Unit (Vitest, happy-dom):** `web/test/unit/**` — `useTheme`, `useTypewriter`, `useMotd`, `usePipeline`, `commands-registry`, `theme-completeness` (every registered theme must define every `ThemeColors`/`TerminalColors` key, incl. `codeBackground`/`glow`), `cssDefaults` (canonical fallback == `dark.json`), and `contrast-regression` (light-theme code chip now ≥ 4.5:1 — the live bug, flipped from expected-fail to passing in Phase 3). Run: `yarn test:unit`.
- **E2E (Playwright, Chromium):** `web/test/e2e/**` — `boot`, `smoke` (help, pipe, ARIA, phosphor home screens), `themes` (switch across all registered themes), `easter-egg` (smack/roll class assertion + reduced-motion). Run: `yarn test:e2e`. One un-shortened test observes the full ~3.5s boot; the rest set `VITE_POWER_ON_DELAY_MS=500`.
- **Offline E2E:** `web/test/e2e-offline/offline.spec.ts` via `playwright.offline.config.ts` — runs against the **built** app served from `dist/spa` (port 9100, history fallback), asserting behavior not pixels: SW registration, offline reload, precache policy. Run: `yarn test:e2e:offline`.
- **Screenshot baselines.** Per-platform, **strict 0-diff (no `maxDiffPixels`, ever)**, stored under `web/test/e2e/__screenshots__/smoke.spec.ts-snapshots/`. The matrix is **3 home screens × 2 platforms**: `dark|amber|green-home-{darwin,linux}.png` (light has no screenshot baseline). Regenerating an existing baseline requires the five gates in DESIGN_GUIDE_2026-2.md §11.1 **plus** design-director sign-off; adding a net-new baseline follows §11.2.
- **CI (`.github/workflows/test.yml`), four jobs:** `unit`; `e2e` (darwin baselines compared on the linux runner against the committed `*-linux.png`); `build-and-perf` — production PWA build + the **≤ 250 KB gzip** app-JS+CSS budget over `dist/spa/assets` (games excluded by construction) + a **precache-policy gate** (no `games/` in the manifest, `index.html` + an `assets/*.js` present, total precache ≤ 1 MB, `sw.js` + `manifest.json` exist) + the obfuscation grep; and `offline-e2e`.

---

## 12. Modernization status (former §9 backlog, trued up)

The old "vibe-coded artifacts" backlog was the brief for the 2026 modernization and is now executed. Status of each original item:

1. **Scattered hardcoded fallbacks → DONE.** `web/src/config/cssDefaults.ts` is the canonical fallback SSOT; the prior drift (`prompt`/`command` `#929292`, `brightBlack` `#333333`) is fixed and every fallback now == the dark-theme value. See §7 and DESIGN_GUIDE_2026-2.md §9.2.
2. **Monolithic `Terminal.vue` SCSS → DONE (SCSS).** ~600 lines of style extracted to `web/src/css/{terminal,crt-effects,crt-timing}.scss` (§4 file map). The optional further `TerminalOutput.vue` script split was a stretch goal and was **not** taken — `Terminal.vue` remains the command/render host (with the existing `TerminalPrompt.vue` and `components/terminal/{Pager,ZMachine,WOPR}` sub-components).
3. **Magic numbers in keyframes → DONE.** Named `--crt-*` vars in `crt-timing.scss` + `BOOT_TIMINGS` / `CRT_TRANSITION_TIMINGS` in `constants/index.ts` (§5.1).
4. **Mixed units → STILL OPEN (documented convention, stragglers not swept).** The intended convention — **px for the terminal grid, `em` for markdown-relative scale, unitless line-height** — is the rule; it is already mostly followed but no mechanical alignment pass was done. Lowest-risk remaining item; safe to leave.
5. **Dead `font.lineHeight` → DONE.** Removed from the theme JSONs; `ThemeFont` (`themes/index.ts`) documents that per-font line-height is owned by `useFont`, not themes.
6. **Underused / overlapping palette → ADDRESSED via annotation.** The full 16-color ANSI block is retained by design (real emulators expect it) but is now annotated by the `COLOR_TOKEN_USAGE` / `TERMINAL_TOKEN_USAGE` maps in `themes/index.ts` (§2.7), tagging each key load-bearing / decorative / ansi-slot.
7. **Two-theme ceiling → DONE.** Amber P3 + Green P1 added as registry-driven themes (§2.6); `ThemeName` and validation now derive from the registry.

---

*Last grounded against source on the `fix/modernization-2026-phase6` branch (post Phase 5), reflecting the 2026 modernization (decomposed SCSS, named timing clocks, 4-theme registry, `codeBackground`/`glow` tokens, reduced-motion boot, ARIA + offline PWA, Vitest/Playwright + CI). When a value here disagrees with the code, the code wins — update this file. Forward-looking spec and rulings live in `DESIGN_GUIDE_2026-2.md`.*

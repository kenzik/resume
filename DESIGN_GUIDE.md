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

- **Theme files:** `web/src/themes/dark.json`, `web/src/themes/light.json` (registered in `web/src/themes/index.ts`).
- **Applier:** `web/src/composables/useTheme.ts` — `applyTheme()` (lines 59-86) sets every `colors.*` key as `--color-<key>` and every `terminal.*` key as `--terminal-<key>`.
- **Default:** `'auto'` (`useTheme.ts:6`) — follows `prefers-color-scheme`; resolves to `dark` or `light`. Users override via the `theme` command; choice persists to LocalStorage key `kenzik-resume-theme`.

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
| `code` (inline) | base, `--color-brightBlack` background, 2px 6px pad |
| `pre` | base, `white-space: pre-wrap` |

Responsive base size: 18px desktop → 15px (≤768px) → 14px (≤480px); line-height 1.6 → 1.5 → 1.4 (`app.scss` media queries). Mobile input is forced to 16px to block iOS auto-zoom.

### 3.4 Rules

- **Do** keep everything monospace — `var(--font-family, monospace)`.
- **Don't** add display/proportional fonts or icon fonts; emoji are acceptable (see the 👋).
- **Don't** hardcode `font-size` in px in a component; use the token so per-font sizing keeps working.

---

## 4. CRT Visual Language

All in `web/src/components/CRTFrame.vue` unless noted. The effect is built from stacked, mostly-transparent layers — keep them subtle.

| Layer | Technique | Key values |
|-------|-----------|------------|
| **Outer bezel** | Inset `box-shadow` (6 layers) | radius 20/14/10px responsive |
| **Inner bezel** | Inset shadows → recessed screen | radius 16/10/8px |
| **Glass curve** | 3× `radial-gradient` (top-left highlight, center bulge, edge barrel-darkening) | low alphas (0.01–0.04) |
| **Scanlines** | `repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0-1px, transparent 1-3px)` | `z-index: 100` |
| **Vignette** | `radial-gradient` edge darkening | `z-index: 99` |
| **Screen glow** | Terminal container inset `box-shadow` | `inset 0 0 100px rgba(0,20,20,0.3)`, `inset 0 0 50px rgba(0,150,120,0.02)` (`Terminal.vue`) |

Global frame tokens (`app.scss:14-27`): `--terminal-max-width: 1200px`, `--terminal-max-height: 900px` (4:3), `--terminal-border-radius: 16px`, `--terminal-bezel-shadow` (4-layer).

Phosphor text glow appears in special modes (e.g. WOPR green `text-shadow: 0 0 10px rgba(51,255,51,0.3)`, DOOM red). Default resume text is **not** glowed — keep it crisp; glow is reserved for easter-egg modes.

### Rules

- **Do** add new overlays as additional low-alpha layers with explicit `z-index` below scanlines (100) / vignette (99).
- **Don't** raise scanline opacity or saturation to "make it pop" — the restraint is the design.

---

## 5. Motion & Boot Sequence

### 5.1 Power-on warm-up (`web/src/pages/Landing.vue`)

The marquee animation. Phosphor green is `--terminal-success` (`#23d18b`). Timeline (`Landing.vue:175-187`):

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

- **Blink:** `@keyframes blink { 0%,50% opacity:1; 51%,100% opacity:0 }`, `blink 1s infinite` (`Terminal.vue`). Hidden on mobile (native caret used).
- **Typewriter:** `web/src/composables/useTypewriter.ts`, speeds in `constants/index.ts:36-40`:
  - `default` `{ delay: 5, charsPerTick: 5 }`
  - `pager` `{ delay: 2, charsPerTick: 50 }`
  - `zmachine` `{ delay: 3, charsPerTick: 8 }`
  - ANSI-aware (won't split escape sequences); cancellable.

### 5.3 Mode transitions

`crt-smack-triple` and `crt-roll-triple` (both 1.8s, `Terminal.vue`) fire when entering Zork / DOOM / WOPR — simulate hitting the TV (horizontal glitch) and vertical-hold sync loss. Reserved for easter-egg entry; don't reuse for ordinary command output.

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

**By `useTheme.ts`** (per active theme): `--color-{background,foreground,cursor,selection,black,red,green,yellow,blue,magenta,cyan,white,brightBlack,brightRed,brightGreen,brightYellow,brightBlue,brightMagenta,brightCyan,brightWhite}`, `--terminal-{prompt,command,output,error,success,warning,info}`, `--font-size`, `--font-weight`, `--spacing-padding`.

**By `useFont.ts`** (per active font): `--font-family`, `--font-size` *(overrides theme size)*, `--font-line-height`.

**By `app.scss` `:root`** (static): `--terminal-max-width`, `--terminal-max-height`, `--terminal-width`, `--terminal-height`, `--terminal-border-radius`, `--terminal-bezel-shadow`.

**LocalStorage keys** (`constants/index.ts:26-30`): `kenzik-resume-theme`, `kenzik-resume-font`, `kenzik-resume-line-height` (+ per-font derived keys).

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

## 9. Modernization Opportunities (retro-preserving)

These are the "vibe-coded" artifacts. Each entry: **what → why it reads as vibe-coded → minimal retro-safe fix.** This is a backlog, not a mandate — none of it should change the on-screen look.

1. **Scattered hardcoded fallbacks**
   *What:* `var(--token, #literalhex)` is duplicated across components, with the literal sometimes drifting from the theme value (e.g. a fallback `#3b8eea` where the dark token is `#929292`).
   *Why vibe:* copy-paste defaults, no single source; risk of a fallback rendering an off-brand color if a token ever fails to load.
   *Fix:* `web/src/config/cssDefaults.ts` already exists — route all fallbacks through it (or a small SCSS map) so there's one canonical default set. Don't remove fallbacks; centralize them.

2. **Monolithic `Terminal.vue` (~2,200 lines)**
   *What:* one component mixes command handling, rendering, and ~600 lines of SCSS (terminal, cursor, smack/roll, responsive).
   *Why vibe:* the single biggest artifact — hard to navigate, easy to introduce regressions.
   *Fix:* extract the CRT/transition SCSS into a partial or style module, and split the smack/roll keyframes into a dedicated `crt-effects.scss`. Pure refactor; zero visual change.

3. **Magic numbers in keyframes/animations**
   *What:* warm-up durations/delays (`0.5s`, `2s`, `0.3s`), `scaleY` steps, translate px, brightness multipliers are inline literals in `Landing.vue` and `Terminal.vue`.
   *Why vibe:* tuned-by-feel constants with no names; the choreography is implicit.
   *Fix:* promote to named CSS vars (`--crt-warmup-duration`, `--crt-line-ignite`, etc.) at the top of each block so the timeline is legible and adjustable in one place.

4. **Mixed units**
   *What:* `px`, `rem`, `em`, and unitless line-heights intermix; markdown scale uses `em`, body uses px tokens.
   *Why vibe:* no stated convention.
   *Fix:* document the convention (px for the terminal grid, `em` for markdown-relative scale, unitless line-height) — already mostly followed; just make it a rule and align stragglers.

5. **Dead / ignored config**
   *What:* `dark.json` defines `font.lineHeight: "1.4"` but `useTheme.ts:74-78` deliberately ignores it (line-height is per-font via `useFont`).
   *Why vibe:* leftover field that looks authoritative but does nothing — a maintenance trap.
   *Fix:* remove `font.lineHeight` from theme JSON (or wire it as the per-font default) and drop the explanatory comment once resolved.

6. **Underused / overlapping palette**
   *What:* the full 16-color ANSI block is defined per theme, but only a handful of tokens are load-bearing; `white`/`brightWhite` and some base/bright pairs are identical.
   *Why vibe:* a palette scaffolded "to be safe," not to what the UI uses.
   *Fix:* annotate in the theme files which tokens are actually consumed; keep the full ANSI set only if a real terminal-color use case needs it.

7. **Two-theme ceiling**
   *What:* only `dark` + `light`, despite a token architecture that trivially supports more.
   *Why vibe:* stopped at the default scaffold.
   *Fix (additive, very on-brand):* add CRT-authentic themes — amber P3 phosphor (`#ffb000`-ish on near-black) and green P1 (`#33ff33` on black). Each is just a new JSON file with all four blocks; no code changes. This *adds* retro feel rather than removing it.

---

*Last grounded against source on the `feature/fable-review` branch. When a value here disagrees with the code, the code wins — update this file.*

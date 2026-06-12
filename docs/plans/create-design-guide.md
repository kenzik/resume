# Plan: Create `DESIGN_GUIDE.md`

## Context

The resume site is a retro-CRT terminal (Vue 3 + Quasar + TypeScript) that was partly "vibe coded" with Cursor/Claude a few months ago. Dave wants a single authoritative design document so that (a) the as-built design system is captured in one place and (b) future AI edits (Cursor/Claude) stay on-brand, and (c) the design can *eventually* be modernized without losing the retro look/feel.

Per the two scope answers, the guide is **Document + Modernize**, optimized as **AI-agent context** (tokens, file paths, semantic rules, do/don't constraints — plus a modernization section naming the vibe-coding artifacts with retro-preserving fixes).

**Deliverable:** a new `DESIGN_GUIDE.md` at the repo root (`/Volumes/ARCHIVE/Source/kenzik/resume/DESIGN_GUIDE.md`). This is a documentation-only task — no source files change.

## Source of truth (verified during exploration)

The guide is assembled from these real files/values — every claim must trace to one:

- **Themes/colors:** `web/src/themes/dark.json`, `web/src/themes/light.json`; applier `web/src/composables/useTheme.ts` (default `'auto'`, persists to `kenzik-resume-theme`, follows `prefers-color-scheme`). CSS vars: `--color-*` (full ANSI palette) and `--terminal-*` (semantic: prompt/command/output/error/success/warning/info).
- **Fonts/type:** `web/src/config/fonts.json` (10 fonts, default **Fira Code**, size 18 / line-height 1.6), `web/src/composables/useFont.ts` (sets `--font-family`, `--font-size`, `--font-line-height`; per-font persisted size 8–32px & spacing 0.5–3.0), `font` command in `web/src/commands/settings.ts`. Markdown scale in `Terminal.vue`: h1 1.4em / h2 1em / h3 0.75em.
- **CRT frame:** `web/src/components/CRTFrame.vue` — layered inset bezel shadows, radial-gradient glass curve, scanline `repeating-linear-gradient` (1px/3px), vignette, z-index 99/100.
- **Power-on warm-up:** `web/src/pages/Landing.vue` — keyframes `powerLineAppear`, `powerLineExpand`, `powerLineFlicker`, `phosphorWarmup`, `screenWarmup`; ~3.5s warm-up, 5s redirect; `--terminal-success` (#23d18b) phosphor green.
- **Layout/motion:** `web/src/components/Terminal.vue` (~2200 lines) — terminal padding 20/14/10px, `blink` cursor keyframe, `crt-smack-triple`/`crt-roll-triple` 1.8s transitions, phosphor `box-shadow` glow; prompt in `TerminalPrompt.vue` (`dave@resume:~$`). Typewriter speeds in `web/src/constants/index.ts` (`TYPEWRITER_SPEEDS`).
- **Global tokens:** `web/src/css/app.scss` (`--terminal-max-width:1200px`, `--terminal-max-height:900px`, bezel shadow, mobile breakpoints 768/480).

## Document structure

1. **Design Philosophy** — retro CRT terminal; "earnest emulation, not parody"; the boot ritual (off → warm-up line → phosphor glow → scroll-in) as the signature moment; constraint: every change must preserve the retro feel.
2. **Color System** — the two themes + `auto`; full token table mapping `--color-*` and `--terminal-*` to roles and the dark/light values; the observed on-screen roles (amber heading, cyan/blue subtitle, green section headers + highlights, grey body, grey prompt) tied to their tokens; **rule:** never hardcode hex in components — use tokens.
3. **Typography** — 10-font roster table (family, source, self-hosted vs Google vs system), Fira Code default, the type scale, per-font size/spacing persistence, the `font` command.
4. **CRT Visual Language** — bezel layers, glass curve, scanlines, vignette, phosphor glow; the exact values and z-index stack.
5. **Motion & Boot Sequence** — the warm-up keyframe timeline with timings; cursor blink; typewriter speeds; smack/roll transitions and when they fire.
6. **Layout & Responsive** — terminal dimensions, padding, the three breakpoints (desktop/768/480), mobile-specific behavior (native caret, 16px input to block iOS zoom).
7. **Token Reference (appendix)** — flat list of every CSS custom property with file origin, for fast AI lookup.
8. **Do / Don't for AI edits** — e.g. *Do* read tokens from `useTheme`/`useFont`; *Don't* add a third theme without populating both ANSI + terminal blocks; *Don't* break the 4-space monospace rhythm; keep phosphor green `#23d18b` for power-on.
9. **Modernization Opportunities (retro-preserving)** — names the vibe-coding artifacts and proposes fixes that keep the look:
   - **Scattered hardcoded fallbacks** (`var(--x, #hex)` duplicated everywhere, drift risk) → centralize defaults (`web/src/config/cssDefaults.ts` already exists — lean on it) and/or document one canonical fallback set.
   - **Monolithic `Terminal.vue` (~2200 lines mixing logic + 600 lines of SCSS)** → extract CRT/transition SCSS into a partial or dedicated style module; note this is the biggest "vibe" artifact.
   - **Magic numbers in keyframes/animations** (timings, scaleY steps, translate px) → name them as SCSS/CSS variables (`--crt-warmup-duration`, etc.).
   - **Mixed units** (`px` vs `rem` vs `em` vs unitless) → state a unit convention.
   - **Unused/duplicated palette** (full ANSI block defined but few colors used; bright vs base overlap) → document which tokens are actually load-bearing.
   - **Two-theme ceiling** → note the path to add CRT-authentic themes (amber P3 phosphor, green P1) since the token architecture already supports it.
   Each item: *what it is → why it reads as vibe-coded → minimal retro-safe fix*. Framed as a backlog, not prescriptive refactors.

## Files

- **Create:** `/Volumes/ARCHIVE/Source/kenzik/resume/DESIGN_GUIDE.md` (only file created).
- **Modify:** none.
- Optionally add a one-line pointer to `DESIGN_GUIDE.md` under "Key Files" in `CLAUDE.md` — **ask/skip**; not required, and CLAUDE.md is checked in. Default: leave CLAUDE.md untouched unless requested.

## Verification

- Render-check the Markdown (tables, code fences) — `npx markdownlint DESIGN_GUIDE.md` if available, else visual scan.
- Spot-verify ≥5 cited values against source (e.g. Fira Code default in `fonts.json:2`, `#23d18b` in `Landing.vue`, `--terminal-max-width:1200px` in `app.scss`) so no number is invented.
- Confirm every file path referenced in the guide exists (`ls` each).
- No build/test impact since no source changes; `yarn build` is not required for a docs-only addition.

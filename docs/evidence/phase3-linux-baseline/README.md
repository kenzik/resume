# Phase 3 linux baseline regeneration — audit trail

Required by the design-director sign-off conditions (DESIGN_GUIDE_2026-2.md §11.1):
the visual identity of the old and new `dark-home-linux.png` must remain auditable
after the baseline file is overwritten.

## What happened

The §7 screen-reader announcer (`Terminal.vue`, sr-only `aria-live="polite"` div)
never paints, but its text content makes linux Chromium/FreeType deterministically
reshade **102 pixels (0.011% of the frame)** of glyph-edge antialiasing in the MOTD
line — clusters "eri" (Experienced) and "ail" (available), rows 95–101. No layout
shift, no color-token change, no content change, no glyph-cell move.

Forensics (all in the CI-matching `mcr.microsoft.com/playwright:v1.60.0-jammy`
container, all deterministic across runs and retries):

- development tip re-run on a fresh CI runner passed → not environment drift.
- Commit bisect: passes at `667878b` (theme) and `6bf8a39` (reduced-motion);
  fails only with `cb793bf` (a11y).
- Chunk bisect: announcer removed → pass; announcer present but empty → pass;
  announcer with text → identical 102px fail regardless of DOM position
  (first/last child), font (terminal font vs `16px sans-serif`), or paint
  scheduling (separate vs same reactive flush as the final typewriter tick).

Suppressing the announcer's content is the only way to restore the old raster,
which would defeat the spec-required §7 feature. The baseline was therefore
regenerated, per the five-gate sign-off in §11.1. darwin's baseline is untouched
and still passes at 0-diff. The strict 0-diff policy is retained — no
`maxDiffPixels` tolerance was added.

## Files

| File | Description |
|------|-------------|
| `dark-home-expected.png` | The pre-Phase-3 linux baseline (overwritten by this change) |
| `dark-home-actual.png` | The Phase 3 rendering (now the committed baseline) |
| `dark-home-diff.png` | Playwright diff — the 102 red pixels |
| `crop-eri-{expected,actual}-4x.png` | 4× crop of the "Experienced" cluster |
| `crop-ail-{expected,actual}-4x.png` | 4× crop of the "available" cluster |

CI evidence runs: <https://github.com/kenzik/resume/actions/runs/27439820989>
(PR run), <https://github.com/kenzik/resume/actions/runs/27439805513> (push run),
<https://github.com/kenzik/resume/actions/runs/27435826887> (development control
re-run, passed).

# CLAUDE.md

## Project Overview
Resume as Code - Single YAML source generates multiple outputs (PDF, DOCX, MD, RTF, Web Terminal UI)

## Quick Commands

### Web Development
- `cd web && yarn dev` - Start dev server on localhost:9000
- `cd web && yarn build` - Production **PWA** build (`quasar build -m pwa`) to dist/spa/ (service worker at dist/spa/sw.js). Rollback: change `build` in web/package.json back to `quasar build` (SPA).
- `cd web && yarn lint` - ESLint check
- `cd web && yarn format` - Prettier format

### Web Tests
- `cd web && yarn test:unit` - Vitest unit suite (web/test/unit/)
- `cd web && yarn test:e2e` - Playwright e2e (web/test/e2e/; 0-diff screenshot baselines)
- `cd web && yarn test:e2e:offline` - Offline/PWA e2e against the built app (web/test/e2e-offline/)

### Resume Generation
- `cd python && python build_resume.py --format all --source ../data/example.yml`
- Add `--reveal-pii` to include contact details
- Requires `.env.local` with: RESUME_NAME, RESUME_EMAIL, RESUME_PHONE, RESUME_CITY_STATE, RESUME_LINKEDIN

## Architecture

### Data Flow
```
data/*.yml (Single Source of Truth)
    ├→ python/build_resume.py → PDF/DOCX/MD/RTF
    └→ web/ → Terminal UI (loads YAML at build time)
```

### Key Directories
- `data/` - YAML resume files (kenzik.yml gitignored)
- `python/` - Document generator (fpdf2, python-docx)
- `web/src/commands/` - Terminal command implementations
- `web/src/composables/` - Vue composition utilities
- `web/src/themes/` - Theme JSON (dark/light/amber/green) + registry/validator (index.ts)
- `web/src/css/` - Decomposed terminal SCSS ({terminal,crt-effects,crt-timing}.scss)
- `web/src/games/wopr/` - WOPR game logic
- `web/src-pwa/` - PWA service-worker registration (offline mode)
- `web/test/` - Vitest unit + Playwright e2e (incl. e2e-offline) + screenshot baselines
- `web/build/` - Vite plugins (obfuscation)

### Terminal Command System
Commands registered in `web/src/commands/index.ts`:
- `core.ts` - help, clear, history, motd
- `resume.ts` - resume, skills, experience, download
- `settings.ts` - theme, font, scanlines
- `pipe.ts` - grep, head, tail, more, wc

## Easter Eggs (7 Triggers)
The five *typed launch* triggers are obfuscated in the built dist at build time via `web/build/obfuscate-plugin.js` (XOR with git commit hash); a CI gate (`.github/workflows/test.yml`) asserts they never appear as plaintext in `dist/spa` (excluding `dist/spa/games/**`). `joshua`/`wopr` ship plaintext **by design** — `joshua` is the WOPR in-game password (string comparison in game logic), not a typed launch trigger — so they are deliberately excluded from the gate.

| Game | Triggers | File | Obfuscated |
|------|----------|------|------------|
| Zork I | xyzzy, plugh | useZMachine.ts | yes |
| DOOM | iddqd, idkfa, idspispopd | useDoom.ts | yes |
| WOPR | joshua, wopr | useWOPR.ts | no (plaintext by design) |

## Environment Variables

### Web (web/.env.local)
VITE_RESUME_NAME, VITE_RESUME_CITY_STATE, VITE_RESUME_LINKEDIN, VITE_RESUME_GITHUB

### Python (python/.env.local)
RESUME_NAME, RESUME_EMAIL, RESUME_PHONE, RESUME_CITY_STATE, RESUME_LINKEDIN

## Themes
4 themes + auto: `dark`, `light`, `amber` (P3 phosphor), `green` (P1 phosphor); `auto` resolves to dark/light only. Registry-driven in `web/src/themes/index.ts` (add a theme there; `ThemeName` + validation derive from the registry). Switch via the `theme` command. Token/physics spec: DESIGN_GUIDE_2026-2.md §4-§5; as-built: DESIGN_GUIDE.md §2.

## CI/CD
- `.github/workflows/deploy.yml` - Production (on version tags)
- `.github/workflows/preview.yml` - PR previews
- `.github/workflows/test.yml` - Unit + e2e + build/perf-budget + offline-e2e (on push to development/feature/test/fix branches + PRs to development)
- Deploys to Cloudflare Pages
- Resume YAML stored as base64 GitHub secret (RESUME_YAML_B64)

## Coding Patterns
- Vue 3 Composition API (composables in `web/src/composables/`)
- Modular command registry pattern
- TypeScript strict mode
- SCSS with CSS custom properties for theming

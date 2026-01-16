# CLAUDE.md - Terminal Resume Project

## Project Overview

This is a terminal-based web resume with a retro CRT monitor aesthetic. The interface is a Unix-like CLI where visitors can explore Dave's resume using commands like `help`, `resume`, `skills`, `experience`, etc.

**Live Site:** [kenzik.com](https://kenzik.com)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3 + Quasar Framework + TypeScript |
| Build | Vite |
| Backend | Cloudflare Workers |
| Data | YAML (single source of truth) |
| Styling | SCSS + CSS Custom Properties (theming) |

## Project Structure

```
resume/
├── data/                    # Data layer - Single Source of Truth
│   ├── kenzik.yml           # Actual resume data (gitignored, provided via secrets)
│   └── example.yml          # Template for others
│
├── python/                  # Document generation (PDF, DOCX, MD, RTF)
│   └── build_resume.py
│
├── web/                     # Vue 3 web application
│   ├── src/
│   │   ├── components/      # Vue components
│   │   │   ├── Terminal.vue          # Main terminal component
│   │   │   ├── CRTFrame.vue          # CRT monitor effect wrapper
│   │   │   ├── DoomCanvas.vue        # DOOM game canvas
│   │   │   ├── DoomPauseModal.vue    # DOOM pause menu
│   │   │   └── ZMachineQuitModal.vue # Zork quit confirmation
│   │   ├── composables/     # Vue composables
│   │   │   ├── useCommands.ts        # Terminal command handling
│   │   │   ├── useDoom.ts            # DOOM game state & js-dos bridge
│   │   │   ├── useZMachine.ts        # Zork game state & ifvms bridge
│   │   │   ├── useTheme.ts           # Theme system
│   │   │   ├── useFont.ts            # Font switching
│   │   │   ├── useTypewriter.ts      # Typewriter effect
│   │   │   └── usePipeline.ts        # Command piping (grep, head, tail)
│   │   └── themes/          # Theme JSON files
│   ├── public/
│   │   └── games/           # Game assets
│   │       ├── zork1.z3              # Zork I story file (~84KB)
│   │       └── doom/
│   │           └── freedoom.jsdos    # FreeDoom js-dos bundle (~11MB)
│   └── build/
│       └── obfuscate-plugin.js       # Easter egg trigger obfuscation
│
└── *.prd.md                 # Product requirement documents
```

## Development Commands

```bash
# Web app development
cd web
yarn install
yarn dev          # Start dev server at http://localhost:9000
yarn build        # Production build to dist/spa/
yarn preview      # Preview production build

# Document generation
cd python
pip install -r requirements.txt
python build_resume.py --source ../data/kenzik.yml --format all
```

## Easter Eggs

### Zork I (Text Adventure)

**Trigger Commands:** `xyzzy`, `plugh` (classic Interactive Fiction magic words)

- Uses ifvms.js Z-machine interpreter
- Story file: `web/public/games/zork1.z3`
- Composable: `useZMachine.ts`
- Exit: Type `quit` or `q` in-game

### FreeDOOM (FPS)

**Trigger Commands:** `iddqd`, `idkfa`, `idspispopd` (classic DOOM cheat codes)

- Uses js-dos emulator with FreeDoom WAD (legally free, BSD licensed)
- Bundle: `web/public/games/doom/freedoom.jsdos`
- Composable: `useDoom.ts`
- Exit: Press Escape for pause menu

### CRT Transition Effects

Both games trigger retro CRT effects when launching:
- **"Smack" Effect**: Simulates hitting the side of an old TV
- **"Roll" Effect**: Simulates vertical hold sync issues

### Obfuscation

Easter egg trigger commands are XOR-encoded at build time using the git commit hash as the key. This prevents casual discovery via DevTools while keeping the source readable.

- Build plugin: `web/build/obfuscate-plugin.js`
- Encoded triggers injected as `__ENCODED_TRIGGERS__` global
- Runtime decoding in `useCommands.ts`

## Key Files for Modifications

| Purpose | File |
|---------|------|
| Add/modify commands | `web/src/composables/useCommands.ts` |
| Terminal behavior | `web/src/components/Terminal.vue` |
| Resume data | `data/kenzik.yml` |
| Themes | `web/src/themes/*.json` |
| Easter egg triggers | `web/build/obfuscate-plugin.js` |
| CRT visual effects | `web/src/components/CRTFrame.vue` |

## Build-Time Injected Constants

Available at runtime (declared in `web/src/types/build.d.ts`):

| Constant | Description |
|----------|-------------|
| `__BUILD_HASH__` | Short git commit hash |
| `__BUILD_VERSION__` | Git describe output |
| `__BUILD_BRANCH__` | Current branch name |
| `__BUILD_TIME__` | ISO build timestamp |
| `__ENCODED_TRIGGERS__` | Encoded easter egg command map |
| `__RESPONSE_PREFIX__` | Encoded `__Z__` prefix (Z-Machine) |
| `__DOOM_PREFIX__` | Encoded `__DOOM__` prefix (DOOM) |

## Terminal Commands

Users can run Unix-like commands:
- `help` - List available commands
- `resume` - Display full resume
- `skills` - List technical skills
- `experience [company]` - Filter experience by company
- `download [format]` - Download resume (pdf, docx, md, rtf)
- `theme [name]` - Switch color themes
- `font [name]` - Change terminal font
- `clear` - Clear terminal
- Piping supported: `resume | grep AI | head 5`

## Legal Notes

- **Zork I**: MIT licensed (Microsoft release, Nov 2025)
- **FreeDoom**: BSD licensed (free DOOM reimplementation)
- **js-dos**: MIT licensed

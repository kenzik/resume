# Terminal Resume Web App

A terminal-based resume web application built with Quasar, Vue 3, and TypeScript.

## Setup

1. Install dependencies:
```bash
yarn install
# or
npm install
```

2. Start development server:
```bash
yarn dev
# or
npm run dev
```

The app will open at `http://localhost:9000`

## Features

- **Theme System**: Auto-switching dark/light themes based on system preference
- **Terminal UI**: Interactive terminal interface with typewriter effect
- **Resume Data**: Loaded from Single Source of Truth (`data/kenzik.yml`)
- **Easter Eggs**: Hidden retro gaming experiences (see below)

## Easter Eggs

The terminal contains several hidden easter eggs activated by secret commands. All triggers are XOR-obfuscated at build time using the git commit hash.

### Zork (Z-Machine)
Classic text adventure running on a TypeScript Z-machine interpreter.
- **Triggers**: Classic interactive fiction magic words
- **Files**: `src/composables/useZMachine.ts`, `public/games/zork1.z3`

### DOOM (js-dos)
FreeDoom running via DOSBox in WebAssembly.
- **Triggers**: Classic DOOM cheat codes
- **Files**: `src/composables/useDoom.ts`, `public/games/doom/`

### WOPR (WarGames 1983)
War Operation Plan Response simulator inspired by the 1983 film.
- **Triggers**: "Shall we play a game?"
- **Features**: Movie-accurate dialogue, Tic-Tac-Toe (minimax AI), Global Thermonuclear War simulation
- **Implementation**: Hybrid WASM (preferred) + TypeScript fallback
- **Files**:
  - `src/composables/useWOPR.ts` - Vue composable
  - `src/games/wopr/` - TypeScript implementation
  - `wasm/wopr_web.c` - C source for WASM
  - `public/games/wopr/` - Compiled WASM + docs
- **Attribution**: Based on [zompiexx/wargames](https://github.com/zompiexx/wargames) by Andy Glenn

### Obfuscation

Easter egg triggers are encoded at build time via `build/obfuscate-plugin.js`. The plugin:
1. XOR-encodes trigger strings using the git commit hash
2. Injects encoded triggers into the bundle
3. Runtime decoding in `useCommands.ts` matches user input

## Data Architecture (Single Source of Truth)

All resume and web configuration data is sourced from `/data/kenzik.yml` in the project root:

- **Development**: Vite serves the file directly from `../data/` via `fs.allow` configuration
- **Production**: The `afterBuild` hook in `quasar.config.js` copies the YAML to `dist/spa/data/`

This ensures the YAML file is never duplicated and changes propagate automatically.

## Project Structure

```
web/
├── src/
│   ├── composables/     # Vue composables (useTheme, etc.)
│   ├── pages/           # Vue pages
│   ├── router/          # Vue Router configuration
│   ├── themes/          # Theme JSON files
│   ├── App.vue          # Root component
│   └── main.ts          # Application entry point
├── package.json
├── quasar.config.js     # Quasar configuration
└── tsconfig.json        # TypeScript configuration
```

## Theme System

Themes are stored as JSON files in `src/themes/`. The `useTheme` composable:
- Auto-detects system preference (`prefers-color-scheme`)
- Persists user preference in localStorage
- Applies theme via CSS custom properties

## Development

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn lint` - Run ESLint
- `yarn format` - Format code with Prettier


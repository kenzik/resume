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


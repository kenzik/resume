# FreeDoom Game Files

This directory contains the DOOM easter egg assets using **FreeDoom** - a 100% free, open-source DOOM replacement.

## Required File

### freedoom.jsdos (~11MB)

This is a js-dos bundle containing FreeDoom Phase 1 (compatible with DOOM Episode 1-3).

**To create the bundle:**

```bash
# Download FreeDoom
curl -L -o freedoom.zip "https://github.com/freedoom/freedoom/releases/download/v0.13.0/freedoom-0.13.0.zip"
unzip freedoom.zip

# Download the original DOOM bundle (for DOOM.EXE executable)
curl -L -o doom.jsdos "https://cdn.dos.zone/custom/dos/doom.jsdos"

# Extract, swap WADs, and repack
mkdir freedoom-bundle && cd freedoom-bundle
unzip ../doom.jsdos
rm DOOM.WAD
cp ../freedoom-0.13.0/freedoom1.wad DOOM.WAD
zip -r ../freedoom.jsdos .

# Clean up
cd .. && rm -rf freedoom-bundle freedoom.zip freedoom-0.13.0 doom.jsdos
```

## How It Works

1. User discovers the hidden easter egg trigger
2. CRT transition effect plays
3. js-dos player loads with FreeDoom bundle
4. User clicks Play button (browser audio policy requirement)
5. DOSBox boots and runs DOOM.EXE with FreeDoom assets

## Licensing

| Component | License | Notes |
|-----------|---------|-------|
| **FreeDoom** | BSD | Free for commercial use |
| **js-dos** | MIT | Free for commercial use |
| **DOOM.EXE** | GPL | From original open-sourced DOOM |

## FreeDoom vs Original DOOM

FreeDoom is a complete reimplementation with:
- Original artwork, sounds, and music
- Same gameplay mechanics
- Compatible with DOOM mods
- No copyright concerns

The only difference is the visual assets - gameplay is identical to original DOOM.

## Files

| File | Size | Description |
|------|------|-------------|
| `freedoom.jsdos` | ~11MB | js-dos bundle (FreeDoom + DOOM.EXE) |
| `README.md` | - | This file |

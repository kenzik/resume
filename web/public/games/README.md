# Game Story Files

This directory contains Z-machine story files for the terminal Easter egg.

## Required File

- **zork1.z3** - Zork I story file (~84KB)

## How to Obtain

### Option 1: Compile from Source (Recommended)

Clone and compile from the Infocom-Dungeon repos:

```bash
# Clone both repos (zork-1 depends on zork-common)
git clone git@github.com:Infocom-Dungeon/zork-common.git
git clone git@github.com:Infocom-Dungeon/zork-1.git

# Compile with ZILF (https://zilf.io)
cd zork-1
zilf zork1.zil
zapf zork1.zap

# Copy to this directory
cp zork1.z3 /path/to/web/public/games/
```

### Option 2: IF Archive

Visit the [IF Archive](https://www.ifarchive.org/indexes/if-archive/games/zcode/) and download `zork1.z3`.

## File Placement

Place the story file directly in this directory:

```
web/public/games/
├── README.md
└── zork1.z3    <- Place file here
```

## Verification

The file should be approximately 84KB and identified as a Z-machine file:

```bash
file zork1.z3
# Should output: "Infocom (Z-machine 3, Release X, Serial XXXXXX)"
```

## Legal

Zork I, II, and III source code was released under MIT License by Microsoft (November 2025).


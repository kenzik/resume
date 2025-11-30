# Game Story Files

This directory contains Z-machine story files for the terminal Easter egg.

## Required File

- **zork1.z3** - Zork I story file (~84KB)

## How to Obtain

### Option 1: IF Archive (Official Source)

Visit the [IF Archive](https://www.ifarchive.org/indexes/if-archive/games/zcode/) and download `zork1.z3`.

### Option 2: Microsoft Open Source Release

As of November 2025, Microsoft released Zork I, II, and III under the MIT License.

Check the [Microsoft Zork Repository](https://github.com/microsoft/zork) for the official release.

### Option 3: Build from Source

The original MDL source code is available. You can compile it using the [zilf](https://bitbucket.org/jmcgrew/zilf) or similar Z-machine compiler.

## File Placement

Place the story file directly in this directory:

```
web/public/games/
├── README.md
└── zork1.z3    <- Place file here
```

## Verification

The file should be approximately 84-92KB and identified as a Z-machine file:

```bash
file zork1.z3
# Should output something like: "zork1.z3: Infocom game data (Z-machine 3, Release 88 / Serial 840726)"
```

## Legal

Zork I, II, and III are now MIT licensed courtesy of Microsoft (November 2025).
Ensure you obtain files from a legitimate source.


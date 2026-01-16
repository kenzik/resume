# WOPR - WebAssembly Build Guide

This directory contains the WebAssembly build of the WOPR (War Operation Plan Response) computer simulator from the 1983 film "WarGames".

## Source Attribution

**Original Source**: [zompiexx/wargames](https://github.com/zompiexx/wargames)
**Author**: Andy Glenn
**License**: Attribution required for all use

The original C code simulates the WOPR computer system including:
- User authentication and management
- Email system
- JOSHUA interactive dialogue
- Global Thermonuclear War simulation
- Tic-Tac-Toe game with minimax AI

## Build Prerequisites

### 1. Emscripten SDK

Install the Emscripten SDK (emsdk):

```bash
# Clone emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Install latest version
./emsdk install latest
./emsdk activate latest

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
source ./emsdk_env.sh
```

Verify installation:
```bash
emcc --version
# Should output: emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) X.X.X
```

### 2. Source Code

Clone the wargames repository:

```bash
git clone https://github.com/zompiexx/wargames.git
cd wargames/C/src
```

## Source Files

### Core Files to Compile

| File | Lines | Description |
|------|-------|-------------|
| `wopr.c` | ~2633 | Main WOPR system (login, email, JOSHUA, GTW) |
| `tic-tac-toe.c` | ~450 | Standalone tic-tac-toe with minimax AI |

### Supporting Data Files

| File | Purpose |
|------|---------|
| `WOPR.json` | ChatGPT/ShellGPT prompt configuration (not needed for WASM) |
| `joshua.txt` | Status flag file ("enabled") |

## Browser Compatibility Issues

The original code requires significant modifications for browser execution:

### 1. System Calls (Must Remove/Stub)

```c
// ORIGINAL (Linux-specific)
system("aplay samples/computer-beeps.wav -q &");
system("stty erase ^H");
system("./tic-tac-toe");

// BROWSER: Remove all system() calls
// Audio can be replaced with JavaScript callbacks
// Terminal config not needed in browser
// Sub-programs must be merged or called via JS
```

### 2. Audio Playback (aplay)

The original uses ~100+ `aplay` commands for WAV playback. Options:

**Option A: Remove audio entirely** (simplest)
```c
// Comment out or delete all system("aplay ...") lines
```

**Option B: JavaScript callback bridge**
```c
// In C code:
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
EM_JS(void, play_audio, (const char* filename), {
    // JavaScript implementation
    const name = UTF8ToString(filename);
    // ... Web Audio API or HTML5 Audio
});
#endif
```

### 3. Text-to-Speech (espeak)

The code has espeak calls (mostly commented out). For browser:
- Remove espeak calls, OR
- Bridge to Web Speech API via JavaScript

### 4. File I/O

Original uses file system for:
- `users.txt` - User database
- `mail.txt` - Email storage
- `joshua.txt` - Status flag

**Browser solution**: Use Emscripten's virtual file system or localStorage:

```c
// Emscripten provides MEMFS (in-memory) by default
// For persistence, use IDBFS with IndexedDB

// Or replace with JavaScript localStorage bridge:
EM_JS(void, save_data, (const char* key, const char* value), {
    localStorage.setItem(UTF8ToString(key), UTF8ToString(value));
});
```

### 5. CPU Monitoring (tic-tac-toe.c only)

```c
// ORIGINAL: Reads /proc/stat (Linux-specific)
FILE *fp = fopen("/proc/stat", "r");

// BROWSER: Remove or stub this functionality
// The "CPU overload" dramatic effect won't work in browser
// Option: Simulate with JavaScript performance API
```

### 6. Terminal Control

```c
// ORIGINAL: ANSI escape codes (mostly compatible)
printf("\033[2J");      // Clear screen - WORKS
printf("\033[H");       // Home cursor - WORKS
printf("\033[%d;%dH", row, col);  // Position - WORKS

// ORIGINAL: termios (must remove)
struct termios old, new;  // Not available in browser
tcgetattr() / tcsetattr() // Must stub or remove
```

### 7. Input Handling

```c
// ORIGINAL: Uses scanf, fgets, getchar
// BROWSER: These work but need async handling

// For Emscripten, use:
#include <emscripten.h>

// Async input via JavaScript bridge
EM_ASYNC_JS(char*, get_input, (), {
    // Return input from JavaScript terminal
});
```

## Compilation Strategy

### Option A: Minimal Adaptation (Recommended)

Create a browser-friendly version with minimal changes:

1. **Create `wopr_web.c`** - Modified version with:
   - All `system()` calls removed
   - File I/O replaced with in-memory storage
   - termios code removed
   - JavaScript callbacks for audio (optional)

2. **Compile with Emscripten**:

```bash
emcc wopr_web.c -o wopr.js \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_main", "_send_input"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
    -s ASYNCIFY \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s NO_EXIT_RUNTIME=1 \
    -O2
```

### Option B: Full Integration with JavaScript

For better browser integration, use Emscripten's JavaScript callbacks:

```bash
emcc wopr_web.c -o wopr.js \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_main", "_wopr_init", "_wopr_input", "_wopr_tick"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "UTF8ToString"]' \
    -s ASYNCIFY \
    -s ASYNCIFY_IMPORTS='["emscripten_sleep", "get_user_input"]' \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='createWOPR' \
    -s ENVIRONMENT='web' \
    --pre-js wopr_bridge.js \
    -O2
```

### Option C: Pure JavaScript Rewrite

Given the complexity of adaptation, consider rewriting in TypeScript:
- Preserves original dialogue and game logic
- Native async/await for input handling
- Native Web Audio API support
- No WASM complexity

## Recommended Code Modifications

### wopr_web.c Header

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>
#include <ctype.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

// Remove: ncurses.h, termios.h, sys/socket.h, netinet/in.h
// These are not available in browser environment

#define CHARACTER_DELAY 7500  // Keep for timing effect
#define MAX_TARGETS 4
```

### Replace system() calls

```c
// Create stub function
void play_sound(const char* filename) {
    #ifdef __EMSCRIPTEN__
    EM_ASM({
        if (window.woprPlaySound) {
            window.woprPlaySound(UTF8ToString($0));
        }
    }, filename);
    #endif
    // No-op in browser without JS bridge
}

// Replace all: system("aplay samples/X.wav -q &");
// With: play_sound("X.wav");
```

### Replace file I/O

```c
// In-memory user storage instead of users.txt
static char users_data[4096] = "";
static char mail_data[8192] = "";

// Replace fopen("users.txt", ...) with memory operations
```

### Replace termios

```c
// Remove getPassword() termios manipulation
// In browser, input handling is done by JavaScript
char* getPassword() {
    static char password[50];
    // Browser handles echo suppression in JavaScript
    fgets(password, sizeof(password), stdin);
    return password;
}
```

## Build Instructions

### Step 1: Prepare Source

```bash
# Clone source
git clone https://github.com/zompiexx/wargames.git
cd wargames/C/src

# Create modified version
cp wopr.c wopr_web.c

# Apply browser compatibility patches
# (manual editing required - see modifications above)
```

### Step 2: Compile

```bash
# Ensure emsdk is active
source /path/to/emsdk/emsdk_env.sh

# Compile
emcc wopr_web.c -o wopr.js \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_main"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ASYNCIFY \
    -s ALLOW_MEMORY_GROWTH=1 \
    -O2

# This produces:
# - wopr.js    (~150KB) - JavaScript loader/glue code
# - wopr.wasm  (~50-100KB) - WebAssembly binary
```

### Step 3: Deploy

Copy the compiled files to this directory:

```bash
cp wopr.js wopr.wasm /path/to/web/public/games/wopr/
```

## JavaScript Integration

### Basic Loading

```typescript
// In Vue/TypeScript
async function loadWOPR() {
    const Module = await import('/games/wopr/wopr.js');

    // Initialize with custom print function
    const wopr = await Module.default({
        print: (text: string) => {
            // Display in terminal UI
            appendOutput(text);
        },
        printErr: (text: string) => {
            console.error('[WOPR]', text);
        }
    });

    return wopr;
}
```

### Input/Output Bridge

```typescript
// Send input to WOPR
function sendInput(text: string) {
    // If using ASYNCIFY with stdin
    wopr.ccall('send_input', null, ['string'], [text]);
}

// Or for custom input function
window.woprGetInput = (): Promise<string> => {
    return new Promise(resolve => {
        // Wait for user input from terminal UI
        onUserInput = resolve;
    });
};
```

## Audio Files (Optional)

If implementing audio, these files from the original `samples/` directory are used:

### Critical Audio
- `greetings.wav` - "Greetings, Professor Falken"
- `play-a-game.wav` - "Shall we play a game?"
- `strange-game-the-only-winning-move-is-not-to-play.wav`
- `computer-beeps.wav` - General computer sounds

### Game Audio
- `learn.wav` - Tic-tac-toe learning
- `caught-in-a-loop.wav` - System overload
- `short-circuit-sound.wav` - Shutdown effect

## Files

| File | Size | Description |
|------|------|-------------|
| `wopr.js` | ~150KB | Emscripten JavaScript loader |
| `wopr.wasm` | ~50-100KB | WebAssembly binary |
| `README.md` | - | This file |

## Updating

To rebuild after source changes:

```bash
# In wargames/C/src directory
emcc wopr_web.c -o wopr.js [flags...]

# Copy to deployment
cp wopr.js wopr.wasm /path/to/web/public/games/wopr/
```

## Alternative: TypeScript Implementation

Given the significant adaptation required, a pure TypeScript implementation may be more practical:

1. **Preserve core logic**: Dialogue trees, game rules, state machine
2. **Native browser support**: No WASM loading complexity
3. **Easier maintenance**: Familiar web technologies
4. **Better async handling**: Native Promise/async support

The original C code can serve as a reference for:
- Dialogue text and timing
- Game logic (especially minimax AI for tic-tac-toe)
- State transitions and menu structure
- "Typewriter" character timing effect

## References

- [Emscripten Documentation](https://emscripten.org/docs/)
- [Original WarGames Repository](https://github.com/zompiexx/wargames)
- [WarGames (1983) - IMDB](https://www.imdb.com/title/tt0086567/)

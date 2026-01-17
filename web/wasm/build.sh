#!/bin/bash
# WOPR WASM Build Script
#
# Requires Emscripten SDK to be installed and activated
# Install: git clone https://github.com/emscripten-core/emsdk.git
# Activate: ./emsdk install latest && ./emsdk activate latest
# Source: source emsdk_env.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../public/games/wopr"

echo "Building WOPR WASM..."
echo "Output directory: $OUTPUT_DIR"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Compile with Emscripten
emcc "$SCRIPT_DIR/wopr_web.c" -o "$OUTPUT_DIR/wopr.js" \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_wopr_init", "_wopr_input", "_wopr_get_state", "_wopr_get_output", "_wopr_has_ended", "_malloc", "_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "UTF8ToString", "stringToUTF8", "allocateUTF8"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='createWOPR' \
    -s ENVIRONMENT='web' \
    -s NO_EXIT_RUNTIME=1 \
    -O2

echo ""
echo "Build complete!"
echo "Files created:"
ls -la "$OUTPUT_DIR/wopr.js" "$OUTPUT_DIR/wopr.wasm" 2>/dev/null || echo "  (files not found)"
echo ""
echo "To test locally:"
echo "  cd $SCRIPT_DIR/.."
echo "  yarn dev"
echo "  # Then type 'joshua' in the terminal"

#!/bin/bash
# Copy Monaco Editor files for JSON-only support
# This script copies only the minimal files needed for JSON editing,
# reducing the bundle from ~16MB to ~4.8MB

set -e

SRC="node_modules/monaco-editor/min/vs"
DEST="public/monaco-editor/min/vs"

# Clean and create directory structure
rm -rf public/monaco-editor
mkdir -p "$DEST/assets" "$DEST/editor" "$DEST/language/json" "$DEST/basic-languages"

# Core files (using wildcards for hashed filenames)
cp "$SRC"/loader.js "$DEST/"
cp "$SRC"/nls.messages-loader.js "$DEST/"
cp "$SRC"/nls.messages.js.js "$DEST/"
cp "$SRC"/_commonjsHelpers-*.js "$DEST/"
cp "$SRC"/editor.api-*.js "$DEST/"
cp "$SRC"/workers-*.js "$DEST/"
cp "$SRC"/monaco.contribution-*.js "$DEST/"

# JSON-specific files
cp "$SRC"/jsonMode-*.js "$DEST/"
cp "$SRC"/lspLanguageFeatures-*.js "$DEST/"

# Workers (editor + json only)
cp "$SRC"/assets/editor.worker-*.js "$DEST/assets/"
cp "$SRC"/assets/json.worker-*.js "$DEST/assets/"

# Editor core
cp "$SRC"/editor/* "$DEST/editor/"

# JSON language support
cp "$SRC"/language/json/* "$DEST/language/json/"

# Basic languages contribution
cp "$SRC"/basic-languages/monaco.contribution.js "$DEST/basic-languages/"

echo "Monaco Editor files copied successfully (JSON-only support)"

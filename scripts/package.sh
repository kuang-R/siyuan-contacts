#!/bin/bash
set -e

# Build and package for SiYuan bazaar submission
# Output: dist/package.zip

cd "$(dirname "$0")/.."

echo "=== Building plugin ==="
npm run build

echo "=== Packaging for bazaar ==="
PKG_DIR="dist/package"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"

# Plugin entry
cp dist/index.js "$PKG_DIR/"

# Metadata & assets
cp plugin.json "$PKG_DIR/"
cp icon.png "$PKG_DIR/"
cp preview.png "$PKG_DIR/"
cp README.md "$PKG_DIR/"
cp README_zh_CN.md "$PKG_DIR/"

# i18n
cp -r i18n "$PKG_DIR/"

# Package
rm -f dist/package.zip
cd "$PKG_DIR"
zip -r ../package.zip .

echo "=== Done: dist/package.zip ==="
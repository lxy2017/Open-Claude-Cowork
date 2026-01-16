#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "🔨 Building Claude-Cowork DMG for Mac (Silicon)..."

# Detect package manager
if command -v bun &> /dev/null; then
    PKG_MANAGER="bun"
    INSTALL_CMD="bun install"
    BUILD_CMD="bun run dist:mac"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
    INSTALL_CMD="npm install"
    BUILD_CMD="npm run dist:mac"
else
    echo "❌ No package manager found. Please install npm or bun."
    exit 1
fi

echo "📦 Using package manager: $PKG_MANAGER"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    $INSTALL_CMD
fi

# Clean up previous builds
echo "🧹 Cleaning up previous builds..."
rm -rf dist
rm -rf dist-electron
rm -rf dist-react
rm -rf release

# Build the application
echo "🚀 Starting compilation and packaging..."
$BUILD_CMD

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📂 You can find your DMG in the 'release' folder."
    # Open the release folder in Finder
    open release
else
    echo "❌ Build failed. Please check the logs above."
    exit 1
fi

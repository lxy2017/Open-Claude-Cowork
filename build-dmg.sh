#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "🔨 Building Claude-Cowork DMG for Mac (Silicon)..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean up previous builds
echo "🧹 Cleaning up previous builds..."
rm -rf dist
rm -rf dist-electron
rm -rf dist-react
rm -rf release

# Build the application
echo "🚀 Starting compilation and packaging..."
npm run dist:mac

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📂 You can find your DMG in the 'release' folder."
    # Open the release folder in Finder
    open release
else
    echo "❌ Build failed. Please check the logs above."
    exit 1
fi

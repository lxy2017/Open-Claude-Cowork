#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "🚀 Starting Claude-Cowork..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (first time)..."
    npm install
fi

# Kill any existing processes (safety measure)
echo "🧹 Cleaning up old processes..."
pkill -f vite 2>/dev/null
pkill -f electron 2>/dev/null

# Start the development server
echo "Starting development environment..."
npm run dev

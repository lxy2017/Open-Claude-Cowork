#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "🚀 Starting Claude-Cowork..."

# Detect package manager
if command -v bun &> /dev/null; then
    PKG_MANAGER="bun"
    INSTALL_CMD="bun install"
    DEV_CMD="bun run dev"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
    INSTALL_CMD="npm install"
    DEV_CMD="npm run dev"
else
    echo "❌ No package manager found. Please install npm or bun."
    exit 1
fi

echo "📦 Using package manager: $PKG_MANAGER"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (first time)..."
    $INSTALL_CMD
fi

# Get Vite dev port from vite.config.ts or default to 5173
DEV_PORT=${VITE_DEV_PORT:-5173}

# Clean up only our own processes (by port, not by name)
# This avoids killing other users' vite/electron processes
cleanup_processes() {
    echo "🧹 Cleaning up old processes on port $DEV_PORT..."
    if command -v lsof &> /dev/null; then
        lsof -ti:$DEV_PORT | xargs kill 2>/dev/null || true
    fi
}

cleanup_processes

# Start the development server
echo "Starting development environment..."
$DEV_CMD

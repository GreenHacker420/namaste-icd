#!/bin/bash

# Quick start script for development server
# Automatically uses Node.js 22 via nvm

echo "🚀 Starting NAMASTE-ICD API Development Server"
echo "=============================================="
echo ""

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node.js 22
echo "📦 Using Node.js 22..."
nvm use 22

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  WARNING: .env file not found!"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo ""
    echo "❌ Please edit .env and add your API keys before starting the server"
    echo "   Required: GOOGLE_API_KEY, DATABASE_URL"
    echo ""
    echo "Run this script again after updating .env"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🔥 Starting development server..."
echo ""

# Start the dev server
npm run dev

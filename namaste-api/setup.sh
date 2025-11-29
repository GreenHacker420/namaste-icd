#!/bin/bash

# NAMASTE-ICD API Setup Script
# This script sets up the development environment

set -e

echo "🚀 NAMASTE-ICD API Setup"
echo "========================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your API keys:"
    echo "   - DATABASE_URL (PostgreSQL connection string)"
    echo "   - GOOGLE_API_KEY (Gemini API key)"
    echo "   - WHO_ICD_CLIENT_ID and WHO_ICD_CLIENT_SECRET (optional)"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js version $NODE_VERSION detected"
    echo "   This project requires Node.js 22+"
    echo ""
    echo "📦 Installing Node.js 22 via nvm..."
    
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install and use Node.js 22
    nvm install 22
    nvm use 22
    
    echo "✅ Node.js 22 installed and activated"
else
    echo "✅ Node.js version $(node -v) is compatible"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env file with your API keys"
echo "   2. Setup database: npm run db:generate && npm run db:migrate"
echo "   3. Import data: npm run import:namaste"
echo "   4. Start server: npm run dev"
echo ""
echo "📚 For detailed instructions, see QUICKSTART.md"

#!/bin/bash
# Build script pour production

set -e

echo "🔨 Building JFSI for production..."

# Installer les dépendances
echo "📦 Installing dependencies..."
npm ci --only=production

# Initialiser la base de données (optionnel, sera créée au démarrage)
if [ ! -f "data/jfsi.db" ]; then
  echo "🗄️ Initializing database..."
  node seed.js --prod
fi

echo "✅ Build complete!"

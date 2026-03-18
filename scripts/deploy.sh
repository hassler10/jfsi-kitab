#!/bin/bash
# Script de déploiement sur Render.com

set -e

echo "🚀 Deploying JFSI to Render..."

# Vérifier les variables d'environnement requises
REQUIRED_VARS=("STRIPE_SECRET_KEY" "STRIPE_PUBLISHABLE_KEY" "PREMIUM_PRICE_ID")

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    echo "   Set it in Render dashboard: Settings > Environment"
    exit 1
  fi
done

# Git push (déclenche le déploiement Render automatiquement)
echo "📤 Pushing to repository..."
git push origin main

echo "✅ Deployment initiated! Check Render dashboard for progress."
echo "   Dashboard: https://dashboard.render.com"

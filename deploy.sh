#!/bin/bash

# Speak-Translator Deployment Script
# Usage: ./deploy.sh [pwa|electron|all]

set -e

DEPLOY_TYPE=${1:-all}
PROJECT_NAME="Speak-Translator"
VERSION="0.1.0"

echo "🚀 Deploying $PROJECT_NAME v$VERSION"
echo "Deployment type: $DEPLOY_TYPE"

# Function to deploy PWA
deploy_pwa() {
    echo "📱 Building PWA..."
    npm run build
    
    echo "🌐 Deploying to Vercel..."
    if command -v vercel &> /dev/null; then
        vercel --prod
    else
        echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
        exit 1
    fi
    
    echo "✅ PWA deployed successfully!"
    echo "📋 PWA Features:"
    echo "   - Service Worker: /public/sw.js"
    echo "   - Manifest: /public/manifest.json"
    echo "   - Icons: SVG format"
    echo "   - Offline support: Enabled"
}

# Function to build Electron
build_electron() {
    echo "🖥️  Building Electron app..."
    npm run electron:build
    
    echo "📦 Distribution files created:"
    echo "   - Installer: dist/$PROJECT_NAME Setup $VERSION.exe"
    echo "   - Portable: dist/win-unpacked/"
    
    echo "✅ Electron build completed!"
}

# Function to deploy both
deploy_all() {
    echo "🔄 Deploying both PWA and Electron..."
    deploy_pwa
    build_electron
    
    echo ""
    echo "📊 Deployment Summary:"
    echo "PWA: Ready for Vercel deployment"
    echo "Desktop: Ready for distribution"
    echo ""
    echo "🌐 PWA URL: https://your-app.vercel.app"
    echo "🖥️  Desktop: Distribute installer file"
    echo ""
    echo "🔧 Data Isolation:"
    echo "   - IndexedDB: speak-translator-db"
    echo "   - localStorage: speak-translator-storage"
    echo "   - Complete separation from original app"
}

# Main execution
case $DEPLOY_TYPE in
    pwa)
        deploy_pwa
        ;;
    electron)
        build_electron
        ;;
    all)
        deploy_all
        ;;
    *)
        echo "❌ Invalid deployment type: $DEPLOY_TYPE"
        echo "Usage: $0 [pwa|electron|all]"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment completed!"
echo "📖 For detailed instructions, see DEPLOYMENT.md"

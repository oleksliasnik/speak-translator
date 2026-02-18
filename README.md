# Speak-Translator

Real-time AI translation and conversation application with PWA and Electron support.

## Features

- 🌐 **PWA Support** - Installable web application
- 🖥️ **Desktop App** - Native Electron application
- 🔄 **Real-time Translation** - Live AI-powered translation
- 💾 **Data Isolation** - Separate from original "speak" app
- 🎯 **Multiple Languages** - Support for 9 interface languages
- 📱 **Responsive Design** - Works on all devices

## Quick Start

### PWA (Web Version)
1. Visit deployed URL
2. Click "Install" in browser
3. Use as native app

### Desktop App
1. Download `Speak-Translator Setup 0.1.0.exe`
2. Run installer
3. Launch from desktop/start menu

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Build Electron app
npm run electron:build

# Deploy
./deploy.sh all
```

## Deployment

### PWA Deployment
```bash
# Deploy to Vercel
npm run build
vercel --prod
```

### Desktop Distribution
- Installer: `dist/Speak-Translator Setup 0.1.0.exe`
- Portable: `dist/win-unpacked/`

## Data Isolation

✅ **Complete separation from original app:**
- **IndexedDB**: `speak-translator-db`
- **localStorage**: `speak-translator-storage`
- **No conflicts** with original "speak" application

## PWA Features

- Service Worker for offline support
- App manifest for installability
- Push notifications
- Background sync
- Responsive design

## Desktop Features

- Frameless window
- Always on top option
- Global shortcuts
- Click-through mode
- System audio capture

## Configuration

### Environment Variables
- `NEXT_PUBLIC_GEMINI_API_KEY` - Optional default API key

### Build Configuration
- **App ID**: `com.speak-translator.app`
- **Product Name**: `Speak-Translator`
- **PWA Name**: `Speak-Translator`

## Deployment Scripts

```bash
# Deploy PWA only
./deploy.sh pwa

# Build desktop only
./deploy.sh electron

# Deploy both
./deploy.sh all
```

## Troubleshooting

### PWA Issues
- Clear browser cache
- Check HTTPS certificate
- Verify manifest.json

### Desktop Issues
- Check Windows Defender
- Verify audio permissions
- Test screen resolution

## Architecture

```
Speak-Translator/
├── src/
│   ├── app/                 # Next.js app router
│   ├── shared/              # Shared utilities
│   └── components/           # React components
├── public/                  # Static assets
│   ├── manifest.json         # PWA manifest
│   ├── sw.js               # Service worker
│   └── icon-*.svg          # PWA icons
├── electron/                # Electron main process
└── dist/                   # Build output
```

## License

Private project - All rights reserved.

## Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md).

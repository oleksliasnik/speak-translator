# Speak-Translator Deployment Guide

## Overview

Speak-Translator is a hybrid application that can be deployed as:
1. **PWA (Progressive Web App)** - Web version for browsers and mobile devices
2. **Electron Desktop App** - Native desktop application

## PWA Deployment (Vercel)

### Prerequisites
- Node.js 18+ 
- Vercel account

### Steps

1. **Build for Production**
```bash
npm run build
```

2. **Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

3. **PWA Features**
- Automatic service worker registration
- Offline functionality
- Installable on mobile devices
- App-like experience in browser

### Environment Variables
Set these in Vercel dashboard:
- `NEXT_PUBLIC_GEMINI_API_KEY` (optional, for users without own key)

## Electron Desktop Distribution

### Building
```bash
npm run electron:build
```

### Distribution Files
- `dist/Speak-Translator Setup 0.1.0.exe` - Windows installer
- `dist/win-unpacked/` - Portable version

### Distribution Channels

#### Option 1: Direct Distribution
- Upload installer to website/GitHub Releases
- Users download and install directly

#### Option 2: Microsoft Store (Future)
- Package for Microsoft Store
- Automatic updates and wider reach

#### Option 3: Auto-updater
- Implement electron-updater
- Automatic background updates

## Data Isolation

✅ **Complete separation from original "speak" app:**
- IndexedDB: `speak-translator-db` (vs `gemini-live-db`)
- localStorage: `speak-translator-storage` (vs `gemini-live-storage`)
- No data conflicts between applications

## Features

### PWA Features
- [x] Responsive design
- [x] Service worker for offline support
- [x] App manifest for installability
- [x] Push notifications support
- [x] Background sync

### Desktop Features
- [x] Frameless window
- [x] Always on top option
- [x] Global shortcuts
- [x] Click-through mode
- [x] System audio capture

## Security Considerations

### PWA
- Content Security Policy headers
- HTTPS only (required for service workers)
- Safe API key handling

### Desktop
- Code signing for Windows
- Sandboxed execution
- Secure IPC communication

## Performance Optimization

### Web
- Next.js automatic optimization
- Static generation
- Code splitting
- Image optimization

### Desktop
- Minimal bundle size
- Lazy loading
- Efficient memory usage

## Troubleshooting

### PWA Issues
- Clear browser cache if service worker doesn't update
- Check HTTPS certificate (required for PWA)
- Verify manifest.json is accessible

### Desktop Issues
- Check Windows defender blocking installer
- Verify audio permissions
- Test on different screen resolutions

## Version Updates

### PWA
- Automatic via service worker updates
- User prompted for new versions

### Desktop
- Manual installer updates (current)
- Plan: Implement electron-updater for auto-updates

## Support

For issues:
1. Check browser console for PWA errors
2. Check Electron logs for desktop issues
3. Verify data isolation (no conflicts with original app)
4. Test both PWA and desktop versions separately

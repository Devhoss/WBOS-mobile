# Development Guide

## Prerequisites

- Node.js >= 22.13
- Expo CLI (`npx expo`)
- Android Studio (for Android emulator) or physical device
- iOS development requires macOS with Xcode

## Setup

```bash
npm install
```

## Environment Configuration

The app supports three environments:

| Environment  | File                  | API URL                       | Use Case              |
|-------------|-----------------------|-------------------------------|-----------------------|
| Development | `.env.development`    | `http://192.168.100.10:3000`  | Local dev server (HTTP) |
| Homelab     | `.env.homelab`        | `https://wbos.home.lab`       | Self-hosted staging   |
| Production  | `.env.production`     | `https://api.wbos.app`        | Production API        |

Copy `.env.example` to the desired file and adjust the API URL for your network.

**Important:** The development environment uses HTTP (cleartext). The Android manifest has `android:usesCleartextTraffic="true"` to permit this.

## Build for Android

Environment variables must be set in the same PowerShell session as the Gradle build:

```powershell
# Development build
$env:EXPO_PUBLIC_APP_ENV="development"; $env:EXPO_PUBLIC_API_URL="http://192.168.100.10:3000"; $env:EXPO_PUBLIC_AUTH_URL="http://192.168.100.10:3000"; cd android && .\gradlew assembleRelease

# Homelab build (integration testing)
$env:EXPO_PUBLIC_APP_ENV="homelab"; $env:EXPO_PUBLIC_API_URL="https://wbos.home.lab"; $env:EXPO_PUBLIC_AUTH_URL="https://wbos.home.lab"; cd android && .\gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`.

## Development Workflow

```bash
# Development against local server
npm start                # Start Expo dev server
npm run android          # Start on connected Android device/emulator
npm run typecheck        # Check TypeScript errors
```

The mobile app connects to the API URL baked into the build. For development via Expo Go, the config is loaded from `.env.development` automatically.

## Network Notes

- **Development:** Use `http://<local-ip>:3000` (LAN, HTTP)
- **Homelab:** Use `https://wbos.home.lab` (requires Pi-hole DNS + working Private DNS config on device — Android's system resolver may not resolve `.home.lab` if Private DNS is enabled; disable Private DNS in Settings → Network & Internet for homelab testing)
- **Production:** Use `https://api.wbos.app` (public DNS, HTTPS)

## Project Conventions

### Feature Modules
Each feature in `src/features/` owns:
- `components/` — UI components
- `hooks/` — React hooks
- `queries.ts` — React Query definitions
- `types.ts` — Feature-specific types
- `index.ts` — Public API

### API Modules
Each domain in `src/api/` owns:
- `index.ts` — API functions (get, list, create, update)
- `types.ts` — Request/response types

### Design System
Components in `src/design-system/components/` are:
- Pure presentational (no business logic)
- Fully typed with TypeScript
- Accessible and touch-friendly (min 44px targets)

## API Contract

All API calls go through WBOS Web at `{API_URL}/api/v1/...`.
The mobile app does not implement its own endpoints.

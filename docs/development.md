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

| Environment  | File                  | Use Case              |
|-------------|-----------------------|-----------------------|
| Development | `.env.development`    | Local dev server      |
| Homelab     | `.env.homelab`        | Self-hosted staging   |
| Production  | `.env.production`     | Production API        |

Copy `.env.example` to the desired file and set the correct API URL.

## Running

```bash
# Start development
npm start

# Start for Android
npm run android

# Start for iOS
npm run ios

# Start for web
npm run web
```

## Type Checking

```bash
npm run typecheck
```

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

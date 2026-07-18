# WBOS Mobile

A mobile execution platform for the WBOS ecosystem.

This is NOT a miniature ERP. It is a focused task-execution application that consumes WBOS Web APIs.

## Project Overview

WBOS Mobile is the mobile companion to [WBOS Web](https://github.com/your-org/wbos-web), a wholesale business operating system.

### How It Relates to WBOS Web

```
                  PostgreSQL
                       ▲
                       │
             Next.js / Prisma API
                       ▲
             Shared Business Logic
              (WBOS Web Backend)
                       ▲
        ┌──────────────┴──────────────┐
        │                             │
   WBOS Web ERP                 WBOS Mobile
      Next.js                 React Native + Expo
```

- **WBOS Web** is the system of record. It owns all business logic, data, and rules.
- **WBOS Mobile** is a pure consumer. It has no database, no business logic, and no authority over data.
- The mobile app executes work assigned by the ERP via REST APIs.

### Architecture

```
app/                          ← Expo Router (file-based routing)
src/
  api/                        ← Domain-organized API clients
  app/                        ← App providers & config
  design-system/              ← Design tokens + reusable components
  features/                   ← Feature modules
  hooks/                      ← Shared hooks
  infrastructure/             ← Cross-cutting concerns
  shared/                     ← Types, constants, utils
  stores/                     ← Zustand stores
```

Key architectural decisions:
- **Feature-first** — each feature owns its components, hooks, queries, and types
- **Domain-organized API** — API modules are grouped by business domain (auth, products, inventory, tasks)
- **Task Engine** — all operational work (picking, delivery, counting) is modeled as generic Tasks
- **No business logic** — the mobile app is a thin execution layer over WBOS Web APIs
- **Offline-ready** — NetInfo, React Query offline-first config, abstract sync queue interfaces

### Philosophy

- **Touch-first** — large targets (min 44px), one-handed operation
- **Scanning-first** — barcode scanning is the primary input method
- **Minimal navigation** — surface today's work immediately, avoid menus
- **Speed over features** — every millisecond matters on the warehouse floor
- **Continuous scanning** — the scanner stays open until the task is complete
- **No confirmation dialogs** — auto-confirm on successful scan, undo on mistake

### Long-Term Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Foundation | ✅ Complete | Expo project, routing, auth, API client, design system, docs |
| 2A — Task Engine | ✅ Complete | Generic task model, today's tasks dashboard, task detail screen |
| 2B — Picking | ✅ Complete | Pick session, pick lines, quantity confirmation |
| 2C — Scanner | 🚧 In Progress | Camera integration, continuous scanning, auto-confirm, undo |
| 3 — Delivery | ⏳ Planned | Delivery confirmation, signatures, photos, GPS |
| 4 — Inventory | ⏳ Planned | Stock lookup, cycle counting, inventory adjustments |
| 5 — Offline & Polish | ⏳ Planned | Sync engine, push notifications, biometrics, production builds |

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [React Native](https://reactnative.dev/) | Cross-platform mobile framework |
| [Expo](https://expo.dev/) (SDK 57) | React Native toolchain and managed workflow |
| [Expo Router](https://docs.expo.dev/router/introduction/) | File-based routing (similar to Next.js App Router) |
| [TypeScript](https://www.typescriptlang.org/) | Type safety throughout |
| [NativeWind](https://www.nativewind.dev/) | Tailwind CSS for React Native |
| [TanStack React Query](https://tanstack.com/query/latest) | Server state management, caching, offline support |
| [Zustand](https://github.com/pmndrs/zustand) | Client-side state management |
| [MMKV](https://github.com/mrousavy/react-native-mmkv) | Fast key-value local storage |
| [Better Auth](https://www.better-auth.com/) | Authentication (same as WBOS Web) |
| [Axios](https://axios-http.com/) | HTTP client with interceptors |
| [Expo Camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/) | Barcode scanning via camera |
| [Expo Audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/) | Audio playback for scanner sounds (success/error beeps) |
| [Expo Secure Store](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/) | Encrypted token storage |
| [Zod](https://zod.dev/) | Schema validation |

---

## Development Setup

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 22.13 | Required by Expo SDK 57 |
| npm | >= 10 | Comes with Node.js |
| Android Studio | Latest | For Android emulator |
| Android SDK | API 36+ | Managed via Android Studio |
| Expo CLI | Latest | Bundled with `npx expo` |

### Step 1: Clone and Install

```bash
git clone <repository-url> wbos-mobile
cd wbos-mobile
npm install
```

### Step 2: Install Android Development Tools

1. Download and install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio → SDK Manager → Install:
   - Android SDK Platform 36
   - Android SDK Build-Tools
   - Intel HAXM (for emulator acceleration)
3. Set environment variables:

```bash
# Add to ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
```

4. Create an AVD (Android Virtual Device) in Android Studio's AVD Manager:
   - Device: Pixel 6 or similar
   - API Level: 36
   - RAM: at least 2GB

### Step 3: Environment Configuration

The app supports three environments. Copy the appropriate file:

```bash
# For local development (default)
cp .env.example .env.development

# Edit .env.development
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
EXPO_PUBLIC_AUTH_URL=http://10.0.2.2:3000
EXPO_PUBLIC_APP_ENV=development
```

**Note:** `10.0.2.2` is the Android emulator's alias for the host machine's localhost.
Use `localhost` for iOS simulator or physical device with same network.

### Step 4: Run the WBOS Web Backend

WBOS Mobile requires the WBOS Web backend to be running:

```bash
# Clone and start WBOS Web in another terminal
git clone <wbos-web-repo> wbos-web
cd wbos-web
npm install
npm run dev
```

The backend runs on `http://localhost:3000` by default.

### Step 5: Start the Mobile App

```bash
# Start Expo development
npx expo start

# Press 'a' to open Android emulator
# Press 'i' to open iOS simulator (macOS only)
# Press 'w' to open web version
```

Or use the npm scripts:

```bash
npm start       # Start Expo dev server
npm run android # Start + open Android
npm run ios     # Start + open iOS (macOS only)
npm run web     # Start + open web
```

### Running on a Physical Android Device

1. Install Expo Go from the Google Play Store
2. Connect your device to the same network as your computer
3. Scan the QR code shown by `npx expo start`

For better performance (and camera access), use a Development Build instead:

```bash
npx expo run:android
```

### Homelab Configuration

For testing against a self-hosted backend:

```bash
# .env.homelab
EXPO_PUBLIC_API_URL=http://homelab.local:3000
EXPO_PUBLIC_AUTH_URL=http://homelab.local:3000
EXPO_PUBLIC_APP_ENV=homelab
```

### API URLs

All API requests go through a single Axios instance. The base URL is determined by the active environment config. All endpoints use the `/api/v1/` prefix automatically.

---

## Folder Structure

```
wbos-mobile/
├── app/                              # Expo Router pages
│   ├── _layout.tsx                   # Root layout (providers, fonts, splash)
│   ├── index.tsx                     # Auth check + redirect
│   ├── +not-found.tsx                # 404 screen
│   ├── (auth)/                       # Unauthenticated screens
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── verify.tsx
│   └── (app)/                        # Authenticated screens
│       ├── _layout.tsx               # Auth guard
│       ├── (home)/index.tsx          # Today's Tasks dashboard
│       ├── (scanner)/index.tsx       # Standalone scanner (future)
│       ├── tasks/[id].tsx            # Task detail
│       ├── picking/[id].tsx          # Picking workflow with scanner
│       ├── stock/lookup.tsx          # Stock lookup
│       └── settings/index.tsx        # App settings + sign out
│
├── src/
│   ├── api/                          # Domain-organized API clients
│   │   ├── auth/                     # Sign in, refresh, me
│   │   ├── inventory/                # Stock levels, cycle counts
│   │   ├── picking/                  # Pick sessions, line confirmation
│   │   ├── products/                 # Barcode lookup, search
│   │   ├── scanner/                  # Barcode resolution
│   │   ├── shipments/               # Delivery management
│   │   ├── tasks/                    # Task CRUD, status updates
│   │   └── warehouses/              # Today's work summary
│   │
│   ├── app/                          # App-level configuration
│   │   ├── globals.css               # Tailwind base styles + CSS variables
│   │   ├── providers.tsx             # Provider tree (QueryClient, Network)
│   │   └── query-client.ts           # React Query configuration
│   │
│   ├── design-system/               # Reusable design system
│   │   ├── tokens.ts                # Colors, spacing, typography, radii
│   │   ├── index.ts                 # Public API
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Card, Input, Text, Badge, Skeleton
│   │   │   ├── forms/               # FormField, QuantityInput
│   │   │   ├── feedback/            # Toast, Alert, ConfirmDialog, ErrorBoundary, EmptyState
│   │   │   └── layout/              # SafeArea, Header, PageShell, FullScreenLoading
│   │   └── hooks/                   # useToast, useConfirm
│   │
│   ├── features/                    # Feature modules
│   │   ├── dashboard/              # GreetingHeader, QuickActionButton
│   │   ├── scanner/                 # useScanner state machine, ScanView, BarcodeResult
│   │   ├── tasks/                   # TaskList, TaskCard, TaskStatusBadge, useTodayTasks
│   │   ├── picking/                 # PickLineItem, PickProgressBar, usePickSession
│   │   ├── stock/                   # StockItem, useStockLookup
│   │   ├── delivery/               # Types only (Phase 3)
│   │   └── settings/               # SettingsRow, useSettings, store
│   │
│   ├── hooks/                       # Shared hooks
│   │   └── use-mount.ts
│   │
│   ├── infrastructure/              # Cross-cutting concerns
│   │   ├── api/                    # Axios client, config, types
│   │   ├── auth/                   # Better Auth client, store, token storage
│   │   ├── storage/                # MMKV, SecureStore wrappers
│   │   └── network/                # NetInfo detector, useNetwork hook
│   │
│   ├── shared/                      # Shared utilities and types
│   │   ├── types/                  # API, platform, offline types
│   │   ├── constants/              # Env, config, theme constants
│   │   └── utils/                  # Format, validation, platform, haptics, sound
│   │
│   └── stores/                      # Zustand stores
│       ├── app-store.ts            # Global app state (ready, online)
│       └── offline-store.ts        # Sync queue (future)
│
├── docs/                            # Living documentation
│   ├── vision.md
│   ├── architecture.md
│   ├── development.md
│   ├── api-contract.md
│   ├── roadmap.md
│   ├── workflow.md
│   ├── barcode-strategy.md
│   ├── roles.md
│   └── dashboard-vision.md
│
├── assets/                          # Static assets (icons, images, sounds)
├── .env.development                 # Development environment vars
├── .env.homelab                     # Homelab environment vars
├── .env.production                  # Production environment vars
├── app.json                         # Expo configuration
├── tailwind.config.ts              # Tailwind theme
├── tsconfig.json                   # TypeScript config
├── metro.config.js                 # Metro bundler config
└── package.json                    # Dependencies and scripts
```

---

## Development Guidelines

### Components

- One component per file
- Use NativeWind (Tailwind) classes for styling — no `StyleSheet.create`
- Export as named functions (no `export default`)
- Touch targets must be at least 44×44px
- Mark warehouse-state components as `"use client"` (not applicable in RN — this is a web convention)

### Hooks

- Prefix with `use` (e.g., `useTodayTasks`, `useScanner`)
- All hooks that query the server use TanStack React Query
- State hooks use Zustand
- One hook file per concern

### API Modules

- Grouped by business domain under `src/api/<domain>/`
- Each module exports typed functions (not classes)
- Use the shared Axios `client` instance from `infrastructure/api/client`
- Use `apiUrl()` from `infrastructure/api/config` for URL construction

### State Management

- **Server state**: React Query (all data from the backend)
- **Client state**: Zustand (UI state, preferences, auth state)
- **Persisted state**: MMKV (settings, cache)
- **Secure state**: Expo Secure Store (tokens)
- Never duplicate server state in Zustand

### Design System

- All UI primitives live in `src/design-system/components/ui/`
- Import from `@/design-system` barrel export
- Components are pure presentational — no business logic
- Use `clsx` for conditional class merging

### Feature Modules

- Each feature owns: `components/`, `hooks/`, `types.ts`, `index.ts`
- Features import from `src/api/` for data, from `@/design-system` for UI
- Features should not import from other features directly (use the API layer)
- Future features (Phase 3+) should create types and interfaces before implementation

### Sounds

- Scanner sounds are managed by `src/shared/utils/sound.ts`
- Success and error sounds play automatically during scanning
- Sound files should be placed in `assets/sounds/`:
  - `assets/sounds/success.mp3`
  - `assets/sounds/error.mp3`
- If sound files are missing, the system degrades silently (haptic feedback only)

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo development server |
| `npm run android` | Start + open Android emulator |
| `npm run ios` | Start + open iOS simulator (macOS) |
| `npm run web` | Start + open web version |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run clean` | Clear Expo cache and restart |

---

## Contributing

1. Ensure `npm run typecheck` passes with zero errors
2. Follow the folder structure and naming conventions
3. Use the design system components for all UI
4. Document new API endpoints in `docs/api-contract.md`
5. Update `docs/workflow.md` when adding new workflows
6. Update this README's roadmap table at the end of each phase

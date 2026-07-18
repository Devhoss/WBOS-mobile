# WBOS Mobile Architecture

## System Context

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

The mobile application has no database and no business logic.
Everything flows through the existing WBOS Web API layer.

## Mobile Architecture Layers

```
┌─────────────────────────────────────────────┐
│                 Expo Router                  │
│            (File-based Routing)              │
├─────────────────────────────────────────────┤
│              Feature Modules                  │
│   dashboard │ scanner │ picking │ stock ...  │
├────────────────┬────────────────────────────┤
│  Design System │    API Domain Modules       │
│  (Components)  │   (auth / products / ...)   │
├────────────────┴────────────────────────────┤
│              Infrastructure                   │
│   API Client │ Auth │ Storage │ Network      │
├─────────────────────────────────────────────┤
│              Shared / Utils                   │
│   Types │ Constants │ Formatters │ Zod       │
└─────────────────────────────────────────────┘
```

## Key Decisions

### Scanner Architecture
- The scanner is a generic barcode reading engine in `src/features/scanner/`
- `useScanner()` is a reusable state machine with states: `idle → scanning → processing → success | error`
- Owns debounce, torch control, and continuous scan lifecycle
- The scanner never interprets barcode content — it only returns raw barcode data
- Business workflows (picking, receiving, counting) determine what a barcode represents
- `ScanView` wraps expo-camera's `CameraView` and accepts status/overlay from the workflow
- Sound feedback uses `expo-audio` (replaces deprecated `expo-av`) with silent haptic fallback

### State Management
- **Server state**: TanStack React Query — all data from the backend
- **Client state**: Zustand — UI state, app preferences
- **Persisted state**: MMKV — fast local key-value storage
- **Secure state**: Expo Secure Store — encrypted tokens

### API Layer
- Single Axios instance with request/response interceptors
- Bearer token injection via interceptor
- Automatic 401 → refresh → retry flow
- Domain-organized API modules under `src/api/`
- API versioning via URL prefix (`/api/v1/`)

### Authentication
- Uses Better Auth (same as WBOS Web)
- Tokens stored in Secure Store
- Auto-refresh on 401 via interceptor
- Auth state managed in Zustand

### Navigation
- Expo Router with file-based routing
- `(auth)` group for unauthenticated screens
- `(app)` group for authenticated screens
- Root layout handles auth-state redirect

### Offline Preparation
- NetInfo provider wraps the app
- React Query networkMode: 'offlineFirst'
- Abstract sync interfaces in `shared/types/offline.ts`
- Placeholder offline store for future queue implementation

## Project Structure

```
app/                          # Expo Router pages (file-based routing)
src/
  api/                        # Domain-organized API clients
  app/                        # App-level providers and config
  design-system/              # Reusable UI components and tokens
  features/                   # Feature modules (each owns hooks, components, queries)
  hooks/                      # Shared hooks
  infrastructure/             # Cross-cutting concerns (api client, auth, storage, network)
  shared/                     # Types, constants, utilities
  stores/                     # Zustand stores
docs/                         # Project documentation
```

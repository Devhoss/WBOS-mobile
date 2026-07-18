# WBOS Mobile Roadmap

## Phase 1 — Foundation (Complete)

Build the mobile platform architecture.

- [x] Project initialization (Expo + TypeScript)
- [x] File-based routing (Expo Router)
- [x] Design system and component library
- [x] API client (Axios with interceptors)
- [x] Authentication (Better Auth integration)
- [x] Secure storage (Expo Secure Store + MMKV)
- [x] State management (Zustand + React Query)
- [x] Network detection
- [x] Environment configuration
- [x] Documentation

## Phase 2A — Task Engine (Complete)

Generic task model and dashboard.

- [x] Task type definitions and API client
- [x] Today's tasks dashboard
- [x] Task detail screen
- [x] Task start/complete mutations
- [x] Pull-to-refresh
- [x] Skeleton loading states
- [x] Empty state when no tasks

## Phase 2B — Picking (Complete)

Pick order execution workflow.

- [x] Pick session API client
- [x] Pick order detail screen
- [x] Pick line list with status
- [x] Progress bar
- [x] Barcode scanning integration
- [x] Start/completion flow
- [x] Undo last scan

## Phase 2C — Scanner (In Progress)

Generic barcode scanning engine.

- [x] Camera integration via expo-camera
- [x] Continuous scan mode
- [x] Auto-confirm successful scans
- [x] Wrong barcode feedback
- [ ] Standalone scanner screen
- [ ] Sound feedback (expo-audio)
- [ ] Hardware trigger support

## Phase 3 — Delivery (Planned)

Delivery execution features.

- [ ] Types and interfaces defined
- [ ] Assigned deliveries list
- [ ] Delivery detail view
- [ ] Delivery confirmation
- [ ] Signature capture
- [ ] Photo attachment
- [ ] GPS timestamp

## Phase 4 — Inventory (Planned)

Stock management features.

- [ ] Types and interfaces defined
- [ ] Stock lookup by barcode
- [ ] Stock lookup by SKU/name
- [ ] Cycle counting flow
- [ ] Inventory adjustments
- [ ] Transfer verification

## Phase 5 — Offline & Polish (Planned)

Production readiness.

- [ ] Offline synchronization engine
- [ ] Queued mutations
- [ ] Background sync
- [ ] Push notifications
- [ ] Biometric authentication
- [ ] Performance optimization
- [ ] Production builds
- [ ] App icon and splash screen
- [ ] Play Store submission

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
- [x] Scheduled tasks section (collapsed by default, shows next task)
- [x] Task detail screen
- [x] Task start/complete mutations
- [x] Pull-to-refresh
- [x] Skeleton loading states
- [x] Empty state when no tasks
- [x] Per-user task assignment with per-user header counts (Picks/Deliveries)
- [x] Scheduled SOs clickable on mobile (was blocked by early return)

## Phase 2B — Picking (Complete)

Pick order execution workflow.

- [x] Pick session API client
- [x] Pick order detail screen
- [x] Pick line list with status
- [x] Progress bar
- [x] Barcode scanning integration
- [x] Start/completion flow
- [x] Undo last scan (creates PickingAction with status UNDONE)
- [x] Bulk pick operations (create PickingAction with status BULK_ACCEPTED)
- [x] Camera torch crash fix (OperationCanceledException on rapid focus)

## Phase 2C — Scanner (Complete)

Generic barcode scanning engine.

- [x] Camera integration via expo-camera
- [x] Continuous scan mode
- [x] Auto-confirm successful scans
- [x] Wrong barcode feedback
- [x] Standalone scanner screen
- [x] Sound feedback (expo-audio)
- [ ] Hardware trigger support

## Phase 3 — Delivery (Deferred)

Delivery execution features — not a priority for current warehouse-only operations. Revisit when delivery drivers are hired.

- [ ] Types and interfaces defined
- [ ] Assigned deliveries list
- [ ] Delivery detail view
- [ ] Delivery confirmation
- [ ] Signature capture
- [ ] Photo attachment
- [ ] GPS timestamp

## Phase 4 — Inventory (Partial)

Stock management features. Stock lookup by barcode/SKU is done; cycle counting and transfers need screens.

- [x] Types and interfaces defined
- [x] Stock lookup by barcode
- [x] Stock lookup by SKU/name
- [x] Warehouse picker for users without assigned warehouse (stock lookup)
- [ ] Cycle counting flow (API exists, no mobile UI)
- [ ] Inventory adjustments (API exists, no mobile UI)
- [ ] Transfer verification (API exists, no mobile UI)

## Phase 5 — Reports (Partial)

Mobile-accessible reports surfaced via REST endpoints consumed by the web dashboard.

- [x] Barcode activity report (individual scan events with user, action, qty, status)
- [x] Shipment status report (individual shipment rows, not aggregated counts)
- [x] Delivery performance report (grouped by month with avg delivery time)
- [ ] Cycle count history report
- [ ] Picking performance report

## Phase 6 — Offline & Polish (Deferred)

Offline support is structurally present (offline store, queue) but not functionally complete. Revisit when network reliability is a problem.

- [ ] Offline synchronization engine
- [ ] Queued mutations
- [ ] Background sync
- [x] Push notifications (FCM + in-app polling fallback)
- [ ] Biometric authentication
- [ ] Performance optimization
- [ ] Production builds
- [ ] App icon and splash screen
- [ ] Play Store submission

# WBOS Mobile Vision

WBOS Mobile is a mobile execution platform for the WBOS ecosystem.

It is NOT a miniature ERP.

The ERP (WBOS Web) manages the business. WBOS Mobile executes operational work.

## Core Philosophy

- The mobile app consumes the ERP's APIs — never duplicates business logic
- The ERP is the single source of truth for all data and rules
- The mobile app optimizes for speed, not information density
- Barcode scanning is the primary interaction method
- Every screen answers: "What does the worker need to do right now?"

## Platform Scope

Today it powers warehouse execution. Tomorrow it may serve:

- **Warehouse** — picking, cycle counting, stock lookup
- **Driver** — delivery confirmation, signatures, photos
- **POS** — point-of-sale at retail locations
- **Manager** — approvals, basic oversight
- **Inventory** — counting, transfers, adjustments

The first screen adapts based on the logged-in user's role.

## Design Principles

1. **Touch-first** — large targets (min 44px), one-handed operation
2. **Scanning-first** — barcode as primary input, typing as last resort
3. **Minimal navigation** — surface today's work immediately, avoid menus
4. **Offline-resilient** — work without connectivity, sync when available
5. **Speed over features** — every millisecond matters on the warehouse floor
6. **Warehouse-grade** — works with gloves, bright screens, high contrast

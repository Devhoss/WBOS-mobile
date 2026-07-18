# Dashboard Vision

The home screen is the most important screen in the application.
It must answer one question immediately:

**"What does the worker need to do right now?"**

## Layout

```
┌──────────────────────────────┐
│  Good Morning, Alex          │
│  Warehouse A                 │
│                              │
│  Today's Tasks               │
│                              │
│  ┌────────────────────────┐  │
│  │ 📦 Pick Order SO-1042  │  │
│  │ Aisle 3 · 5 items      │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 🚚 Delivery INV-203    │  │
│  │ Acme Corp · Downtown    │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 📋 Cycle Count Aisle 4 │  │
│  │ 12 products to count   │  │
│  └────────────────────────┘  │
│                              │
│  ─── Quick Actions ───────  │
│                              │
│  ┌────────────────────────┐  │
│  │ 📷 Scan Barcode        │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 🔍 Stock Lookup        │  │
│  └────────────────────────┘  │
│                              │
│  ─── Recent Activity ──────  │
│                              │
│  ✓ Pick SO-1041 completed   │
│    · 2 minutes ago          │
│                              │
│  ✓ Cycle Aisle 3 completed  │
│    · 15 minutes ago         │
└──────────────────────────────┘
```

## Principles

1. **One tap to work** — every task card is tappable and opens the workflow
2. **Priority first** — urgent/high tasks appear at the top with visual indicators
3. **Context at a glance** — subtitle provides enough info to decide what to do next
4. **Quick actions** — scan barcode and stock lookup are always accessible
5. **Reduced cognitive load** — no menus, no tabs, no icons to interpret
6. **Recent activity** — shows what was just completed for confidence
7. **Offline indicator** — subtle banner when offline, never blocks the UI

## Empty State

When no tasks are assigned:

```
┌──────────────────────────────┐
│  Good Morning, Alex          │
│                              │
│  All caught up! 🎉           │
│                              │
│  No tasks assigned yet.      │
│                              │
│  ─── Quick Actions ───────  │
│                              │
│  📷 Scan Barcode             │
│  🔍 Stock Lookup             │
│  📋 Start Cycle Count        │
└──────────────────────────────┘
```

## Pull to Refresh

The dashboard supports pull-to-refresh.
A refresh also re-fetches the user's current task count.

## Loading State

While tasks load:

```
┌──────────────────────────────┐
│  ┌────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░  │  │
│  │ ░░░░░░░░░░░░           │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░  │  │
│  │ ░░░░░░░░░░░░           │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░  │  │
│  │ ░░░░░░░░░░░░           │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

Shimmer/skeleton loading cards.

## Future Enhancements

| Feature | When | Description |
|---------|------|-------------|
| Task filtering | Phase 5 | Filter by type, priority, warehouse |
| Task search | Phase 5 | Search across all tasks |
| Worker productivity | Phase 6 | Show pick rate, completion stats |
| Team view | Phase 6 | Supervisor sees all team tasks |

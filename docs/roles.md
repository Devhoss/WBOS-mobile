# Mobile Roles

WBOS Mobile is a single application that presents different experiences based on user role.

## Role Definitions

### Warehouse Worker
Primary user. Executes picking, cycle counting, stock lookup.
- Sees: Today's Tasks, Scan Barcode, Stock Lookup
- Can: start/complete tasks, confirm quantities, scan barcodes
- Cannot: create/edit products, customers, suppliers, reports

### Delivery Driver
Executes delivery workflows.
- Sees: Assigned Deliveries, Scan Barcode
- Can: confirm deliveries, capture signatures, take photos, record GPS
- Cannot: pick orders, cycle count, manage inventory

### Warehouse Supervisor
Oversees warehouse operations.
- Sees: All team tasks, task queue, worker performance
- Can: reassign tasks, override picks, approve cycle counts, manage users
- Cannot: alter ERP data (products, customers, suppliers)

### Manager
Operational oversight across the organization.
- Sees: Dashboard with KPIs, all warehouses, all tasks
- Can: view reports, approve adjustments, manage settings
- Cannot: execute warehouse workflows (no picking interface)

### Administrator
Full system access.
- Sees: Everything
- Can: everything within mobile scope, manage roles, configure warehouse settings

## Role-Based Routing

```
app/
  (auth)/          ← All roles
  (app)/
    (worker)/      ← Warehouse Worker, Supervisor
      tasks/
      picking/
      stock/
    (driver)/      ← Delivery Driver
      deliveries/
    (supervisor)/  ← Supervisor, Manager, Admin
      queue/
      workers/
    (admin)/       ← Admin only
      settings/
      warehouses/
```

Each group has its own `_layout.tsx` that checks the user's role.

## Future Role Expansion

| Role | When | Capabilities |
|------|------|-------------|
| POS Cashier | Phase 6+ | Sell products, process payments, print receipts |
| Inventory Auditor | Phase 4+ | Full inventory control, transfer verification |
| Mobile Approver | Phase 5+ | Approve purchase orders, expense reports |
| Cross-Dock Operator | Future | Receive and redistribute in one motion |

## Implementation Principle

The backend (Better Auth) is the source of truth for roles.
The mobile app reads the role from the user profile and adjusts the UI.
No role logic is duplicated in the mobile app.

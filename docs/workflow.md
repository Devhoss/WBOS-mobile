# Warehouse Workflows

This document describes every workflow the mobile app supports.
It serves as the single reference for both the web ERP and the mobile application.

## Sales Order Lifecycle

```
Draft
  ↓
Confirmed
  ↓
Assigned (to warehouse)
  ↓
Picking
  ↓
Picked
  ↓
Loaded
  ↓
Out for Delivery
  ↓
Delivered
  ↓
Completed
```

### Picking Workflow (Mobile)

1. User opens assigned pick order from dashboard
2. App shows: "Pick 5 items from Aisle 3"
3. User scans product barcode
4. App confirms: "Correct — Scanlight 60W (x3)"
5. User confirms quantity (or scans again for multi-scan)
6. App shows: "3 of 5 picked. Next item: Wire 2.5mm (Aisle 1)"
7. Repeat until all lines picked
8. App shows: "All items picked. Confirm?"
9. User confirms → ERP updates order status to Picked

## Purchase Order Receiving

```
Draft
  ↓
Ordered
  ↓
Receiving
  ↓
Received
  ↓
Completed
```

### Receiving Workflow (Mobile)

1. User opens assigned receipt from dashboard
2. Scans purchase order number
3. Scans incoming product barcode
4. Confirms quantity received
5. Notes damages or discrepancies
6. Repeats for each line
7. Confirms receipt complete → ERP updates

## Inventory Transfer

```
Draft
  ↓
Picking
  ↓
In Transit
  ↓
Receiving
  ↓
Completed
```

### Transfer Workflow (Mobile)

1. User opens transfer from dashboard
2. Scans source location barcode
3. Scans product barcode
4. Confirms quantity
5. Scans destination location barcode
6. Confirms transfer → ERP updates

## Cycle Count

```
Created
  ↓
Counting
  ↓
Verified
  ↓
Posted
```

### Cycle Count Workflow (Mobile)

1. User opens assigned cycle count from dashboard
2. App shows: "Count Aisle 3, Bin 04B"
3. User scans location barcode
4. App shows expected products and quantities
5. User scans each product and enters actual quantity
6. App highlights discrepancies
7. User confirms count
8. Supervisor verifies (if needed)
9. ERP posts the count

## Delivery

### Delivery Workflow (Mobile)

1. User opens assigned delivery from dashboard
2. Confirms vehicle loaded
3. Departs → status: Out for Delivery
4. Arrives at destination
5. Captures signature
6. Takes delivery photo
7. Records GPS coordinates and timestamp
8. Confirms delivered → ERP updates

## Stock Lookup

1. User taps "Stock Lookup" on dashboard
2. Scans barcode or types product name
3. App shows: current stock, bin location, reserved, available
4. User can tap to see movement history

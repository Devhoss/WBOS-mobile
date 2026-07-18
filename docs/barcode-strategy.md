# Barcode Strategy

## Philosophy

Barcode scanning is the primary interaction method for WBOS Mobile.
Every workflow should be scannable end-to-end.

The platform must support multiple barcode symbologies and entity types.

## Supported Barcode Types

| Symbology | Common Use |
|-----------|------------|
| EAN-13 | Retail products (global) |
| EAN-8 | Small retail products |
| UPC-A | North American retail |
| Code 128 | Logistics, warehouse labels |
| Code 39 | Industrial, inventory |
| QR Code | Mixed data, URLs, lot info |
| Data Matrix | Small parts, medical |
| PDF417 | Shipping labels, documents |
| ITF-14 | Carton/outer-pack barcodes |
| GS1-128 | Supply chain (serial, lot, date) |

## Entity Barcode Strategy

### Product Barcodes
- Warehouse workers scan product barcodes to identify items
- The backend resolves barcode → product ID via `/api/v1/scanner/resolve/:barcode`
- Products may have multiple barcodes (EAN, UPC, internal SKU)
- The resolution endpoint returns the canonical product
- In future: support GS1 application identifiers (lot, expiry date, serial)

### Location Barcodes
- Each bin/shelf/rack position has a printed location barcode
- Format: `LOC-{WarehouseCode}-{Zone}-{Aisle}-{Rack}-{Shelf}-{Bin}`
- Example: `LOC-WH01-A-03-04-B-12`
- When scanned, the backend returns the location hierarchy
- Location scanning is configurable per warehouse

### Order/Document Barcodes
- Sales orders, pick orders, shipments, purchase orders all have barcodes
- Format: `{DOCTYPE}-{NUMBER}`
- Examples: `SO-1042`, `PO-0051`, `SHIP-003`, `INV-203`
- The scanner endpoint resolves these to the correct entity
- Barcodes may be printed on pick lists, shipping labels, and order documents

### Shipment/Tracking Barcodes
- Carrier tracking numbers are stored as barcodes
- Support for UPS, FedEx, DHL, USPS formats
- Scanned at loading to confirm correct shipment

## Resolution Flow

```
User scans barcode
       ↓
Mobile app sends barcode to /api/v1/scanner/resolve/:barcode
       ↓
Backend checks:
  ├── Product table → returns product
  ├── Location table → returns location
  ├── Order table → returns order/document
  ├── Shipment table → returns shipment
  └── Unknown → returns 404
       ↓
Mobile app receives entity type, ID, display name
       ↓
App routes to the appropriate screen or action
```

## Continuous Scan Mode

For warehouse workflows, the scanner should remain active between scans.
The user should not need to tap "Scan Again" after each scan.

Behavior:
1. User enters a picking workflow
2. Scanner activates and stays active
3. Each successful scan confirms one pick line
4. A brief cooldown (500ms) prevents duplicate scans
5. If no match: flash red, show "Unknown barcode", remain active
6. When last line is picked: show completion, deactivate scanner

## Multi-Scan Workflows

Some workflows require scanning multiple items at once:

- **Pallet receiving**: scan each carton on a pallet
- **Batch picking**: scan multiple orders at once
- **Cycle counting**: scan each product in a location

In these workflows, scanned items accumulate in a batch list.
The user confirms the batch when all items have been scanned.

## Hardware Considerations

- Primary target: Zebra TC-series, Honeywell CK65, other Android handhelds
- These devices have hardware scan triggers (physical buttons)
- Expo Camera API handles both hardware and software triggering
- Hardware scanners typically emulate keyboard input — may need native module
- Fallback: on-screen scan button for devices without hardware triggers

## Error Handling States

| State | Visual | Behavior |
|-------|--------|----------|
| Unknown barcode | Red flash, error text | Stay on scanner, allow retry |
| Wrong product | Orange flash, "Unexpected item" | Prevent progression, log event |
| Duplicate scan | Yellow flash, "Already scanned" | Ignore, advance cooldown |
| Network error | Toast "Offline — scanning offline" | Fall back to local cache |
| Barcode malformed | Red flash, "Invalid barcode" | Ignore, vibrate |

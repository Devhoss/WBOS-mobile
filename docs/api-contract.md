# API Contract

## Principles

1. **The backend owns all business logic** — the mobile app is a pure consumer
2. **No duplicate logic** — if the mobile app needs new behavior, the backend API is extended first
3. **Versioned** — all endpoints under `/api/v1/`
4. **Consistent response format** — all responses follow the same envelope

## Response Envelope

```typescript
interface ApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

## Authentication

### POST /api/v1/auth/sign-in
Sign in with email and password.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "string"
    },
    "session": {
      "token": "string",
      "refreshToken": "string",
      "expiresAt": "string"
    }
  }
}
```

### POST /api/v1/auth/refresh
Refresh an expired token.

**Request:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "data": {
    "token": "string",
    "refreshToken": "string",
    "expiresAt": "string"
  }
}
```

### POST /api/v1/auth/sign-out
Invalidate the current session.

### GET /api/v1/auth/me
Get the current authenticated user.

**Response:**
```json
{
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "organizationId": "string",
    "warehouseId": "string | null"
  }
}
```

## Warehouse Endpoints

### GET /api/v1/warehouse/today
Get today's assigned work summary.

**Response:**
```json
{
  "data": {
    "pickOrderCount": 3,
    "deliveryCount": 2,
    "cycleCountCount": 1,
    "pickOrders": [
      {
        "id": "string",
        "orderNumber": "string",
        "status": "string",
        "priority": "string",
        "lineCount": 5
      }
    ],
    "deliveries": [...],
    "cycleCounts": [...]
  }
}
```

### GET /api/v1/warehouse/pick-orders
List pick orders assigned to the current user.

### GET /api/v1/warehouse/pick-orders/:id
Get a pick order with its lines.

### PATCH /api/v1/warehouse/pick-orders/:id/lines/:lineId
Update a pick line (confirm quantity, status).

### POST /api/v1/warehouse/pick-orders/:id/complete
Mark a pick order as picked.

## Product Endpoints

### GET /api/v1/products/by-barcode/:barcode
Look up a product by its barcode.

### GET /api/v1/products/search?q=searchTerm
Search products by name or SKU.

## Inventory Endpoints

### GET /api/v1/inventory/stock?warehouseId=xyz&productId=xyz
Look up current stock level.

### POST /api/v1/inventory/cycle-counts
Create a cycle count.

### PATCH /api/v1/inventory/cycle-counts/:id
Update a cycle count line.

## Shipment Endpoints

### GET /api/v1/shipments/assigned
List shipments assigned to the current user.

### GET /api/v1/shipments/:id
Get shipment details.

### PATCH /api/v1/shipments/:id/status
Update shipment status.

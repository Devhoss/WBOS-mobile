export interface StockItemDisplay {
  productId: string;
  sku: string;
  name: string;
  barcode: string | null;
  binLocation: string | null;
  quantityOnHand: number;
  quantityAvailable: number;
  unitOfMeasure: string;
}

export interface StockLookupResult {
  product: StockItemDisplay;
  movements: StockMovement[];
}

export interface StockMovement {
  id: string;
  type: "receipt" | "shipment" | "transfer" | "adjustment" | "count";
  quantity: number;
  reference: string;
  createdAt: string;
}

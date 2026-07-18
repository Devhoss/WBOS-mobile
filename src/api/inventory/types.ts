export interface StockLevel {
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  binLocation: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  unitOfMeasure: string;
}

export interface CycleCount {
  id: string;
  countNumber: string;
  status: "created" | "counting" | "verified" | "posted";
  warehouseId: string;
  warehouseName: string;
  assignedTo: string;
  lines: CycleCountLine[];
  createdAt: string;
}

export interface CycleCountLine {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  binLocation: string | null;
  expectedQuantity: number;
  actualQuantity: number | null;
  status: "pending" | "counted" | "verified";
}

export interface InventoryAdjustment {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  adjustmentType: "positive" | "negative";
  quantity: number;
  reason: string;
  createdAt: string;
}

export interface PickLineDetail {
  id: string;
  lineNumber: number;
  productId: string;
  productSku: string;
  productName: string;
  barcode: string | null;
  quantityOrdered: number;
  quantityPicked: number;
  unitOfMeasure: string;
  binLocation: string | null;
  status: "pending" | "picked" | "skipped";
}

export interface PickSession {
  taskId: string;
  orderNumber: string;
  customerName: string;
  warehouseName: string;
  totalLines: number;
  pickedLines: number;
  totalQuantity: number;
  pickedQuantity: number;
  lines: PickLineDetail[];
  status: string;
  updatedAt: string;
  shipmentId: string | null;
  shipmentStatus: string | null;
  shipmentNotes: string | null;
  warehouseNotes: string | null;
  invoiceId: string | null;
}

export interface PickConfirmationRequest {
  lineId: string;
  quantity: number;
}

export interface PickScanActionRequest {
  taskLineId: string;
  barcode: string;
  delta: number;
  clientEventId: string;
  deviceId?: string | null;
  scannedAt?: string;
}

export interface PickConfirmationResponse {
  lineId: string;
  previousQuantity: number;
  newQuantity: number;
  lineStatus: string;
  allLinesCompleted: boolean;
}

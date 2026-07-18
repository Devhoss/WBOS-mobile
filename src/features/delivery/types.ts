export type DeliveryStatus =
  | "assigned"
  | "loading"
  | "loaded"

  | "delivered"
  | "failed";

export interface Delivery {
  id: string;
  deliveryNumber: string;
  status: DeliveryStatus;
  customerName: string;
  customerAddress: string | null;
  customerPhone: string | null;
  warehouseId: string;
  warehouseName: string;
  notes: string | null;
  scheduledDate: string | null;
  lines: DeliveryLine[];
}

export interface DeliveryLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitOfMeasure: string;
}

export interface DeliveryConfirmation {
  signature?: string;
  notes?: string;
  photoUri?: string;
  latitude?: number;
  longitude?: number;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  status: "assigned" | "picking" | "picked" | "loaded" | "delivered" | "completed";
  customerId: string;
  customerName: string;
  customerAddress: string | null;
  customerPhone: string | null;
  warehouseId: string;
  warehouseName: string;
  assignedTo: string | null;
  lines: ShipmentLine[];
  notes: string | null;
  scheduledDate: string | null;
  deliveredAt: string | null;
}

export interface ShipmentLine {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  quantityOrdered: number;
  quantityPicked: number;
  quantityShipped: number;
  unitOfMeasure: string;
}

export interface DeliveryConfirmation {
  signature: string | null;
  notes: string | null;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  deliveredAt: string;
}

export type ScannableEntityType =
  | "product"
  | "location"
  | "pick_order"
  | "shipment"
  | "purchase_order"
  | "transfer"
  | "unknown";

export interface ScanResult {
  barcode: string;
  entityType: ScannableEntityType;
  entityId: string | null;
  displayName: string | null;
  raw: Record<string, unknown>;
}

export interface BarcodeResolution {
  barcode: string;
  type: ScannableEntityType;
  id: string;
  label: string;
}

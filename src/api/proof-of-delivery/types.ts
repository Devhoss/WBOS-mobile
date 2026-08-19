export interface PodDocument {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** 1-based position within this delivery's set. */
  pageNumber: number;
  /** Authenticated URL on the web app; never open it without a token. */
  url: string;
  uploadedAt: string;
  uploadedBy: { id: string; name: string | null } | null;
}

export interface PodDeliverySet {
  shipmentId: string;
  shipmentNumber: string;
  status: string;
  deliveredAt: string | null;
  documents: PodDocument[];
}

export interface PodView {
  salesOrderId: string;
  soNumber: string;
  deliveries: PodDeliverySet[];
  /** Pre-POD single signed invoice, when the order has one. Read-only. */
  legacySignedInvoicePath: string | null;
}

/** A file chosen from the camera or the photo library, not yet uploaded. */
export interface PodPickedFile {
  uri: string;
  name: string;
  type: string;
  /** Where it came from, so the UI can say so. */
  source: "camera" | "library";
}

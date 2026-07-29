export interface DeliveredSalesOrder {
  id: string;
  soNumber: string;
  orderedAt: string;
  signedInvoicePath: string | null;
  customer: { id: string; name: string };
}

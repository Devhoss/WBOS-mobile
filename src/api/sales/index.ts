import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { DeliveredSalesOrder } from "./types";

export async function getDeliveredSalesOrders(): Promise<DeliveredSalesOrder[]> {
  const response = await client.get<{ data: DeliveredSalesOrder[] }>(
    apiUrl("/sales/delivered")
  );
  return response.data.data;
}

/**
 * Uploading, replacing and removing the single signed invoice used to live
 * here. Signed paperwork is several pages, so the phone now attaches proof of
 * delivery through `@/api/proof-of-delivery`, against the delivery rather than
 * the order.
 *
 * These wrappers are gone rather than merely unused: leaving a second way to
 * write a delivery's paperwork is how the two mechanisms drift apart. The
 * server routes remain for the web fallback and for orders that already carry
 * a file, and `signedInvoicePath` is still returned above so the list can show
 * which orders have one.
 */

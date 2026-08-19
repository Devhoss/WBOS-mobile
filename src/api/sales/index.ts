import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { DeliveredSalesOrder } from "./types";

export async function getDeliveredSalesOrders(): Promise<DeliveredSalesOrder[]> {
  const response = await client.get<{ data: DeliveredSalesOrder[] }>(
    apiUrl("/sales/delivered")
  );
  return response.data.data;
}

export async function uploadSignedInvoice(
  salesOrderId: string,
  file: { uri: string; name: string; type: string }
): Promise<{ path: string }> {
  const formData = new FormData();
  formData.append("salesOrderId", salesOrderId);
  formData.append("file", file as unknown as Blob);

  const response = await client.post<{ ok: boolean; path: string }>(
    apiUrl("/sales/signed-invoice"),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return { path: response.data.path };
}

export async function removeSignedInvoice(salesOrderId: string): Promise<void> {
  await client.delete(apiUrl(`/sales/signed-invoice/${salesOrderId}`));
}

/**
 * A short-lived URL for a signed proof of delivery.
 *
 * `Linking.openURL` hands the URL to the system browser, which carries neither
 * the Bearer token nor a session cookie. Building the URL by hand only worked
 * while these documents were served from the web app's public directory with no
 * authentication — which was the bug. Same pattern as invoice PDFs.
 */
export async function getSignedInvoiceDownloadUrl(salesOrderId: string): Promise<string> {
  const response = await client.post<{ url: string; expiresIn: number }>(
    apiUrl(`/sales/signed-invoice/${salesOrderId}/download-token`),
  );
  return response.data.url;
}

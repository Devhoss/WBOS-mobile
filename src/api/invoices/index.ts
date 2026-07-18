import client from "@/infrastructure/api/client";
import { apiConfig, apiUrl } from "@/infrastructure/api/config";

export function getInvoicePdfUrl(invoiceId: string): string {
  const base = apiConfig.baseUrl.replace(/\/+$/, "");
  return `${base}/api/invoices/${invoiceId}/pdf`;
}

export async function getInvoiceDownloadUrl(invoiceId: string): Promise<string> {
  const response = await client.post<{ url: string; expiresIn: number }>(
    apiUrl(`/invoices/${invoiceId}/download-token`),
  );
  return response.data.url;
}

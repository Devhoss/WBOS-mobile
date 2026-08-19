import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { PodDocument, PodPickedFile, PodView } from "./types";

/**
 * Proof of delivery — many signed pages against one delivery.
 *
 * The set belongs to the delivery; the sales order is where the driver finds
 * it. Uploads are one file per request so a page that fails can be re-sent on
 * its own, without re-sending the pages that already landed.
 */

export async function getProofOfDelivery(salesOrderId: string): Promise<PodView> {
  const response = await client.get<{ data: PodView }>(
    apiUrl(`/sales/orders/${salesOrderId}/proof-of-delivery`),
  );
  return response.data.data;
}

export async function uploadPodDocument(
  shipmentId: string,
  file: PodPickedFile,
  options?: { onProgress?: (fraction: number) => void; signal?: AbortSignal },
): Promise<{ document: PodDocument; duplicate: boolean }> {
  const formData = new FormData();
  formData.append("file", file as unknown as Blob);

  const response = await client.post<{ data: PodDocument; duplicate?: boolean }>(
    apiUrl(`/deliveries/${shipmentId}/proof-of-delivery`),
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      signal: options?.signal,
      // React Native uses the XHR adapter, where this reports real bytes sent.
      onUploadProgress: (event) => {
        if (!options?.onProgress) return;
        const total = event.total ?? 0;
        if (total > 0) options.onProgress(Math.min(event.loaded / total, 1));
      },
    },
  );

  return { document: response.data.data, duplicate: Boolean(response.data.duplicate) };
}

export async function removePodDocument(documentId: string): Promise<void> {
  await client.delete(apiUrl(`/proof-of-delivery/${documentId}`));
}

export async function reorderPodDocuments(
  shipmentId: string,
  documentIds: string[],
): Promise<PodDocument[]> {
  const response = await client.patch<{ data: PodDocument[] }>(
    apiUrl(`/deliveries/${shipmentId}/proof-of-delivery`),
    { documentIds },
  );
  return response.data.data;
}

/**
 * A short-lived URL for one page.
 *
 * `Linking.openURL` hands the URL to the system browser, which carries neither
 * the Bearer token nor a session cookie — so ask for a token and open that.
 * Same pattern as invoice PDFs and the pre-POD signed invoice; it is what lets
 * these documents live outside the public directory.
 */
export async function getPodDownloadUrl(documentId: string): Promise<string> {
  const response = await client.post<{ url: string; expiresIn: number }>(
    apiUrl(`/proof-of-delivery/${documentId}/download-token`),
  );
  return response.data.url;
}

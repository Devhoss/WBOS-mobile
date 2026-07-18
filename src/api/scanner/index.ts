import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { ApiResponse } from "@/infrastructure/api/types";
import type { BarcodeResolution } from "./types";

export async function resolveBarcode(
  barcode: string
): Promise<BarcodeResolution | null> {
  try {
    const response = await client.get<ApiResponse<BarcodeResolution>>(
      apiUrl(`/scanner/resolve/${encodeURIComponent(barcode)}`)
    );
    return response.data.data;
  } catch {
    return null;
  }
}

import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { ApiResponse } from "@/infrastructure/api/types";
import type { StockLevel, CycleCount, CycleCountLine } from "./types";

export async function getStockLevel(
  warehouseId: string,
  productId?: string
): Promise<StockLevel[]> {
  const response = await client.get<ApiResponse<StockLevel[]>>(
    apiUrl("/inventory/stock"),
    { params: { warehouseId, productId } }
  );
  return response.data.data;
}

export async function getStockByBarcode(
  barcode: string,
  warehouseId: string
): Promise<StockLevel | null> {
  try {
    const response = await client.get<ApiResponse<StockLevel>>(
      apiUrl(`/inventory/stock/by-barcode/${encodeURIComponent(barcode)}`),
      { params: { warehouseId } }
    );
    return response.data.data;
  } catch {
    return null;
  }
}

export async function getAssignedCycleCounts(): Promise<CycleCount[]> {
  const response = await client.get<ApiResponse<CycleCount[]>>(
    apiUrl("/inventory/cycle-counts/assigned")
  );
  return response.data.data;
}

export async function getCycleCount(id: string): Promise<CycleCount> {
  const response = await client.get<ApiResponse<CycleCount>>(
    apiUrl(`/inventory/cycle-counts/${id}`)
  );
  return response.data.data;
}

export async function updateCycleCountLine(
  countId: string,
  lineId: string,
  data: { actualQuantity: number; status: string }
): Promise<CycleCountLine> {
  const response = await client.patch<ApiResponse<CycleCountLine>>(
    apiUrl(`/inventory/cycle-counts/${countId}/lines/${lineId}`),
    data
  );
  return response.data.data;
}

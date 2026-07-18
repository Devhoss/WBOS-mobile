import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { ApiResponse } from "@/infrastructure/api/types";
import type { Warehouse, TodayWorkSummary } from "./types";

export async function getWarehouses(): Promise<Warehouse[]> {
  const response = await client.get<ApiResponse<Warehouse[]>>(
    apiUrl("/warehouses")
  );
  return response.data.data;
}

export async function getTodayWork(): Promise<TodayWorkSummary> {
  const response = await client.get<ApiResponse<TodayWorkSummary>>(
    apiUrl("/warehouse/today")
  );
  return response.data.data;
}

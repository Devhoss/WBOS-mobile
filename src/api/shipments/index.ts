import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { ApiResponse } from "@/infrastructure/api/types";
import type { Shipment, DeliveryConfirmation } from "./types";

export async function getAssignedShipments(): Promise<Shipment[]> {
  const response = await client.get<ApiResponse<Shipment[]>>(
    apiUrl("/shipments/assigned")
  );
  return response.data.data;
}

export async function getShipment(id: string): Promise<Shipment> {
  const response = await client.get<ApiResponse<Shipment>>(
    apiUrl(`/shipments/${id}`)
  );
  return response.data.data;
}

/**
 * The route answers `{ ok: true }`, not the shipment. This used to be typed as
 * `Promise<Shipment>` returning `response.data.data`, which was `undefined` at
 * runtime while TypeScript reported a `Shipment`.
 */
export async function updateShipmentStatus(id: string, status: string): Promise<void> {
  await client.patch(apiUrl(`/shipments/${id}/status`), { status });
}

export async function deliverShipment(id: string): Promise<void> {
  await client.post(apiUrl(`/shipments/${id}/deliver`));
}

export async function updateWarehouseNotes(
  id: string,
  warehouseNotes: string
): Promise<void> {
  await client.patch(apiUrl(`/shipments/${id}/warehouse-notes`), {
    warehouseNotes,
  });
}

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

export async function updateShipmentStatus(
  id: string,
  status: string
): Promise<Shipment> {
  const response = await client.patch<ApiResponse<Shipment>>(
    apiUrl(`/shipments/${id}/status`),
    { status }
  );
  return response.data.data;
}

export async function confirmDelivery(
  id: string,
  confirmation: DeliveryConfirmation
): Promise<Shipment> {
  const response = await client.post<ApiResponse<Shipment>>(
    apiUrl(`/shipments/${id}/deliver`),
    confirmation
  );
  return response.data.data;
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

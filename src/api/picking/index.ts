import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { PickConfirmationRequest, PickScanActionRequest, PickSession } from "./types";

export async function getPickSession(taskId: string): Promise<PickSession> {
  const response = await client.get<PickingDetailResponse>(
    apiUrl(`/picking/${taskId}`)
  );
  const detail = response.data;
  const session = mapPickingDetailToSession(detail);
  return session;
}

export async function confirmPickLine(
  taskId: string,
  data: PickConfirmationRequest
): Promise<void> {
  await client.patch(
    apiUrl(`/tasks/${taskId}/lines/${data.lineId}`),
    { completedQuantity: data.quantity }
  );
}

export async function submitPickScanAction(
  taskId: string,
  data: PickScanActionRequest,
): Promise<PickSession> {
  const response = await client.post<PickingDetailResponse>(
    apiUrl(`/tasks/${taskId}/pick-actions`),
    data,
  );
  return mapPickingDetailToSession(response.data);
}

interface PickingDetailResponse {
  id: string;
  title: string;
  warehouseName: string;
  status: string;
  updatedAt: string;
  reference: Record<string, unknown> | null;
  shipmentId: string | null;
  shipmentStatus: string | null;
  shipmentNotes: string | null;
  warehouseNotes: string | null;
  invoiceId: string | null;
  totalLines: number;
  pickedLines: number;
  totalQuantity: number;
  pickedQuantity: number;
  lines: Array<{
    id: string;
    completedQuantity: number;
    status: string;
    sortOrder: number;
    productId: string;
    productSku: string;
    productName: string;
    barcode: string | null;
    quantityOrdered: number;
    unitOfMeasure: string;
    binLocation: string | null;
  }>;
}

function mapPickingDetailToSession(detail: PickingDetailResponse): PickSession {
  const ref = (detail.reference ?? {}) as Record<string, unknown>;

  return {
    taskId: detail.id,
    orderNumber: (ref.soNumber as string | undefined) ?? detail.title,
    customerName: (ref.customerName as string | undefined) ?? "",
    warehouseName: detail.warehouseName,
    totalLines: detail.totalLines,
    pickedLines: detail.pickedLines,
    totalQuantity: detail.totalQuantity,
    pickedQuantity: detail.pickedQuantity,
    status: detail.status,
    updatedAt: detail.updatedAt,
    shipmentId: detail.shipmentId,
    shipmentStatus: detail.shipmentStatus,
    shipmentNotes: detail.shipmentNotes ?? null,
    warehouseNotes: detail.warehouseNotes ?? null,
    invoiceId: detail.invoiceId ?? null,
    lines: detail.lines.map((l) => ({
      id: l.id,
      lineNumber: l.sortOrder,
      productId: l.productId,
      productSku: l.productSku,
      productName: l.productName,
      barcode: l.barcode,
      quantityOrdered: l.quantityOrdered,
      quantityPicked: l.completedQuantity,
      unitOfMeasure: l.unitOfMeasure,
      binLocation: l.binLocation,
      status: l.status === "COMPLETED" ? "picked" : l.status === "SKIPPED" ? "skipped" : "pending",
    })),
  };
}

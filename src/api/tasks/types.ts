export type TaskType =
  | "PICK_ORDER"
  | "DELIVERY"
  | "CYCLE_COUNT"
  | "GOODS_RECEIPT"
  | "INVENTORY_TRANSFER";

export type TaskStatus = "SCHEDULED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface TaskSummary {
  id: string;
  taskNumber: string;
  type: TaskType;
  title: string;
  subtitle: string | null;
  priority: TaskPriority;
  warehouseId: string;
  warehouseName: string;
  assignedTo: { id: string; name: string; email: string } | null;
  status: TaskStatus;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  bucket: string | null;
  businessDate: string | null;
}

export interface TaskDetail extends TaskSummary {
  dueAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  updatedAt: string;
  referenceType: string;
  referenceId: string;
  reference: Record<string, unknown> | null;
  lines: TaskLine[];
}

export interface TaskLine {
  id: string;
  completedQuantity: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  notes: string | null;
  sortOrder: number;
  productId: string;
  productSku: string;
  productName: string;
  barcode: string | null;
  quantityOrdered: number;
  unitOfMeasure: string;
  binLocation: string | null;
}

export interface TaskListResponse {
  tasks: TaskSummary[];
  total: number;
}

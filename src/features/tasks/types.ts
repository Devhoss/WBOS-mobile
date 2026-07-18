export type { TaskType, TaskStatus, TaskPriority, TaskSummary, TaskDetail, TaskLine } from "@/api/tasks/types";

export const taskTypeConfig: Record<string, { icon: string; label: string }> = {
  PICK_ORDER: { icon: "📦", label: "Pick Order" },
  DELIVERY: { icon: "🚚", label: "Delivery" },
  CYCLE_COUNT: { icon: "📋", label: "Cycle Count" },
  GOODS_RECEIPT: { icon: "📥", label: "Goods Receipt" },
  INVENTORY_TRANSFER: { icon: "🔄", label: "Inventory Transfer" },
};

export const taskStatusColors: Record<string, string> = {
  SCHEDULED: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  ASSIGNED: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  COMPLETED: "bg-green-500/10 text-green-500 border-green-500/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export const taskPriorityBadges: Record<string, { label: string; bg: string; text: string } | null> = {
  LOW: null,
  NORMAL: null,
  HIGH: { label: "High", bg: "bg-amber-500/15", text: "text-amber-500" },
  URGENT: { label: "Urgent", bg: "bg-destructive/15", text: "text-destructive" },
};

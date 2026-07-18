export interface Warehouse {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  address: string | null;
}

export interface TodayWorkSummary {
  pickOrderCount: number;
  deliveryCount: number;
  cycleCountCount: number;
  pickOrders: PickOrderSummary[];
  deliveries: DeliverySummary[];
  cycleCounts: CycleCountSummary[];
}

export interface PickOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  customerName: string;
  lineCount: number;
  itemsPicked: number;
}

export interface DeliverySummary {
  id: string;
  deliveryNumber: string;
  status: string;
  customerName: string;
  address: string | null;
}

export interface CycleCountSummary {
  id: string;
  countNumber: string;
  status: string;
  location: string | null;
  lineCount: number;
}

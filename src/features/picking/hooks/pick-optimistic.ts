import type { PickSession } from "@/api/picking/types";

function lineStatus(quantity: number, quantityOrdered: number): "pending" | "picked" {
  return quantity >= quantityOrdered && quantityOrdered > 0 ? "picked" : "pending";
}

export function optimisticUpdate(
  old: PickSession | undefined,
  lineId: string,
  quantity: number,
): PickSession | undefined {
  if (!old) return old;
  const lines = old.lines.map((l) =>
    l.id === lineId
      ? { ...l, quantityPicked: quantity, status: lineStatus(quantity, l.quantityOrdered) }
      : l,
  );
  const pickedLines = lines.filter((l) => l.quantityPicked >= l.quantityOrdered).length;
  const pickedQuantity = lines.reduce((s, l) => s + l.quantityPicked, 0);
  return { ...old, lines, pickedLines, pickedQuantity };
}

export function optimisticIncrement(
  old: PickSession | undefined,
  lineId: string,
  delta: number,
): PickSession | undefined {
  if (!old) return old;
  const line = old.lines.find((l) => l.id === lineId);
  if (!line) return old;
  return optimisticUpdate(old, lineId, Math.min(line.quantityPicked + delta, line.quantityOrdered));
}

export function optimisticDecrement(
  old: PickSession | undefined,
  lineId: string,
  delta: number,
): PickSession | undefined {
  if (!old) return old;
  const line = old.lines.find((l) => l.id === lineId);
  if (!line) return old;
  return optimisticUpdate(old, lineId, Math.max(line.quantityPicked - delta, 0));
}

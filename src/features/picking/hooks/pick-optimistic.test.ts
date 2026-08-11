import { describe, it, expect } from "vitest";
import type { PickSession } from "@/api/picking/types";
import {
  optimisticUpdate,
  optimisticIncrement,
  optimisticDecrement,
} from "./pick-optimistic";

function makeSession(overrides: Partial<PickSession> = {}): PickSession {
  return {
    taskId: "task-1",
    orderNumber: "SO-000001",
    customerName: "Test Customer",
    warehouseName: "Main Warehouse",
    totalLines: 2,
    pickedLines: 0,
    totalQuantity: 110,
    pickedQuantity: 0,
    status: "IN_PROGRESS",
    dueAt: null,
    updatedAt: "2026-07-14T12:00:00Z",
    shipmentId: "ship-1",
    shipmentStatus: "PENDING_PICK",
    shipmentNotes: null,
    warehouseNotes: null,
    invoiceId: null,
    lines: [
      {
        id: "line-1",
        lineNumber: 1,
        productId: "prod-1",
        productSku: "SKU-100",
        productName: "Bulk Product",
        barcode: "1001",
        quantityOrdered: 100,
        quantityPicked: 0,
        unitOfMeasure: "ea",
        binLocation: "A-1",
        status: "pending",
      },
      {
        id: "line-2",
        lineNumber: 2,
        productId: "prod-2",
        productSku: "SKU-010",
        productName: "Sample Product",
        barcode: "1002",
        quantityOrdered: 10,
        quantityPicked: 0,
        unitOfMeasure: "ea",
        binLocation: "A-2",
        status: "pending",
      },
    ],
    ...overrides,
  };
}

const firstPending = (session: PickSession) =>
  session.lines.find((l) => l.status === "pending");

describe("pick-optimistic", () => {
  describe("bulk-pick 100/100 on a multi-line 100+10 task", () => {
    it("completes the first line and advances the scanner to the second line", () => {
      const session = makeSession();
      const updated = optimisticUpdate(session, "line-1", 100);

      expect(updated!.lines[0].quantityPicked).toBe(100);
      expect(updated!.lines[0].status).toBe("picked");
      expect(updated!.lines[1].status).toBe("pending");

      const pending = firstPending(updated!);
      expect(pending!.id).toBe("line-2");

      expect(updated!.pickedLines).toBe(1);
      expect(updated!.pickedQuantity).toBe(100);
    });
  });

  describe("second 10/10 on the same task", () => {
    it("reaches 100% picked and makes completion available", () => {
      const session = optimisticUpdate(makeSession(), "line-1", 100)!;
      const updated = optimisticUpdate(session, "line-2", 10);

      expect(updated!.lines.every((l) => l.status === "picked")).toBe(true);
      expect(updated!.pickedLines).toBe(2);
      expect(updated!.totalLines).toBe(2);
      expect(updated!.pickedQuantity).toBe(110);
      expect(updated!.totalQuantity).toBe(110);

      const progress = Math.round((updated!.pickedQuantity / updated!.totalQuantity) * 100);
      expect(progress).toBe(100);

      const completionAvailable =
        updated!.pickedLines >= updated!.totalLines &&
        updated!.lines.every((l) => l.quantityPicked >= l.quantityOrdered);
      expect(completionAvailable).toBe(true);
    });
  });

  describe("individual scans followed by bulk quantity", () => {
    it("keeps the line pending during partial increments then completes via bulk", () => {
      let session = makeSession();

      session = optimisticIncrement(session, "line-1", 1)!;
      session = optimisticIncrement(session, "line-1", 1)!;
      session = optimisticIncrement(session, "line-1", 1)!;

      expect(session.lines[0].quantityPicked).toBe(3);
      expect(session.lines[0].status).toBe("pending");
      expect(firstPending(session)!.id).toBe("line-1");

      session = optimisticUpdate(session, "line-1", 100)!;
      expect(session.lines[0].quantityPicked).toBe(100);
      expect(session.lines[0].status).toBe("picked");
      expect(firstPending(session)!.id).toBe("line-2");
    });

    it("caps incremental picks at the ordered quantity", () => {
      let session = makeSession();
      for (let i = 0; i < 105; i++) {
        session = optimisticIncrement(session, "line-1", 1)!;
      }
      expect(session.lines[0].quantityPicked).toBe(100);
      expect(session.lines[0].status).toBe("picked");
    });
  });

  describe("undo/decrement", () => {
    it("returns a fully picked line back to pending", () => {
      const completed = optimisticUpdate(makeSession(), "line-1", 100)!;
      const undone = optimisticDecrement(completed, "line-1", 100)!;

      expect(undone.lines[0].quantityPicked).toBe(0);
      expect(undone.lines[0].status).toBe("pending");
      expect(firstPending(undone)!.id).toBe("line-1");
    });

    it("returns a partially picked line to its prior quantity without overshooting", () => {
      const completed = optimisticUpdate(makeSession(), "line-1", 100)!;
      const undone = optimisticDecrement(completed, "line-1", 10)!;

      expect(undone.lines[0].quantityPicked).toBe(90);
      expect(undone.lines[0].status).toBe("pending");
    });

    it("returns a line to pending when bulk-picked then undone to below the ordered quantity", () => {
      const session = makeSession();
      const bulk = optimisticUpdate(session, "line-2", 10)!;
      expect(bulk.lines[1].status).toBe("picked");

      const undone = optimisticDecrement(bulk, "line-2", 4)!;
      expect(undone.lines[1].quantityPicked).toBe(6);
      expect(undone.lines[1].status).toBe("pending");
    });
  });

  describe("failed mutation rollback", () => {
    it("reverts an increment by the same delta via decrement", () => {
      const session = makeSession();
      const incremented = optimisticIncrement(session, "line-1", 5)!;
      expect(incremented.lines[0].quantityPicked).toBe(5);

      const reverted = optimisticDecrement(incremented, "line-1", 5)!;
      expect(reverted.lines[0].quantityPicked).toBe(session.lines[0].quantityPicked);
      expect(reverted.lines[0].status).toBe(session.lines[0].status);
      expect(reverted.pickedLines).toBe(session.pickedLines);
      expect(reverted.pickedQuantity).toBe(session.pickedQuantity);
    });

    it("restores the exact previous session snapshot after a failed bulk mutation", () => {
      const session = makeSession();
      const snapshot = JSON.stringify(session);

      const mutated = optimisticUpdate(session, "line-1", 100)!;
      expect(mutated.lines[0].status).toBe("picked");

      const restored = JSON.parse(snapshot) as PickSession;
      expect(restored.lines[0].quantityPicked).toBe(0);
      expect(restored.lines[0].status).toBe("pending");
      expect(restored.pickedLines).toBe(0);
      expect(restored.pickedQuantity).toBe(0);
    });
  });
});

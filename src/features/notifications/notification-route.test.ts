import { describe, expect, it } from "vitest";

import { notificationRoute } from "./notification-route";

/**
 * `SHIPMENT_READY` and `DELIVERY_COMPLETED` were created with
 * `link: shipment.id`, and both the push handler and the in-app list navigated
 * every notification to `/(app)/picking/<link>` — so tapping one asked the API
 * for a pick task whose id was a shipment id, and the worker landed on
 * "Pick Order Not Found".
 */
describe("notification destinations", () => {
  describe("task notifications open the pick order", () => {
    it.each([
      "TASK_ASSIGNED",
      "TASK_SCHEDULED",
      "TASK_AVAILABLE",
      "TASK_COMPLETED",
    ])("%s", (type) => {
      expect(notificationRoute({ type, link: "task-1" })).toBe("/(app)/picking/task-1");
    });
  });

  describe("shipment notifications", () => {
    it("open the pick task the server resolved for them", () => {
      expect(
        notificationRoute({ type: "SHIPMENT_READY", entityType: "task", entityId: "task-9" }),
      ).toBe("/(app)/picking/task-9");
      expect(
        notificationRoute({ type: "DELIVERY_COMPLETED", entityType: "task", entityId: "task-9" }),
      ).toBe("/(app)/picking/task-9");
    });

    it("do not navigate when the server could not resolve a task", () => {
      // Better to leave the worker on the list than to send them to a screen
      // that reads as though their work has been deleted.
      expect(
        notificationRoute({ type: "SHIPMENT_READY", entityType: "none", entityId: "" }),
      ).toBeNull();
      expect(notificationRoute({ type: "DELIVERY_COMPLETED", link: null })).toBeNull();
    });

    it("never treat a shipment id as a task id", () => {
      // The exact shape of the old bug: entityType said shipment, and the
      // client navigated anyway.
      expect(
        notificationRoute({
          type: "SHIPMENT_READY",
          entityType: "shipment",
          entityId: "shipment-1",
        }),
      ).toBeNull();
    });
  });

  describe("anything unrecognised has no destination", () => {
    it("returns null for an unknown type", () => {
      expect(notificationRoute({ type: "SOMETHING_NEW", link: "x" })).toBeNull();
    });

    it("returns null for a missing or blank target", () => {
      expect(notificationRoute({ type: "TASK_ASSIGNED", link: null })).toBeNull();
      expect(notificationRoute({ type: "TASK_ASSIGNED", link: "   " })).toBeNull();
      expect(notificationRoute({})).toBeNull();
    });

    it("trusts an explicit entityType over the type name", () => {
      expect(
        notificationRoute({ type: "TASK_ASSIGNED", entityType: "invoice", entityId: "inv-1" }),
      ).toBeNull();
    });
  });
});

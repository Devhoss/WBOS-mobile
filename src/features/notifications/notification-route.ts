/**
 * Where a notification should take you, if anywhere.
 *
 * Both the push handler and the in-app list navigated unconditionally to
 * `/(app)/picking/<link>` for every notification type. `SHIPMENT_READY` and
 * `DELIVERY_COMPLETED` carried a shipment id in `link`, so tapping one asked
 * the API for a pick task whose id was a shipment id and dead-ended the worker
 * on "Pick Order Not Found".
 *
 * The server now resolves those to their pick task, but the client must still
 * refuse to guess: an unknown type, or a notification with no link, has no
 * destination and must not navigate.
 */
export type NotificationRouteInput = {
  type?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  link?: string | null;
};

const TASK_TYPES = new Set([
  "TASK_ASSIGNED",
  "TASK_SCHEDULED",
  "TASK_AVAILABLE",
  "TASK_COMPLETED",
  "SHIPMENT_READY",
  "DELIVERY_COMPLETED",
]);

export function notificationRoute(input: NotificationRouteInput): string | null {
  const target = (input.link ?? input.entityId ?? "").trim();
  if (!target) return null;

  // A payload that names its own entity type is authoritative.
  if (input.entityType) {
    return input.entityType === "task" ? `/(app)/picking/${target}` : null;
  }

  return input.type && TASK_TYPES.has(input.type) ? `/(app)/picking/${target}` : null;
}

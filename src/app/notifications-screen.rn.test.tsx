import React from "react";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const react = require("react");
    react.useEffect(() => cb(), []);
  },
}));

const mockGetNotifications = jest.fn();
const mockDeleteNotification = jest.fn(async (_id: string) => undefined);
const mockMarkRead = jest.fn(async (_id: string) => undefined);
jest.mock("@/api/notifications", () => ({
  getNotifications: () => mockGetNotifications(),
  markNotificationRead: (id: string) => mockMarkRead(id),
  markAllNotificationsRead: jest.fn(async () => undefined),
  clearReadNotifications: jest.fn(async () => undefined),
  deleteNotification: (id: string) => mockDeleteNotification(id),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import NotificationsScreen from "@/app/(app)/notifications/index";

/**
 * Two defects met on this screen.
 *
 * Every notification navigated to `/(app)/picking/<link>`, whatever its type.
 * `SHIPMENT_READY` and `DELIVERY_COMPLETED` carried a shipment id, so tapping
 * one asked the API for a pick task that could not exist and dead-ended the
 * worker on "Pick Order Not Found".
 *
 * And every list action -- read, delete, clear -- was a bare `await` inside an
 * `onPress` that did not await it, so a failure became an unhandled rejection
 * and the row simply did not change.
 */

function notification(over: Record<string, unknown> = {}) {
  return {
    id: "n1",
    organizationId: "org-1",
    userId: "u1",
    title: "Order Ready",
    body: "Order SO-1 is now ready for picking.",
    type: "TASK_AVAILABLE",
    link: "task-1",
    isRead: false,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

async function renderScreen(notifications: unknown[]) {
  mockGetNotifications.mockResolvedValue({
    notifications,
    unreadCount: notifications.length,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationsScreen />
    </QueryClientProvider>,
  );
}

describe("tapping a notification", () => {
  beforeEach(() => jest.clearAllMocks());

  it("opens the pick order for a task notification", async () => {
    const view = await renderScreen([notification()]);
    fireEvent.press(await view.findByText("Order Ready"));
    await view.findByText("Order Ready");
    expect(mockPush).toHaveBeenCalledWith("/(app)/picking/task-1");
  });

  it("does not navigate for a shipment notification with no resolvable task", async () => {
    const view = await renderScreen([
      notification({ title: "Delivery Ready", type: "SHIPMENT_READY", link: null }),
    ]);
    fireEvent.press(await view.findByText("Delivery Ready"));
    await view.findByText("Delivery Ready");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("marks it read whether or not it navigates", async () => {
    const view = await renderScreen([
      notification({ title: "Delivery Ready", type: "SHIPMENT_READY", link: null }),
    ]);
    fireEvent.press(await view.findByText("Delivery Ready"));
    await view.findByText("Delivery Ready");
    expect(mockMarkRead).toHaveBeenCalledWith("n1");
  });
});

describe("a list action that fails says so", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reports a failed read instead of leaving the row silently unchanged", async () => {
    mockMarkRead.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });
    const view = await renderScreen([notification()]);
    fireEvent.press(await view.findByText("Order Ready"));
    expect(await view.findByText(/Could not mark that as read|server had a problem/i)).toBeTruthy();
  });

  it("still opens the task, because that is what the tap was for", async () => {
    // Marking read is incidental to the tap. Refusing to navigate because the
    // read failed would trap the worker on the list with no way into their
    // work -- worse than the stale unread dot.
    mockMarkRead.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });
    const view = await renderScreen([notification()]);
    fireEvent.press(await view.findByText("Order Ready"));
    await view.findByText(/Could not mark that as read|server had a problem/i);
    expect(mockPush).toHaveBeenCalledWith("/(app)/picking/task-1");
  });
});

describe("edge states", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows an empty state rather than a blank screen", async () => {
    const view = await renderScreen([]);
    expect(await view.findByText("No Notifications")).toBeTruthy();
  });

  it("confirms before deleting, rather than deleting on a long press", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const view = await renderScreen([notification()]);
    fireEvent(await view.findByText("Order Ready"), "longPress");
    expect(alert).toHaveBeenCalled();
    expect(mockDeleteNotification).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});

import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type { NotificationsResponse } from "./types";

export async function getNotifications(): Promise<NotificationsResponse> {
  const response = await client.get<NotificationsResponse>(apiUrl("/notifications"));
  return response.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await client.post(apiUrl(`/notifications/${id}/read`));
}

export async function markAllNotificationsRead(): Promise<void> {
  await client.post(apiUrl("/notifications/read-all"));
}

export async function clearReadNotifications(): Promise<void> {
  await client.post(apiUrl("/notifications/clear-read"));
}

export async function deleteNotification(id: string): Promise<void> {
  await client.delete(apiUrl(`/notifications/${id}`));
}

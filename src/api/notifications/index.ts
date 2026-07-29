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

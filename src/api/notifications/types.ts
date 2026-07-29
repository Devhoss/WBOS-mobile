export type NotificationItem = {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

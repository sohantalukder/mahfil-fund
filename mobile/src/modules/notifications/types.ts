export type NotificationType = 'donation' | 'expense' | 'system' | 'report';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  hasDownloadPdf?: boolean;
};

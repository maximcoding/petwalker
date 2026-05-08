export interface WebNotification {
  id: string;
  userId: string;
  eventType: string;
  title: string;
  body: string;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
}

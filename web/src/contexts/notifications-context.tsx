'use client';

import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { api } from '@/lib/api';
import { createWsClient } from '@/lib/ws';

import type { WebNotification, WsNotificationsServerEvent } from '@petwalker/shared';

interface NotificationsContextValue {
  notifications: WebNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markRead: () => undefined,
  markAllRead: () => undefined,
});

export function NotificationsProvider({ children }: PropsWithChildren): JSX.Element {
  const [notifications, setNotifications] = useState<WebNotification[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void api.notifications.list().then(setNotifications).catch(() => undefined);
  }, []);

  useEffect(() => {
    const ws = createWsClient<WsNotificationsServerEvent>({
      path: '/ws/notifications',
      query: {},
      onEvent: (evt) => {
        if (evt.type === 'notification:received') {
          setNotifications((prev) => [evt.notification, ...prev]);
        }
      },
    });
    return () => ws.close();
  }, []);

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  function markRead(id: string): void {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    void api.notifications.markRead(id).catch(() => undefined);
  }

  function markAllRead(): void {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
    void api.notifications.markAllRead().catch(() => undefined);
  }

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  return useContext(NotificationsContext);
}

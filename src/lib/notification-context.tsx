import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import type { Notification } from "./notifications";
import { subscribeToAllNotifications } from "./notifications";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  clearAll: () => void;
  markAsRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToAllNotifications(setNotifications);

    return () => {
      unsubscribe();
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const clearAll = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        clearAll,
        markAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }

  return context;
}

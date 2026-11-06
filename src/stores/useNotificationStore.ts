import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Notification {
  id: string;
  title: string;
  message: string;
  icon?: string;
  color?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  push: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      push: (n) =>
        set((state) => {
          const newNotification: Notification = {
            ...n,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            read: false,
          };
          const updated = [newNotification, ...state.notifications];
          return { notifications: updated.slice(0, 50) };
        }),
      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),
      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      dismiss: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearAll: () => set({ notifications: [] }),
    }),
    { name: "webos-notifications" },
  ),
);

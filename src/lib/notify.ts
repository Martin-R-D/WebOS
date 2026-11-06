import { useNotificationStore } from "../stores/useNotificationStore";

export function notify(title: string, message: string, icon?: string, color?: string) {
  useNotificationStore.getState().push({ title, message, icon, color });
}

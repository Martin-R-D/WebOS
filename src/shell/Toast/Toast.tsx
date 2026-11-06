import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { X } from "lucide-react";
import { useNotificationStore, type Notification } from "../../stores/useNotificationStore";
import "./Toast.css";

interface ToastProps {
  notification: Notification;
}

export function Toast({ notification }: ToastProps) {
  const markRead = useNotificationStore((s) => s.markRead);
  const [dismissing, setDismissing] = useState(false);

  function handleDismiss() {
    setDismissing(true);
    setTimeout(() => markRead(notification.id), 280);
  }

  useEffect(() => {
    const timer = setTimeout(() => handleDismiss(), 4000);
    return () => clearTimeout(timer);
  }, [notification.id]);

  const IconComp = notification.icon
    ? ((Icons as unknown as Record<string, Icons.LucideIcon>)[notification.icon] ?? Icons.Bell)
    : Icons.Bell;

  return (
    <div
      className={`toast${dismissing ? " toast--dismissing" : ""}`}
      onClick={handleDismiss}
    >
      <span className="toast__icon">
        <IconComp size={18} color={notification.color ?? "var(--color-accent)"} />
      </span>
      <span className="toast__body">
        <div className="toast__title">{notification.title}</div>
        <div className="toast__message">{notification.message}</div>
      </span>
      <button
        className="toast__close"
        onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}

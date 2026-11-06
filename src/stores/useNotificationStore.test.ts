import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationStore } from "./useNotificationStore";
import { resetAllStores } from "../test/resetStores";

const store = () => useNotificationStore.getState();

describe("useNotificationStore", () => {
  beforeEach(resetAllStores);

  it("push adds a notification with auto id, timestamp, and read:false", () => {
    store().push({ title: "Test", message: "Hello" });
    const { notifications } = store();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBeTruthy();
    expect(notifications[0].timestamp).toBeGreaterThan(0);
    expect(notifications[0].read).toBe(false);
    expect(notifications[0].title).toBe("Test");
    expect(notifications[0].message).toBe("Hello");
  });

  it("push trims to 50 max notifications", () => {
    for (let i = 0; i < 55; i++) {
      store().push({ title: `N${i}`, message: "msg" });
    }
    expect(store().notifications).toHaveLength(50);
  });

  it("markRead sets read:true for the given id", () => {
    store().push({ title: "A", message: "a" });
    const id = store().notifications[0].id;
    store().markRead(id);
    expect(store().notifications[0].read).toBe(true);
  });

  it("markAllRead marks all notifications as read", () => {
    store().push({ title: "A", message: "a" });
    store().push({ title: "B", message: "b" });
    store().markAllRead();
    expect(store().notifications.every((n) => n.read)).toBe(true);
  });

  it("dismiss removes the notification with the given id", () => {
    store().push({ title: "A", message: "a" });
    store().push({ title: "B", message: "b" });
    // push prepends, so notifications[0] is B (most recent)
    const id = store().notifications[0].id; // B
    store().dismiss(id);
    expect(store().notifications).toHaveLength(1);
    expect(store().notifications[0].title).toBe("A");
  });

  it("clearAll empties the notifications array", () => {
    store().push({ title: "A", message: "a" });
    store().push({ title: "B", message: "b" });
    store().clearAll();
    expect(store().notifications).toHaveLength(0);
  });

  it("persists under webos-notifications key", () => {
    const { name } = (useNotificationStore as unknown as { _persist: { options: { name: string } } })
      ._persist?.options ?? { name: "" };
    // Check via store name in persist config — verify storage key indirectly
    expect(useNotificationStore.persist.getOptions().name).toBe("webos-notifications");
  });
});

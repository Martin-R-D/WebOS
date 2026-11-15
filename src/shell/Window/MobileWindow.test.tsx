import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Window } from "./Window";
import { useWindowStore } from "../../stores/useWindowStore";
import { resetAllStores } from "../../test/resetStores";

const store = () => useWindowStore.getState();
function Windows() {
  const windows = useWindowStore((s) => s.windows);
  return windows.map((win) => <Window key={win.id} win={win} />);
}
beforeEach(() => {
  resetAllStores();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
describe("compact windows", () => {
  it("keeps an unsaved editor mounted through switching, Home and minimization", () => {
    const editor = store().openWindow({ appId: "text-editor", title: "Draft", icon: "FileText", width: 640, height: 460 });
    const { container } = render(<Windows />);
    const textarea = container.querySelector("textarea")!;
    fireEvent.change(textarea, { target: { value: "Unsaved mobile work" } });
    let calculator = "";
    act(() => { calculator = store().openWindow({ appId: "calculator", title: "Calculator", icon: "Calculator", width: 320, height: 500 }); });
    expect(textarea).not.toBeVisible();
    act(() => store().closeWindow(calculator));
    expect(textarea).toBeVisible();
    act(() => store().showDesktop());
    expect(textarea).not.toBeVisible();
    act(() => store().focusWindow(editor));
    act(() => store().minimizeWindow(editor));
    expect(textarea).not.toBeVisible();
    act(() => store().restoreWindow(editor));
    expect(textarea).toBeVisible();
    expect(textarea).toHaveValue("Unsaved mobile work");
    expect(screen.queryByRole("button", { name: "Toggle maximize" })).toBeNull();
    expect(container.querySelector(".window__resize")).toBeNull();
    expect(store().windows[0]).toMatchObject({ width: 640, height: 460, x: 80, y: 60 });
  });
  it("does not select a minimized window when closing the foreground app", () => {
    const a = store().openWindow({ appId: "calculator", title: "A", icon: "Calculator", width: 320, height: 500 });
    store().minimizeWindow(a);
    const b = store().openWindow({ appId: "calculator", title: "B", icon: "Calculator", width: 320, height: 500 });
    store().closeWindow(b);
    expect(store().focusedId).toBeNull();
  });
});

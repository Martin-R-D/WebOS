import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Window } from "./Window";
import { useWindowStore } from "../../stores/useWindowStore";
import { resetAllStores } from "../../test/resetStores";
import type { WindowState } from "../../types";

const ws = () => useWindowStore.getState();

function openCalculator() {
  const id = ws().openWindow({ appId: "calculator", title: "My Calc", icon: "Calculator", width: 400, height: 500 });
  return id;
}
const current = (id: string) => ws().windows.find((w) => w.id === id)!;

function renderWindow(id: string) {
  const Wrapper = () => {
    const win = useWindowStore((s) => s.windows.find((w) => w.id === id)) as WindowState | undefined;
    return win ? <Window win={win} /> : null;
  };
  return render(<Wrapper />);
}

describe("Window", () => {
  beforeEach(resetAllStores);

  it("renders the title, the app content and positions itself from state", () => {
    const id = openCalculator();
    const { container } = renderWindow(id);
    expect(screen.getByText("My Calc")).toBeInTheDocument();
    const el = container.querySelector(".window") as HTMLElement;
    expect(el.style.left).toBe(`${current(id).x}px`);
    expect(el.style.width).toBe("400px");
    expect(el.querySelector(".window__body")!.children.length).toBeGreaterThan(0);
  });

  it("only the focused window carries the focused class", () => {
    const a = openCalculator();
    openCalculator();
    const { container } = renderWindow(a);
    expect(container.querySelector(".window")).not.toHaveClass("window--focused");
    act(() => ws().focusWindow(a));
    expect(container.querySelector(".window")).toHaveClass("window--focused");
  });

  it("renders nothing while minimized", () => {
    const id = openCalculator();
    ws().minimizeWindow(id);
    const { container } = renderWindow(id);
    expect(container.querySelector(".window")).toBeNull();
  });

  it("the minimize, maximize and close buttons drive the store", () => {
    const id = openCalculator();
    const { container } = renderWindow(id);
    const [min, max] = Array.from(container.querySelectorAll<HTMLElement>(".window__btn"));

    fireEvent.click(max);
    expect(current(id).isMaximized).toBe(true);
    expect(container.querySelector(".window")).toHaveClass("window--maximized");
    fireEvent.click(max);
    expect(current(id).isMaximized).toBe(false);

    fireEvent.click(min);
    expect(current(id).isMinimized).toBe(true);

    expect(container.querySelector(".window")).toBeNull();

    act(() => ws().restoreWindow(id));
    fireEvent.click(container.querySelector(".window__btn--close")!);
    expect(ws().windows).toHaveLength(0);
  });

  it("double-clicking the title bar toggles maximize, but double-clicking a button does not", () => {
    const id = openCalculator();
    const { container } = renderWindow(id);
    fireEvent.doubleClick(container.querySelector(".window__titlebar")!);
    expect(current(id).isMaximized).toBe(true);
    fireEvent.doubleClick(container.querySelector(".window__btn")!);
    expect(current(id).isMaximized).toBe(true);
  });

  describe("dragging by the title bar", () => {
    it("moves the window by the mouse delta and stops after mouseup", () => {
      const id = openCalculator();
      const { x, y } = current(id);
      const { container } = renderWindow(id);
      fireEvent.mouseDown(container.querySelector(".window__titlebar")!, { clientX: 200, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 260, clientY: 140 });
      expect(current(id)).toMatchObject({ x: x + 60, y: y + 40 });
      fireEvent.mouseUp(window, { clientX: 260, clientY: 140 });
      fireEvent.mouseMove(window, { clientX: 900, clientY: 700 });
      expect(current(id)).toMatchObject({ x: x + 60, y: y + 40 });
      expect(document.body).not.toHaveClass("dragging");
    });

    it("keeps the window reachable: never above the screen and never fully off-screen", () => {
      const id = openCalculator();
      const { container } = renderWindow(id);
      fireEvent.mouseDown(container.querySelector(".window__titlebar")!, { clientX: 200, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: -5000, clientY: -5000 });
      expect(current(id).y).toBe(0);
      expect(current(id).x).toBe(-current(id).width + 120);
      fireEvent.mouseMove(window, { clientX: 9000, clientY: 9000 });
      expect(current(id).x).toBe(window.innerWidth - 120);
      expect(current(id).y).toBe(window.innerHeight - 48 - 80);
      fireEvent.mouseUp(window, { clientX: 400, clientY: 300 });
    });

    it("cannot be dragged while maximized", () => {
      const id = openCalculator();
      ws().toggleMaximize(id);
      const { container } = renderWindow(id);
      fireEvent.mouseDown(container.querySelector(".window__titlebar")!, { clientX: 10, clientY: 10 });
      fireEvent.mouseMove(window, { clientX: 300, clientY: 300 });
      expect(current(id)).toMatchObject({ x: 0, y: 0 });
    });

    it("pressing a title bar button does not start a drag", () => {
      const id = openCalculator();
      const { x } = current(id);
      const { container } = renderWindow(id);
      fireEvent.mouseDown(container.querySelector(".window__btn")!, { clientX: 10, clientY: 10 });
      fireEvent.mouseMove(window, { clientX: 300, clientY: 300 });
      expect(current(id).x).toBe(x);
    });
  });

  describe("resizing", () => {
    it("the east handle widens the window", () => {
      const id = openCalculator();
      const { container } = renderWindow(id);
      fireEvent.mouseDown(container.querySelector(".window__resize--e")!, { clientX: 500, clientY: 300 });
      fireEvent.mouseMove(window, { clientX: 560, clientY: 300 });
      fireEvent.mouseUp(window);
      expect(current(id).width).toBe(460);
      expect(current(id).height).toBe(500);
    });

    it("the north-west handle moves the origin and grows the window in both directions", () => {
      const id = openCalculator();
      const { x, y } = current(id);
      const { container } = renderWindow(id);
      fireEvent.mouseDown(container.querySelector(".window__resize--nw")!, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 70, clientY: 80 });
      fireEvent.mouseUp(window);
      expect(current(id)).toMatchObject({ x: x - 30, y: y - 20, width: 430, height: 520 });
    });

    it("never shrinks below the app minimum, keeping the opposite edge fixed", () => {
      const id = openCalculator();
      const { x, width } = current(id);
      const min = 280;
      const { container } = renderWindow(id);
      fireEvent.mouseDown(container.querySelector(".window__resize--w")!, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 1000, clientY: 100 });
      fireEvent.mouseUp(window);
      expect(current(id).width).toBe(min);
      expect(current(id).x + current(id).width).toBe(x + width);
    });

    it("hides the resize handles while maximized", () => {
      const id = openCalculator();
      ws().toggleMaximize(id);
      const { container } = renderWindow(id);
      expect(container.querySelectorAll(".window__resize")).toHaveLength(0);
    });
  });
});

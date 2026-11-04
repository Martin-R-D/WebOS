import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskManager } from "./TaskManager";
import { useWindowStore } from "../../stores/useWindowStore";
import { resetAllStores } from "../../test/resetStores";

const ws = () => useWindowStore.getState();
const open = (appId: "terminal" | "paint" | "task-manager", title: string) =>
  ws().openWindow({ appId, title, icon: "Square", width: 300, height: 200 });

function row(title: string) {
  return screen.getByText(title).closest(".tm__row") as HTMLElement;
}

describe("TaskManager", () => {
  beforeEach(resetAllStores);

  it("lists every open window with its app name and state", () => {
    const self = open("task-manager", "Task Manager");
    const paint = open("paint", "drawing.png");
    ws().minimizeWindow(paint);
    render(<TaskManager windowId={self} />);
    expect(within(row("Task Manager")).getByText(/Task Manager · Running/)).toBeInTheDocument();
    expect(within(row("drawing.png")).getByText(/Paint · Minimized/)).toBeInTheDocument();
  });

  it("shows the window count and current theme in the stats", () => {
    const self = open("task-manager", "Task Manager");
    open("terminal", "Terminal");
    render(<TaskManager windowId={self} />);
    const windowsStat = screen.getByText("Windows").parentElement!;
    expect(within(windowsStat).getByText("2")).toBeInTheDocument();
    const themeStat = screen.getByText("Theme").parentElement!;
    expect(within(themeStat).getByText("dark")).toBeInTheDocument();
  });

  it("closes only the chosen window via End task", async () => {
    const self = open("task-manager", "Task Manager");
    const term = open("terminal", "Terminal");
    render(<TaskManager windowId={self} />);
    await userEvent.click(within(row("Terminal")).getByTitle("End task"));
    expect(ws().windows.map((w) => w.id)).toEqual([self]);
    expect(ws().windows.find((w) => w.id === term)).toBeUndefined();
  });

  it("cannot end its own task", () => {
    const self = open("task-manager", "Task Manager");
    render(<TaskManager windowId={self} />);
    expect(within(row("Task Manager")).getByTitle("That's me!")).toBeDisabled();
  });

  it("Focus brings a minimized window back to the front", async () => {
    const self = open("task-manager", "Task Manager");
    const term = open("terminal", "Terminal");
    ws().minimizeWindow(term);
    render(<TaskManager windowId={self} />);
    await userEvent.click(within(row("Terminal")).getByTitle("Focus"));
    expect(ws().focusedId).toBe(term);
    expect(ws().windows.find((w) => w.id === term)!.isMinimized).toBe(false);
  });

  it("End all tasks closes everything except the task manager itself", async () => {
    const self = open("task-manager", "Task Manager");
    open("terminal", "Terminal");
    open("paint", "Paint");
    render(<TaskManager windowId={self} />);
    await userEvent.click(screen.getByRole("button", { name: "End all tasks" }));
    expect(ws().windows.map((w) => w.id)).toEqual([self]);
  });

  it("disables End all tasks when it is the only window", () => {
    const self = open("task-manager", "Task Manager");
    render(<TaskManager windowId={self} />);
    expect(screen.getByRole("button", { name: "End all tasks" })).toBeDisabled();
  });
});

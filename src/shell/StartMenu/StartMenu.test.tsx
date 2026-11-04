import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StartMenu } from "./StartMenu";
import { appRegistry } from "../../apps/registry";
import { useWindowStore } from "../../stores/useWindowStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { resetAllStores } from "../../test/resetStores";

describe("StartMenu", () => {
  beforeEach(resetAllStores);

  it("renders nothing while closed", () => {
    const { container } = render(<StartMenu open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists every registered app and greets the user", () => {
    useSystemStore.getState().setUsername("ada");
    render(<StartMenu open onClose={() => {}} />);
    for (const app of Object.values(appRegistry)) {
      expect(screen.getByRole("button", { name: app.name }), app.name).toBeInTheDocument();
    }
    expect(screen.getByText("ada")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("launching an app opens its window and closes the menu", async () => {
    const onClose = vi.fn();
    render(<StartMenu open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Calculator" }));
    expect(useWindowStore.getState().windows.map((w) => w.appId)).toEqual(["calculator"]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking outside the panel closes it, clicking inside does not", async () => {
    const onClose = vi.fn();
    const { container } = render(<StartMenu open onClose={onClose} />);
    await userEvent.click(container.querySelector(".startmenu__header")!);
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(container.querySelector(".startmenu-overlay")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("right-click offers Add to Taskbar, then Unpin from Taskbar once pinned", async () => {
    render(<StartMenu open onClose={() => {}} />);
    fireEvent.contextMenu(screen.getByRole("button", { name: "Paint" }));
    await userEvent.click(screen.getByText("Add to Taskbar"));
    expect(useSystemStore.getState().pinnedApps).toEqual(["paint"]);

    fireEvent.contextMenu(screen.getByRole("button", { name: "Paint" }));
    expect(screen.queryByText("Add to Taskbar")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Unpin from Taskbar"));
    expect(useSystemStore.getState().pinnedApps).toEqual([]);
  });

  it("right-click Open launches the app and closes the menu", async () => {
    const onClose = vi.fn();
    render(<StartMenu open onClose={onClose} />);
    fireEvent.contextMenu(screen.getByRole("button", { name: "Clock" }));
    await userEvent.click(screen.getByText("Open"));
    expect(useWindowStore.getState().windows.map((w) => w.appId)).toEqual(["clock"]);
    expect(onClose).toHaveBeenCalled();
  });

  it("the lock button locks the system and closes the menu", async () => {
    const onClose = vi.fn();
    render(<StartMenu open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Lock" }));
    expect(useSystemStore.getState().locked).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

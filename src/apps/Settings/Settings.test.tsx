import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";
import { useSystemStore } from "../../stores/useSystemStore";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { resetAllStores } from "../../test/resetStores";

const sys = () => useSystemStore.getState();

describe("Settings", () => {
  beforeEach(() => {
    resetAllStores();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.removeProperty("--color-accent");
  });
  afterEach(() => vi.restoreAllMocks());

  it("applies the stored theme and accent colour to the document", () => {
    sys().setTheme("light");
    sys().setAccentColor("#ff6a88");
    render(<Settings windowId="s" />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--color-accent")).toBe("#ff6a88");
  });

  it("switching theme updates the store and the document", async () => {
    render(<Settings windowId="s" />);
    await userEvent.click(screen.getByRole("button", { name: "Midnight" }));
    expect(sys().theme).toBe("midnight");
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
    expect(screen.getByRole("button", { name: "Midnight" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "Dark" })).not.toHaveClass("active");
  });

  it("picking a wallpaper swatch stores it and marks it active", async () => {
    const { container } = render(<Settings windowId="s" />);
    const swatches = container.querySelectorAll<HTMLElement>(".settings__wallpaper");
    expect(swatches.length).toBeGreaterThan(1);
    await userEvent.click(swatches[2]);
    expect(sys().wallpaper).toContain("#203a43");
    expect(container.querySelectorAll(".settings__wallpaper.active")).toHaveLength(1);
  });

  it("the Account section edits the username and shows its initial", async () => {
    render(<Settings windowId="s" />);
    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "ada");
    expect(sys().username).toBe("ada");
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("the System section toggles sound", async () => {
    render(<Settings windowId="s" />);
    await userEvent.click(screen.getByRole("button", { name: "System" }));
    expect(screen.getByText(/Sound On/)).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Sound On/).querySelector(".settings__toggle")!);
    expect(sys().soundEnabled).toBe(false);
    expect(screen.getByText(/Sound Off/)).toBeInTheDocument();
  });

  it("Reset Settings restores defaults only after confirmation", async () => {
    sys().setUsername("ada");
    sys().setTheme("light");
    render(<Settings windowId="s" />);
    await userEvent.click(screen.getByRole("button", { name: "System" }));

    vi.spyOn(window, "confirm").mockReturnValue(false);
    await userEvent.click(screen.getByRole("button", { name: "Reset Settings" }));
    expect(sys().username).toBe("ada");

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Reset Settings" }));
    expect(sys()).toMatchObject({ username: "Guest", theme: "dark" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("Reset File System asks first and keeps files when cancelled", async () => {
    const created = useFileSystemStore
      .getState()
      .createNode(useFileSystemStore.getState().rootId, "keep.txt", "file", "");
    render(<Settings windowId="s" />);
    await userEvent.click(screen.getByRole("button", { name: "System" }));
    vi.spyOn(window, "confirm").mockReturnValue(false);
    await userEvent.click(screen.getByRole("button", { name: "Reset File System" }));
    expect(useFileSystemStore.getState().getNode(created)).toBeDefined();
  });

  it("the About section shows the version", async () => {
    render(<Settings windowId="s" />);
    await userEvent.click(screen.getByRole("button", { name: "About" }));
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("rel", "noopener noreferrer");
  });
});

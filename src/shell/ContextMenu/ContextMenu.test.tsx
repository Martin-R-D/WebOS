import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextMenu } from "./ContextMenu";

const items = (a = vi.fn(), b = vi.fn()) => [
  { label: "Open", onClick: a },
  { label: "Delete", onClick: b, danger: true, separatorBefore: true },
];

describe("ContextMenu", () => {
  it("renders every item into document.body, positioned at the click point", () => {
    render(<ContextMenu x={120} y={80} items={items()} onClose={() => {}} />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    const menu = document.body.querySelector(".ctx-menu") as HTMLElement;
    expect(menu.style.left).toBe("120px");
    expect(menu.style.top).toBe("80px");
  });

  it("marks danger items and draws a separator only where requested", () => {
    render(<ContextMenu x={0} y={0} items={items()} onClose={() => {}} />);
    expect(screen.getByText("Delete")).toHaveClass("ctx-item--danger");
    expect(screen.getByText("Open")).not.toHaveClass("ctx-item--danger");
    expect(document.body.querySelectorAll(".ctx-sep")).toHaveLength(1);
  });

  it("clicking an item runs its action and then closes the menu", async () => {
    const open = vi.fn();
    const del = vi.fn();
    const onClose = vi.fn();
    render(<ContextMenu x={0} y={0} items={items(open, del)} onClose={onClose} />);
    await userEvent.click(screen.getByText("Delete"));
    expect(del).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop closes without triggering any action", async () => {
    const open = vi.fn();
    const onClose = vi.fn();
    render(<ContextMenu x={0} y={0} items={items(open)} onClose={onClose} />);
    await userEvent.click(document.body.querySelector(".ctx-overlay")!);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it("clicking the menu padding does not close it", async () => {
    const onClose = vi.fn();
    render(<ContextMenu x={0} y={0} items={items()} onClose={onClose} />);
    await userEvent.click(document.body.querySelector(".ctx-menu")!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("a right click on the backdrop closes the menu instead of opening the browser one", async () => {
    const onClose = vi.fn();
    render(<ContextMenu x={0} y={0} items={items()} onClose={onClose} />);
    await userEvent.pointer({ keys: "[MouseRight]", target: document.body.querySelector(".ctx-overlay")! });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

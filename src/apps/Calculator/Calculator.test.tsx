import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Calculator } from "./Calculator";
import { useCalculatorHistoryStore } from "../../stores/useCalculatorHistoryStore";

beforeEach(() => useCalculatorHistoryStore.getState().clear());

describe("calculator history", () => {
  it("records evaluation once, reuses an expression and clears with confirmation", () => {
    render(<Calculator windowId="calc" />);
    for (const key of ["2", "+", "3", "=", "="])
      fireEvent.click(screen.getByRole("button", { name: key }));
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(useCalculatorHistoryStore.getState().entries).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Use expression" }));
    expect(document.querySelector(".calc__expr")).toHaveTextContent("2+3");
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    fireEvent.click(screen.getByText("Clear history"));
    expect(useCalculatorHistoryStore.getState().entries).toHaveLength(1);
    fireEvent.click(screen.getByText("Confirm clear"));
    expect(screen.getByText("No calculations yet.")).toBeInTheDocument();
  });

  it("caps persisted records at 20 and ignores invalid results", async () => {
    for (let i = 0; i < 25; i++)
      useCalculatorHistoryStore.getState().record(`${i}+1`, i + 1);
    useCalculatorHistoryStore.getState().record("1/0", Infinity);
    expect(useCalculatorHistoryStore.getState().entries).toHaveLength(20);
    expect(useCalculatorHistoryStore.getState().entries[0].result).toBe(25);
    useCalculatorHistoryStore.setState({ entries: [] });
    // Rehydrate a real saved snapshot after resetting only in-memory state.
    useCalculatorHistoryStore.getState().record("1+2", 3);
    const saved = localStorage.getItem("webos-calculator-history")!;
    useCalculatorHistoryStore.setState({ entries: [] });
    localStorage.setItem("webos-calculator-history", saved);
    await useCalculatorHistoryStore.persist.rehydrate();
    expect(useCalculatorHistoryStore.getState().entries[0].result).toBe(3);
  });

  it("reports denied clipboard access", async () => {
    useCalculatorHistoryStore.getState().record("2+3", 5);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<Calculator windowId="calc" />);
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    fireEvent.click(screen.getByText("Copy result"));
    expect(await screen.findByText(/Could not copy/)).toBeInTheDocument();
  });
});

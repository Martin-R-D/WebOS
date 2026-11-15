import { beforeEach, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UnitConverter } from "./UnitConverter";
import { resetAllStores } from "../../test/resetStores";
import { useFileSystemStore } from "../../stores/useFileSystemStore";

beforeEach(resetAllStores);
it("converts temperature, reports invalid values and clears input", () => {
  render(<UnitConverter windowId="converter" />);
  fireEvent.change(screen.getByLabelText("Category"), {
    target: { value: "temperature" },
  });
  fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "0" } });
  expect(screen.getByLabelText("Conversion result")).toHaveTextContent("32");
  fireEvent.change(screen.getByLabelText("Amount"), {
    target: { value: "-300" },
  });
  expect(
    screen.getByText(/Temperature cannot be below absolute zero/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByText("Clear"));
  expect(screen.getByLabelText("Amount")).toHaveValue("");
});
it("adds the converter shortcut when upgrading version 7 without duplicating or deleting files", async () => {
  const state = useFileSystemStore.getState();
  const nodes = Object.fromEntries(
    Object.entries(state.nodes).filter(
      ([, node]) => node.content !== "unit-converter",
    ),
  );
  localStorage.setItem(
    "webos-filesystem",
    JSON.stringify({
      version: 7,
      state: { nodes, rootId: state.rootId, deletedNodes: {} },
    }),
  );
  await useFileSystemStore.persist.rehydrate();
  const shortcuts = () =>
    Object.values(useFileSystemStore.getState().nodes).filter(
      (node) => node.content === "unit-converter",
    );
  expect(shortcuts()).toHaveLength(1);
  expect(useFileSystemStore.getState().nodes[state.rootId]).toBeDefined();
  await useFileSystemStore.persist.rehydrate();
  expect(shortcuts()).toHaveLength(1);
});

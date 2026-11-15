import { beforeEach, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useTodoStore } from "../../stores/useTodoStore";
import { resetAllStores } from "../../test/resetStores";
import { TodoList } from "./TodoList";
import { useFileSystemStore } from "../../stores/useFileSystemStore";

beforeEach(resetAllStores);
it("validates titles, persists completion, and keeps active tasks when clearing", async () => {
  const store = useTodoStore.getState();
  expect(store.add("   ")).toBe(false);
  expect(store.add("x".repeat(201))).toBe(false);
  store.add("  First task  ");
  const first = useTodoStore.getState().tasks[0];
  expect(first.title).toBe("First task");
  expect(store.edit(first.id, "")).toBe(false);
  store.edit(first.id, "Edited");
  store.toggle(first.id);
  store.add("Second task");
  const saved = localStorage.getItem("webos-todos")!;
  useTodoStore.setState({ tasks: [] });
  localStorage.setItem("webos-todos", saved);
  await useTodoStore.persist.rehydrate();
  expect(useTodoStore.getState().tasks[0]).toMatchObject({
    id: first.id,
    completed: true,
    title: "Edited",
  });
  store.clearCompleted();
  expect(useTodoStore.getState().tasks.map((task) => task.title)).toEqual([
    "Second task",
  ]);
  useFileSystemStore.getState().resetFileSystem();
  expect(useTodoStore.getState().tasks).toHaveLength(1);
});
it("supports edit cancellation, filters and confirmed deletion", () => {
  const store = useTodoStore.getState();
  store.add("Buy milk");
  render(<TodoList windowId="todo" />);
  fireEvent.click(screen.getByRole("button", { name: "Edit Buy milk" }));
  fireEvent.change(screen.getByLabelText("Edit task"), {
    target: { value: "Discard" },
  });
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.getByText("Buy milk")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Complete Buy milk"));
  fireEvent.click(screen.getByText("Active (0)"));
  expect(screen.getByText("No active tasks.")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Completed (1)"));
  fireEvent.click(screen.getByRole("button", { name: "Delete Buy milk" }));
  expect(useTodoStore.getState().tasks).toHaveLength(1);
  fireEvent.click(screen.getByText("Confirm delete"));
  expect(useTodoStore.getState().tasks).toHaveLength(0);
});
it("adds the task shortcut for existing users without resetting documents", async () => {
  const fs = useFileSystemStore.getState();
  const nodes = Object.fromEntries(
    Object.entries(fs.nodes).filter(([, node]) => node.content !== "todo-list"),
  );
  localStorage.setItem(
    "webos-filesystem",
    JSON.stringify({
      version: 8,
      state: { nodes, rootId: fs.rootId, deletedNodes: {} },
    }),
  );
  await useFileSystemStore.persist.rehydrate();
  expect(
    Object.values(useFileSystemStore.getState().nodes).filter(
      (node) => node.content === "todo-list",
    ),
  ).toHaveLength(1);
  expect(
    Object.values(useFileSystemStore.getState().nodes).find(
      (node) => node.name === "todo.txt",
    ),
  ).toBeDefined();
});

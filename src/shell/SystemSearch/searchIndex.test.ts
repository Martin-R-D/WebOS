import { expect, it } from "vitest";
import { searchIndex } from "./searchIndex";
import type { FsNode } from "../../types";

function node(id: string, name: string): FsNode {
  return {
    id,
    name,
    type: "file",
    parentId: "root",
    content: "",
    createdAt: 1,
    updatedAt: 1,
  };
}

it("groups all sources and ranks exact, prefix and partial matches case insensitively", () => {
  const sources = {
    apps: [{ id: "calculator" as const, name: "Calculator" }],
    nodes: {
      a: node("a", "budget"),
      b: node("b", "budget draft"),
      c: node("c", "my budget"),
    },
    notes: [{ id: "note", text: "Budget shopping list", pinned: true }],
    tasks: [{ id: "task", title: "Review budget", completed: true }],
  };
  const results = searchIndex(" BUDGET ", sources);
  expect(
    results
      .filter((result) => result.category === "files")
      .map((result) => result.targetId),
  ).toEqual(["a", "b", "c"]);
  expect(
    results.find((result) => result.category === "notes")?.detail,
  ).toContain("Pinned note");
  expect(results.find((result) => result.category === "tasks")?.detail).toBe(
    "Completed task",
  );
  expect(searchIndex("calc", sources)[0].category).toBe("apps");
  expect(searchIndex("", sources)).toEqual([]);
});

it("reflects removed sources and handles a larger local file collection", () => {
  const nodes = Object.fromEntries(
    Array.from({ length: 2000 }, (_, index) => [
      `${index}`,
      node(`${index}`, `Report ${index}`),
    ]),
  );
  const sources = { apps: [], nodes, notes: [], tasks: [] };
  expect(searchIndex("report", sources)).toHaveLength(2000);
  delete nodes["123"];
  expect(
    searchIndex("Report 123", sources).some(
      (result) => result.targetId === "123",
    ),
  ).toBe(false);
});

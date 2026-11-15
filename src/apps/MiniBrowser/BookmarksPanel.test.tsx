import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useBookmarksStore } from "../../stores/useBookmarksStore";
import { BookmarksPanel } from "./BookmarksPanel";
import { resetAllStores } from "../../test/resetStores";

beforeEach(resetAllStores);
it("normalizes addresses, rejects unsafe/duplicate URLs and persists edits", async () => {
  const store = useBookmarksStore.getState();
  expect(store.save("Example", "example.com")).toBeNull();
  expect(store.save("Duplicate", "https://example.com/")).toMatch(/already/);
  expect(store.save("Bad", "javascript:alert(1)")).toMatch(/HTTP/);
  expect(store.save("Bad", "https://user:pass@example.com")).toMatch(/HTTP/);
  const id = useBookmarksStore.getState().bookmarks[0].id;
  store.save("Renamed", "example.com/page", id);
  const saved = localStorage.getItem("webos-bookmarks")!;
  useBookmarksStore.setState({ bookmarks: [] });
  localStorage.setItem("webos-bookmarks", saved);
  await useBookmarksStore.persist.rehydrate();
  expect(useBookmarksStore.getState().bookmarks[0]).toMatchObject({
    id,
    title: "Renamed",
    url: "https://example.com/page",
  });
});
it("opens saved addresses and confirms removal", () => {
  useBookmarksStore.getState().save("Example", "https://example.com");
  const navigate = vi.fn();
  render(
    <BookmarksPanel
      currentUrl="webos://start"
      onNavigate={navigate}
      onClose={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByText("Example"));
  expect(navigate).toHaveBeenCalledWith("https://example.com/");
  fireEvent.click(screen.getByRole("button", { name: "Remove Example" }));
  expect(useBookmarksStore.getState().bookmarks).toHaveLength(1);
  fireEvent.click(screen.getByText("Confirm remove"));
  expect(screen.getByText("No bookmarks yet.")).toBeInTheDocument();
});

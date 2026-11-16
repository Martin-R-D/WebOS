import { beforeEach, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Photos } from "./Photos";
import { resetAllStores } from "../../test/resetStores";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";

beforeEach(resetAllStores);
it("opens existing images in Paint and reveals their folder", () => {
  const fs = useFileSystemStore.getState();
  const id = fs.createNode(
    fs.rootId,
    "photo.png",
    "file",
    "data:image/png;base64,AAAA",
  );
  render(<Photos windowId="photos" launchProps={{ fileId: id }} />);
  fireEvent.click(screen.getByRole("button", { name: "Open in Paint" }));
  expect(useWindowStore.getState().windows.at(-1)?.launchProps?.fileId).toBe(
    id,
  );
  expect(useWindowStore.getState().windows.at(-1)?.appId).toBe("paint");
  fireEvent.click(
    screen.getByRole("button", { name: "Show in File Explorer" }),
  );
  expect(useWindowStore.getState().windows.at(-1)?.appId).toBe("file-explorer");
});
it("handles a removed selected image", () => {
  render(<Photos windowId="photos" launchProps={{ fileId: "deleted" }} />);
  expect(screen.getByRole("status")).toHaveTextContent("deleted");
});

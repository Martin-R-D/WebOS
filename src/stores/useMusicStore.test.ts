import { beforeEach, expect, it } from "vitest";
import { useMusicStore as store } from "./useMusicStore";
beforeEach(() => store.setState(store.getInitialState(), true));
it("keeps playlists unique by track and prunes permanently removed files", () => {
  store.getState().create("Favorites");
  const id = store.getState().playlists[0].id;
  store.getState().addTrack(id, "track");
  store.getState().addTrack(id, "track");
  expect(store.getState().playlists[0].files).toEqual(["track"]);
  store.getState().rename(id, "Road trip");
  expect(store.getState().playlists[0].name).toBe("Road trip");
  store.getState().removeFiles(["track"]);
  expect(store.getState().playlists[0].files).toEqual([]);
  store.getState().remove(id);
  expect(store.getState().playlists).toEqual([]);
});

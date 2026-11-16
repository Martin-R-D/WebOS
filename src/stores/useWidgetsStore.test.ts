import { beforeEach, expect, it } from "vitest";
import { useWidgetsStore as store } from "./useWidgetsStore";
beforeEach(() => store.setState(store.getInitialState(), true));
it("keeps one widget per kind and persists display configuration", () => {
  store.getState().add("clock");
  store.getState().add("clock");
  expect(store.getState().widgets).toHaveLength(1);
  const id = store.getState().widgets[0].id;
  store.getState().update(id, { x: 20, y: 40, large: true, hour12: false });
  expect(
    JSON.parse(localStorage.getItem("webos-widgets")!).state.widgets[0],
  ).toMatchObject({ x: 20, large: true, hour12: false });
  store.getState().remove(id);
  expect(store.getState().widgets).toHaveLength(0);
});

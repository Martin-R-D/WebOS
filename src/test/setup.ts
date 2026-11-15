import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement scrolling
Element.prototype.scrollTo = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom has no native PointerEvent; preserve coordinates for pointer interactions.
if (!window.PointerEvent) window.PointerEvent = MouseEvent as typeof PointerEvent;

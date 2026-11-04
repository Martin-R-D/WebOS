import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement scrolling
Element.prototype.scrollTo = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

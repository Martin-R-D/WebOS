import { expect, it } from "vitest";
import { audienceMessage } from "./audience";
import {
  duplicateSlide,
  makeSlide,
  validateSlidesContent,
} from "../slidesModel";

it("preserves notes in files and duplicated slides while excluding them from audience messages", () => {
  const slide = { ...makeSlide(), notes: "PRIVATE presenter reminder" };
  expect(() => validateSlidesContent({ slides: [slide] })).not.toThrow();
  expect(duplicateSlide(slide).notes).toBe(slide.notes);
  const message = audienceMessage(slide, 0, 2);
  expect(message.index).toBe(0);
  expect(message.count).toBe(2);
  expect(message.slide.elements).toEqual(slide.elements);
  expect(JSON.stringify(message)).not.toContain("PRIVATE");
  expect(message.slide).not.toHaveProperty("notes");
  expect(() =>
    validateSlidesContent({ slides: [{ ...slide, notes: 42 }] }),
  ).toThrow();
});

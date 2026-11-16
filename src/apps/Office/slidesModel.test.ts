import { expect, it } from "vitest";
import {
  duplicateSlide,
  makeElement,
  makeSlide,
  validateSlidesContent,
} from "./slidesModel";

it("creates valid layouts and duplicates with independent identities", () => {
  for (const layout of ["blank", "title", "content"] as const) {
    const slide = makeSlide(layout);
    const copy = duplicateSlide(slide);
    expect(copy.id).not.toBe(slide.id);
    const originalIds = new Set(slide.elements.map((element) => element.id));
    expect(copy.elements.every((element) => !originalIds.has(element.id))).toBe(
      true,
    );
    expect(copy.elements.map((element) => element.text)).toEqual(
      slide.elements.map((element) => element.text),
    );
    expect(() =>
      validateSlidesContent({ slides: [slide, copy] }),
    ).not.toThrow();
  }
});

it("rejects malformed slides, unsafe identities, external images and invalid dimensions", () => {
  const slide = makeSlide();
  const element = makeElement("rectangle");
  for (const slides of [
    [],
    [{ ...slide, id: 'bad"id' }],
    [slide, slide],
    [{ ...slide, elements: [{ ...element, width: -1 }] }],
    [
      {
        ...slide,
        elements: [
          makeElement("image", { src: "https://example.com/image.png" }),
        ],
      },
    ],
  ]) {
    expect(() => validateSlidesContent({ slides })).toThrow();
  }
});

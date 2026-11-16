import type { Slide } from "../slidesModel";

export function audienceMessage(slide: Slide, index: number, count: number) {
  return {
    type: "slide" as const,
    slide: {
      id: slide.id,
      background: slide.background,
      elements: slide.elements,
    },
    index,
    count,
  };
}

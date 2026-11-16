export interface SlideElement {
  id: string;
  type: "text" | "image" | "rectangle" | "circle" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  src: string;
  color: string;
  fill: string;
  fontSize: number;
  bold: boolean;
  align: "left" | "center" | "right";
}

export interface Slide {
  id: string;
  background: string;
  elements: SlideElement[];
}

export function makeElement(
  type: SlideElement["type"],
  overrides: Partial<SlideElement> = {},
): SlideElement {
  return {
    id: crypto.randomUUID(),
    type,
    x: 100,
    y: 100,
    width: 480,
    height: 160,
    text: "Edit this text",
    src: "",
    color: "#202020",
    fill: "#86b8f5",
    fontSize: 40,
    bold: false,
    align: "left",
    ...overrides,
  };
}

export function makeSlide(
  layout: "blank" | "title" | "content" = "title",
): Slide {
  const elements =
    layout === "blank"
      ? []
      : [
          makeElement("text", {
            text: "Presentation title",
            x: 100,
            y: 140,
            width: 1080,
            height: 140,
            fontSize: 64,
            bold: true,
          }),
        ];
  if (layout === "content")
    elements.push(
      makeElement("text", {
        text: "Add your content here",
        x: 100,
        y: 320,
        width: 1080,
        height: 300,
        fontSize: 32,
      }),
    );
  return { id: crypto.randomUUID(), background: "#ffffff", elements };
}

export function duplicateSlide(slide: Slide): Slide {
  return {
    ...slide,
    id: crypto.randomUUID(),
    elements: slide.elements.map((element) => ({
      ...element,
      id: crypto.randomUUID(),
    })),
  };
}

export function validateSlidesContent(content: Record<string, unknown>): void {
  if (
    !Array.isArray(content.slides) ||
    !content.slides.length ||
    content.slides.length > 100
  )
    throw new Error("Presentations must contain 1–100 slides.");
  const ids = new Set<string>();
  const color = (value: unknown) =>
    typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  for (const slide of content.slides) {
    if (
      !slide ||
      typeof slide.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(slide.id) ||
      ids.has(slide.id) ||
      !color(slide.background) ||
      !Array.isArray(slide.elements) ||
      slide.elements.length > 100
    )
      throw new Error("Invalid slide structure.");
    ids.add(slide.id);
    for (const element of slide.elements) {
      if (
        !element ||
        typeof element.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(element.id) ||
        ids.has(element.id) ||
        !["text", "image", "rectangle", "circle", "line"].includes(element.type)
      )
        throw new Error("Unsupported slide element.");
      ids.add(element.id);
      for (const key of ["x", "y", "width", "height", "fontSize"]) {
        if (
          !Number.isFinite(element[key]) ||
          element[key] < 0 ||
          element[key] > 2000
        )
          throw new Error("Invalid element dimensions.");
      }
      if (
        element.x + element.width > 1280 ||
        element.y + element.height > 720 ||
        element.fontSize < 8 ||
        element.fontSize > 200 ||
        element.width < 10 ||
        element.height < 10 ||
        !color(element.color) ||
        !color(element.fill) ||
        typeof element.text !== "string" ||
        element.text.length > 20_000 ||
        typeof element.bold !== "boolean" ||
        !["left", "center", "right"].includes(element.align)
      )
        throw new Error("Invalid element properties.");
      if (
        element.type === "image" &&
        (typeof element.src !== "string" ||
          !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(
            element.src,
          ))
      )
        throw new Error("Images must be embedded PNG, JPEG or WebP files.");
    }
  }
}

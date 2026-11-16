import { expect, it } from "vitest";
import { validateWriterContent } from "./writerContent";

it("accepts formatted documents and rejects unsupported or external content", () => {
  expect(() =>
    validateWriterContent({
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello", marks: [{ type: "bold" }] },
            ],
          },
        ],
      },
    }),
  ).not.toThrow();
  for (const body of [
    { type: "script" },
    { type: "doc", content: "bad" },
    {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://external.test/tracking.png" } },
      ],
    },
  ]) {
    expect(() => validateWriterContent({ body })).toThrow();
  }
});

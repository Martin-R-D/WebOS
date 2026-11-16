import { Schema } from "@tiptap/pm/model";
import { expect, it } from "vitest";
import { findMatches } from "./matches";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    text: { group: "inline" },
    image: { inline: true, group: "inline" },
  },
  marks: { bold: {} },
});

it("finds literal text across formatting boundaries with correct document positions", () => {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [
      schema.text("Hel"),
      schema.text("lo", [schema.mark("bold")]),
      schema.text(" hello (hello)"),
    ]),
  ]);
  expect(
    findMatches(doc, { query: "hello", matchCase: false, wholeWord: false }),
  ).toEqual([
    { from: 1, to: 6 },
    { from: 7, to: 12 },
    { from: 14, to: 19 },
  ]);
  expect(
    findMatches(doc, { query: "Hello", matchCase: true, wholeWord: false }),
  ).toHaveLength(1);
  expect(
    findMatches(doc, { query: "(hello)", matchCase: false, wholeWord: false }),
  ).toHaveLength(1);
});

it("respects whole words and paragraph or embedded-image boundaries", () => {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [
      schema.text("cat cats cat_ CAT"),
      schema.node("image"),
      schema.text("dog"),
    ]),
    schema.node("paragraph", null, schema.text("cat")),
  ]);
  expect(
    findMatches(doc, { query: "cat", matchCase: false, wholeWord: true }),
  ).toHaveLength(3);
  expect(
    findMatches(doc, { query: "CATdog", matchCase: false, wholeWord: false }),
  ).toHaveLength(0);
  expect(
    findMatches(doc, { query: "", matchCase: false, wholeWord: false }),
  ).toHaveLength(0);
});

it("searches inside table cells without joining adjacent cells", () => {
  const tables = new Schema({
    nodes: schema.spec.nodes.append({
      table: { content: "row+", group: "block" },
      row: { content: "cell+" },
      cell: { content: "paragraph+" },
    }),
    marks: schema.spec.marks,
  });
  const doc = tables.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "row",
            content: [
              {
                type: "cell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "hello" }],
                  },
                ],
              },
              {
                type: "cell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "world" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  const matches = findMatches(doc, {
    query: "hello",
    matchCase: false,
    wholeWord: true,
  });
  expect(matches).toHaveLength(1);
  expect(doc.textBetween(matches[0].from, matches[0].to)).toBe("hello");
  expect(
    findMatches(doc, {
      query: "helloworld",
      matchCase: false,
      wholeWord: false,
    }),
  ).toHaveLength(0);
});

it("handles astral letters, emoji and isolated surrogate characters", () => {
  const doc = schema.node(
    "doc",
    null,
    schema.node("paragraph", null, schema.text("𐐀cat cat𐐀 😀cat \udc00cat")),
  );
  expect(
    findMatches(doc, { query: "cat", matchCase: false, wholeWord: true }),
  ).toHaveLength(2);
});

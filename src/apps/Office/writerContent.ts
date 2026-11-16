const nodes = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "image",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
]);
const marks = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
  "textStyle",
]);

export function validateWriterContent(content: Record<string, unknown>): void {
  let count = 0;
  function visit(value: unknown, depth: number) {
    if (!value || typeof value !== "object" || depth > 50 || ++count > 50_000)
      throw new Error("Invalid or excessively complex Writer content.");
    const node = value as Record<string, unknown>;
    if (typeof node.type !== "string" || !nodes.has(node.type))
      throw new Error("Unsupported Writer element.");
    if (node.type === "text" && typeof node.text !== "string")
      throw new Error("Invalid Writer text.");
    if (node.content !== undefined) {
      if (!Array.isArray(node.content))
        throw new Error("Invalid Writer structure.");
      node.content.forEach((child) => visit(child, depth + 1));
    }
    if (node.marks !== undefined) {
      if (
        !Array.isArray(node.marks) ||
        node.marks.some((mark) => !mark || !marks.has(mark.type))
      )
        throw new Error("Unsupported Writer formatting.");
    }
    if (node.type === "image") {
      const src = (node.attrs as Record<string, unknown> | undefined)?.src;
      if (
        typeof src !== "string" ||
        !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(src)
      )
        throw new Error(
          "Writer images must be embedded PNG, JPEG or WebP files.",
        );
    }
  }
  if ((content.body as Record<string, unknown> | undefined)?.type !== "doc")
    throw new Error("This file has no Writer document body.");
  visit(content.body, 0);
}

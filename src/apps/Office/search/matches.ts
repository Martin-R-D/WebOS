import type { Node } from "@tiptap/pm/model";

export interface SearchOptions {
  query: string;
  matchCase: boolean;
  wholeWord: boolean;
}

export interface SearchMatch {
  from: number;
  to: number;
}

export function findMatches(doc: Node, options: SearchOptions): SearchMatch[] {
  if (!options.query) return [];
  const escaped = options.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(escaped, options.matchCase ? "gu" : "giu");
  const matches: SearchMatch[] = [];
  doc.descendants((node, position) => {
    if (!node.isTextblock) return;
    const text = node.textBetween(0, node.content.size, "", "\ufffc");
    for (const match of text.matchAll(expression)) {
      const start = match.index;
      const end = start + match[0].length;
      const before =
        start > 0
          ? String.fromCodePoint(
              text.codePointAt(
                start - (/[\uDC00-\uDFFF]/.test(text[start - 1]) ? 2 : 1),
              )!,
            )
          : "";
      const after =
        end < text.length ? String.fromCodePoint(text.codePointAt(end)!) : "";
      if (
        options.wholeWord &&
        (/[\p{L}\p{N}_]/u.test(before) || /[\p{L}\p{N}_]/u.test(after))
      )
        continue;
      matches.push({ from: position + 1 + start, to: position + 1 + end });
    }
    return false;
  });
  return matches;
}

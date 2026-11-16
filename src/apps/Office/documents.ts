export type OfficeKind = "writer" | "slides" | "sheets";

export interface OfficeDocument {
  format: "webos-office";
  version: 1;
  kind: OfficeKind;
  content: Record<string, unknown>;
}

const extensions: Record<OfficeKind, string> = {
  writer: ".wdoc",
  slides: ".wslides",
  sheets: ".wsheet",
};

export function officeKind(name: string): OfficeKind | undefined {
  return (Object.keys(extensions) as OfficeKind[]).find((kind) =>
    name.toLowerCase().endsWith(extensions[kind]),
  );
}

export function documentName(name: string, kind: OfficeKind): string {
  const trimmed = name.trim();
  if (!trimmed || /[/\\\u0000-\u001f]/.test(trimmed)) {
    throw new Error("Enter a file name without slashes or control characters.");
  }
  if (officeKind(trimmed) && officeKind(trimmed) !== kind) {
    throw new Error("Choose a file extension for this app.");
  }
  return trimmed.toLowerCase().endsWith(extensions[kind])
    ? trimmed
    : trimmed + extensions[kind];
}

export function encodeDocument(
  kind: OfficeKind,
  content: Record<string, unknown>,
): string {
  return JSON.stringify({ format: "webos-office", version: 1, kind, content });
}

export function decodeDocument(raw: string, kind: OfficeKind): OfficeDocument {
  if (raw.length > 4_000_000) {
    throw new Error("This document exceeds the 4 MB opening limit.");
  }
  let value: OfficeDocument;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("This file is not a valid Office document.");
  }
  if (
    !value ||
    value.format !== "webos-office" ||
    value.version !== 1 ||
    value.kind !== kind ||
    !value.content ||
    typeof value.content !== "object" ||
    Array.isArray(value.content)
  ) {
    throw new Error("This document type or version is not supported.");
  }
  return value;
}

export function downloadDocument(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { openFsNode } from "../../lib/openNode";
import { decodeDocument, documentName, officeKind } from "./documents";
import type { OfficeKind } from "./documents";
import { validateWriterContent } from "./writerContent";
import { validateSlidesContent } from "./slidesModel";
import { validateWorkbook } from "./sheets/model";

export async function importOfficeFile(
  file: File,
  expectedKind?: OfficeKind,
): Promise<string> {
  const kind = officeKind(file.name);
  if (!kind || (expectedKind && kind !== expectedKind))
    throw new Error("Choose a native document for this app.");
  if (file.size > 4_000_000)
    throw new Error("Import files must be smaller than 4 MB.");
  const name = documentName(file.name, kind);
  const raw = await file.text();
  const content = decodeDocument(raw, kind).content;
  ({
    writer: validateWriterContent,
    slides: validateSlidesContent,
    sheets: validateWorkbook,
  })[kind](content);
  const fs = useFileSystemStore.getState();
  const previousNodes = fs.nodes;
  let id: string;
  try {
    id = fs.createNode(fs.rootId, name, "file", raw);
    if (!id)
      throw new Error(
        "A file with this name already exists in the root folder.",
      );
  } catch (cause) {
    try {
      useFileSystemStore.setState({ nodes: previousNodes });
    } catch {
      /* The original imported file remains on the user's device. */
    }
    throw cause;
  }
  openFsNode(useFileSystemStore.getState().nodes[id]);
  return id;
}

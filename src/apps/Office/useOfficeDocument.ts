import { useEffect, useRef, useState } from "react";
import type { AppProps } from "../../types";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { useRecentFilesStore } from "../../stores/useRecentFilesStore";
import { registerCloseGuard } from "../../lib/windowCloseGuard";
import { decodeDocument, documentName, encodeDocument } from "./documents";
import type { OfficeKind } from "./documents";
import { listRecovery, removeRecovery, saveRecovery } from "./recovery";

export function useOfficeDocument(
  kind: OfficeKind,
  props: AppProps,
  initial: Record<string, unknown>,
  validate?: (content: Record<string, unknown>) => void,
) {
  const [fileId, setFileId] = useState<string | null>(
    typeof props.launchProps?.fileId === "string"
      ? props.launchProps.fileId
      : null,
  );
  const node = useFileSystemStore((state) =>
    fileId ? state.nodes[fileId] : undefined,
  );
  const [name, setName] = useState(documentName("Untitled", kind));
  const [loaded] = useState(() => {
    try {
      if (!fileId) return { content: initial, error: "" };
      const file = useFileSystemStore.getState().nodes[fileId];
      if (!file) throw new Error("This file no longer exists.");
      const parsed = decodeDocument(file.content ?? "", kind).content;
      validate?.(parsed);
      return { content: parsed, error: "" };
    } catch (cause) {
      return {
        content: initial,
        error:
          cause instanceof Error ? cause.message : "Unable to open document.",
      };
    }
  });
  const [error, setError] = useState(loaded.error);
  const loadFailed = useRef(Boolean(loaded.error));
  const [content, setContent] = useState<Record<string, unknown>>(
    loaded.content,
  );
  const [saved, setSaved] = useState(() => encodeDocument(kind, content));
  const [showSave, setShowSave] = useState(false);
  const [closing, setClosing] = useState(false);
  const [drafts, setDrafts] = useState(() =>
    listRecovery(kind).filter((draft) => !fileId || draft.fileId === fileId),
  );
  const recoveryKey = useRef(props.windowId);
  const closeAfterSave = useRef(false);
  const serialized = encodeDocument(kind, content);
  const dirty = serialized !== saved;
  const title = node?.name ?? name;

  useEffect(() => {
    useWindowStore
      .getState()
      .setTitle(props.windowId, `${title}${dirty ? " •" : ""}`);
  }, [title, dirty, props.windowId]);

  useEffect(
    () =>
      registerCloseGuard(props.windowId, () => {
        if (!dirty) return true;
        setClosing(true);
        return false;
      }),
    [dirty, props.windowId],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    const timer = window.setTimeout(() => {
      try {
        saveRecovery({
          key: recoveryKey.current,
          name: title,
          fileId,
          document: serialized,
          updatedAt: Date.now(),
        });
      } catch {
        setError(
          "Recovery storage is full. Save or download your document to preserve it.",
        );
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty, serialized, title, fileId]);

  function finishSave(id: string, nextName: string) {
    setFileId(id);
    setName(nextName);
    setSaved(serialized);
    setShowSave(false);
    setError("");
    removeRecovery(recoveryKey.current);
    useWindowStore.getState().bindFile(props.windowId, id);
    useRecentFilesStore.getState().record(id);
    if (closeAfterSave.current) {
      setClosing(false);
      // Close after React updates the guard to the saved state.
      setTimeout(
        () => useWindowStore.getState().closeWindow(props.windowId),
        0,
      );
    }
  }

  function save(
    folderId?: string,
    requestedName?: string,
    overwriteId?: string,
  ) {
    if (!folderId && (!fileId || !node)) {
      setShowSave(true);
      return;
    }
    if (loadFailed.current) {
      setError(
        "This file could not be opened. Create a new document to continue safely.",
      );
      return;
    }
    const fs = useFileSystemStore.getState();
    const previousNodes = fs.nodes;
    try {
      if (
        overwriteId &&
        requestedName !== documentName(requestedName ?? "", kind)
      ) {
        throw new Error(
          "Choose a file with the correct Office extension to overwrite.",
        );
      }
      const nextName = requestedName
        ? documentName(requestedName, kind)
        : title;
      if (serialized.length > 4_000_000)
        throw new Error(
          "Document exceeds the 4 MB limit. Reduce image sizes or download it.",
        );
      const id = folderId
        ? (overwriteId ?? fs.createNode(folderId, nextName, "file", serialized))
        : fileId!;
      if (!id) throw new Error("A file with this name already exists.");
      if (!folderId || overwriteId) fs.updateContent(id, serialized);
      finishSave(id, nextName);
    } catch (cause) {
      // Zustand updates memory before persistence; restore the last saved state on failure.
      try {
        useFileSystemStore.setState({ nodes: previousNodes });
      } catch {
        /* Keep the edited document available for download. */
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save this document.",
      );
      closeAfterSave.current = false;
    }
  }

  return {
    content,
    setContent,
    title,
    dirty,
    error,
    setError,
    showSave,
    cancelSave() {
      closeAfterSave.current = false;
      setShowSave(false);
    },
    setShowSave,
    closing,
    setClosing,
    drafts,
    serialized,
    save,
    recover(key: string) {
      const draft = drafts.find((item) => item.key === key);
      if (!draft) return;
      const parsed = decodeDocument(draft.document, kind).content;
      try {
        validate?.(parsed);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Invalid recovery content.",
        );
        return;
      }
      loadFailed.current = false;
      setContent(parsed);
      setFileId(draft.fileId);
      setName(draft.name);
      recoveryKey.current = draft.key;
      setDrafts([]);
    },
    dismissDrafts() {
      setDrafts([]);
    },
    discardDrafts() {
      drafts.forEach((draft) => removeRecovery(draft.key));
      setDrafts([]);
    },
    saveAndClose() {
      closeAfterSave.current = true;
      save();
    },
    discardAndClose() {
      removeRecovery(recoveryKey.current);
      setSaved(serialized);
      setClosing(false);
      setTimeout(
        () => useWindowStore.getState().closeWindow(props.windowId),
        0,
      );
    },
  };
}

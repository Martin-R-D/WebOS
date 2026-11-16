import { validateWriterContent } from "./writerContent";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import type { AppProps } from "../../types";
import { useOfficeDocument } from "./useOfficeDocument";
import { OfficeFrame } from "./OfficeFrame";
import { downloadDocument } from "./documents";
import { Modal } from "../../shell/Modal/Modal";

const empty = { type: "doc", content: [{ type: "paragraph" }] };

export function Writer(props: AppProps) {
  const doc = useOfficeDocument(
    "writer",
    props,
    { body: empty },
    validateWriterContent,
  );
  const { content, setError } = doc;
  const imageInput = useRef<HTMLInputElement>(null);
  const textInput = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit,
      Image.configure({ allowBase64: true, inline: true }),
    ],
    content: doc.content.body ?? empty,
    editorProps: {
      attributes: {
        "aria-label": "Document content",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) =>
      doc.setContent({ body: current.getJSON() }),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold"),
      italic: current?.isActive("italic"),
      underline: current?.isActive("underline"),
      block: current?.getAttributes("heading").level?.toString() ?? "paragraph",
      font: current?.getAttributes("textStyle").fontFamily ?? "Arial",
      size: current?.getAttributes("textStyle").fontSize ?? "16px",
      text: current?.getText() ?? "",
    }),
  });

  useEffect(() => {
    if (
      !editor ||
      JSON.stringify(editor.getJSON()) === JSON.stringify(content.body)
    )
      return;
    try {
      editor.commands.setContent(content.body ?? empty, {
        emitUpdate: false,
        errorOnInvalidContent: true,
      });
    } catch {
      setError("This document contains unsupported Writer content.");
    }
  }, [editor, content, setError]);

  if (!editor) return null;

  function print() {
    const frame = document.createElement("iframe");
    frame.hidden = true;
    document.body.append(frame);
    const target = frame.contentDocument;
    if (!target) {
      frame.remove();
      return;
    }
    target.open();
    target.write(
      `<!doctype html><html><head><title>Writer</title><style>body{font:12pt serif;margin:20mm}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:6px}</style></head><body>${editor!.getHTML()}</body></html>`,
    );
    target.close();
    setTimeout(() => {
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 300);
  }

  return (
    <OfficeFrame
      kind="writer"
      document={doc}
      extra={
        <>
          <button
            onClick={() =>
              downloadDocument(
                doc.title + ".txt",
                editor.getText(),
                "text/plain",
              )
            }
          >
            Export text
          </button>
          <button
            onClick={() =>
              downloadDocument(
                doc.title + ".html",
                `<!doctype html><meta charset="utf-8">${editor.getHTML()}`,
                "text/html",
              )
            }
          >
            Export HTML
          </button>
          <button onClick={print}>Print</button>
          <button onClick={() => textInput.current?.click()}>
            Import text
          </button>
        </>
      }
    >
      <div
        className="office__toolbar"
        aria-label="Formatting"
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest("button"))
            event.preventDefault();
        }}
      >
        <button
          aria-pressed={state?.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          aria-pressed={state?.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          aria-pressed={state?.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          Underline
        </button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()}>
          Strikethrough
        </button>
        <select
          aria-label="Paragraph style"
          value={state?.block ?? "paragraph"}
          onChange={(event) => {
            if (event.target.value === "paragraph")
              editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: Number(event.target.value) as 1 | 2 | 3,
                })
                .run();
          }}
        >
          <option value="paragraph">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        <select
          aria-label="Font"
          value={state?.font ?? "Arial"}
          onChange={(event) =>
            editor.chain().focus().setFontFamily(event.target.value).run()
          }
        >
          <option>Arial</option>
          <option>Georgia</option>
          <option>Courier New</option>
        </select>
        <select
          aria-label="Font size"
          value={state?.size ?? "16px"}
          onChange={(event) =>
            editor.chain().focus().setFontSize(event.target.value).run()
          }
        >
          {[12, 14, 16, 20, 24, 32, 48].map((size) => (
            <option key={size} value={`${size}px`}>
              {size}
            </option>
          ))}
        </select>
        <label>
          Text color{" "}
          <input
            aria-label="Text color"
            type="color"
            onChange={(event) =>
              editor.chain().focus().setColor(event.target.value).run()
            }
          />
        </label>
        <label>
          Highlight{" "}
          <input
            aria-label="Highlight color"
            type="color"
            defaultValue="#ffff00"
            onChange={(event) =>
              editor
                .chain()
                .focus()
                .setBackgroundColor(event.target.value)
                .run()
            }
          />
        </label>
        {(["left", "center", "right"] as const).map((align) => (
          <button
            key={align}
            onClick={() => editor.chain().focus().setTextAlign(align).run()}
          >
            {align}
          </button>
        ))}
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Bullets
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered list
        </button>
        <button
          onClick={() => {
            setLink(editor.getAttributes("link").href ?? "");
            setLinkOpen(true);
          }}
        >
          Link
        </button>
        <button onClick={() => imageInput.current?.click()}>Image</button>
        <label>
          Image width
          <select
            aria-label="Image width"
            defaultValue="320"
            onChange={(event) =>
              editor
                .chain()
                .focus()
                .updateAttributes("image", {
                  width: Number(event.target.value),
                  height: null,
                })
                .run()
            }
          >
            <option value="160">Small</option>
            <option value="320">Medium</option>
            <option value="640">Large</option>
          </select>
        </label>
        <button
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          Table
        </button>
        <button
          disabled={!editor.can().addRowAfter()}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          Add row
        </button>
        <button
          disabled={!editor.can().addColumnAfter()}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          Add column
        </button>
        <button
          disabled={!editor.can().deleteRow()}
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          Delete row
        </button>
        <button
          disabled={!editor.can().deleteColumn()}
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          Delete column
        </button>
        <button
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          Undo
        </button>
        <button
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          Redo
        </button>
      </div>
      <div className="writer__surface">
        <EditorContent editor={editor} />
      </div>
      <footer>
        {state?.text.trim().split(/\s+/).filter(Boolean).length ?? 0} words ·{" "}
        {state?.text.length ?? 0} characters
      </footer>
      <input
        hidden
        type="file"
        ref={imageInput}
        accept="image/png,image/jpeg,image/webp"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (
            !/^image\/(png|jpeg|webp)$/.test(file.type) ||
            file.size > 500_000
          ) {
            doc.setError(
              "Choose a PNG, JPEG or WebP image smaller than 500 KB.",
            );
            return;
          }
          const reader = new FileReader();
          reader.onload = () =>
            editor
              .chain()
              .focus()
              .setImage({ src: String(reader.result), alt: file.name })
              .run();
          reader.readAsDataURL(file);
          event.target.value = "";
        }}
      />
      <input
        hidden
        type="file"
        ref={textInput}
        accept=".txt"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (file.size > 1_000_000) {
            doc.setError("Text imports must be smaller than 1 MB.");
            return;
          }
          const text = await file.text();
          doc.setContent({
            body: {
              type: "doc",
              content: text.split(/\r?\n/).map((line) => ({
                type: "paragraph",
                content: line ? [{ type: "text", text: line }] : [],
              })),
            },
          });
          event.target.value = "";
        }}
      />
      {linkOpen && (
        <Modal
          className="office__dialog"
          label="Edit link"
          onClose={() => setLinkOpen(false)}
        >
          <label>
            URL{" "}
            <input
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
          </label>
          <button
            onClick={() => {
              if (!/^https?:\/\//i.test(link)) {
                doc.setError("Links must start with https:// or http://.");
                return;
              }
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: link })
                .run();
              setLinkOpen(false);
            }}
          >
            Apply
          </button>
          <button
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setLinkOpen(false);
            }}
          >
            Remove link
          </button>
          <button onClick={() => setLinkOpen(false)}>Cancel</button>
        </Modal>
      )}
    </OfficeFrame>
  );
}

import { useRef, useState } from "react";
import type { AppProps } from "../../types";
import { Modal } from "../../shell/Modal/Modal";
import { useOfficeDocument } from "./useOfficeDocument";
import { useDocumentHistory } from "./useDocumentHistory";
import { OfficeFrame } from "./OfficeFrame";
import { SlideCanvas } from "./SlideCanvas";
import {
  duplicateSlide,
  makeElement,
  makeSlide,
  validateSlidesContent,
} from "./slidesModel";
import type { Slide, SlideElement } from "./slidesModel";
import "./Slides.css";

export function Slides(props: AppProps) {
  const [initial] = useState(() => ({ slides: [makeSlide()] }));
  const doc = useOfficeDocument(
    "slides",
    props,
    initial,
    validateSlidesContent,
  );
  const history = useDocumentHistory(doc.content, doc.setContent);
  const slides = doc.content.slides as unknown as Slide[];
  const [activeId, setActiveId] = useState(slides[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const index = Math.max(
    0,
    slides.findIndex((slide) => slide.id === activeId),
  );
  const active = slides[index];
  const selected = active.elements.find((element) => element.id === selectedId);

  function updateSlides(next: Slide[]) {
    history.update({ slides: next });
  }

  function updateSlide(next: Slide) {
    updateSlides(
      slides.map((slide) => (slide.id === active.id ? next : slide)),
    );
  }

  function updateElement(next: SlideElement) {
    updateSlide({
      ...active,
      elements: active.elements.map((element) =>
        element.id === next.id ? next : element,
      ),
    });
  }

  function addElement(
    type: SlideElement["type"],
    overrides: Partial<SlideElement> = {},
  ) {
    if (active.elements.length >= 100) {
      doc.setError("A slide can contain up to 100 elements.");
      return;
    }
    const element = makeElement(type, overrides);
    updateSlide({ ...active, elements: [...active.elements, element] });
    setSelectedId(element.id);
  }

  function addSlide(layout: "blank" | "title" | "content") {
    if (slides.length >= 100) {
      doc.setError("A presentation can contain up to 100 slides.");
      return;
    }
    const slide = makeSlide(layout);
    updateSlides([
      ...slides.slice(0, index + 1),
      slide,
      ...slides.slice(index + 1),
    ]);
    setActiveId(slide.id);
    setSelectedId(null);
  }

  function reorder(direction: number) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    updateSlides(next);
  }

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
      `<!doctype html><html><head><title>Slides</title><style>@page{size:landscape;margin:0}body{margin:0}.page{break-after:page;page-break-after:always}svg{width:100%;height:auto;display:block}</style></head><body>${printRef.current?.innerHTML ?? ""}</body></html>`,
    );
    target.close();
    setTimeout(() => {
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 300);
  }

  return (
    <OfficeFrame
      kind="slides"
      document={doc}
      extra={
        <>
          <button
            onClick={() => {
              setActiveId(slides[0].id);
              setPresenting(true);
            }}
          >
            Present from start
          </button>
          <button onClick={() => setPresenting(true)}>
            Present current slide
          </button>
          <button onClick={print}>Print slides</button>
        </>
      }
    >
      <div className="office__toolbar" aria-label="Slide tools">
        <button onClick={() => addSlide("title")}>Add title slide</button>
        <button onClick={() => addSlide("content")}>Add content slide</button>
        <button onClick={() => addSlide("blank")}>Add blank slide</button>
        <button
          disabled={slides.length >= 100}
          onClick={() => {
            const copy = duplicateSlide(active);
            updateSlides([
              ...slides.slice(0, index + 1),
              copy,
              ...slides.slice(index + 1),
            ]);
            setActiveId(copy.id);
          }}
        >
          Duplicate slide
        </button>
        <button
          disabled={slides.length === 1}
          onClick={() => setDeleteOpen(true)}
        >
          Delete slide
        </button>
        <button disabled={index === 0} onClick={() => reorder(-1)}>
          Move slide earlier
        </button>
        <button
          disabled={index === slides.length - 1}
          onClick={() => reorder(1)}
        >
          Move slide later
        </button>
        <button onClick={() => addElement("text")}>Text box</button>
        <button onClick={() => imageInput.current?.click()}>Image</button>
        {(["rectangle", "circle", "line"] as const).map((type) => (
          <button key={type} onClick={() => addElement(type)}>
            {type}
          </button>
        ))}
        <button disabled={!history.canUndo} onClick={history.undo}>
          Undo
        </button>
        <button disabled={!history.canRedo} onClick={history.redo}>
          Redo
        </button>
      </div>
      <div className="slides__workspace">
        <nav className="slides__navigator" aria-label="Slides">
          {slides.map((slide, position) => (
            <button
              key={slide.id}
              aria-label={`Slide ${position + 1}`}
              aria-current={slide.id === active.id ? "true" : undefined}
              onClick={() => {
                setActiveId(slide.id);
                setSelectedId(null);
              }}
            >
              <SlideCanvas slide={slide} />
              <span>{position + 1}</span>
            </button>
          ))}
        </nav>
        <div className="slides__editor">
          <SlideCanvas
            slide={active}
            selected={selectedId}
            onSelect={setSelectedId}
            onChange={updateElement}
          />
          <label>
            Slide background{" "}
            <input
              aria-label="Slide background"
              type="color"
              value={active.background}
              onChange={(event) =>
                updateSlide({ ...active, background: event.target.value })
              }
            />
          </label>
          <select
            aria-label="Select element"
            value={selected?.id ?? ""}
            onChange={(event) => setSelectedId(event.target.value || null)}
          >
            <option value="">Choose an element</option>
            {active.elements.map((element, position) => (
              <option key={element.id} value={element.id}>
                {position + 1}. {element.type}: {element.text.slice(0, 30)}
              </option>
            ))}
          </select>
          {selected && (
            <div className="slides__properties" aria-label="Element properties">
              {selected.type === "text" && (
                <>
                  <label>
                    Text{" "}
                    <textarea
                      aria-label="Element text"
                      value={selected.text}
                      maxLength={20_000}
                      onChange={(event) =>
                        updateElement({ ...selected, text: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Font size{" "}
                    <input
                      aria-label="Element font size"
                      type="number"
                      min="8"
                      max="200"
                      key={`${selected.id}-${selected.fontSize}`}
                      defaultValue={selected.fontSize}
                      onBlur={(event) =>
                        updateElement({
                          ...selected,
                          fontSize: Math.max(
                            8,
                            Math.min(200, Number(event.target.value)),
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Text color{" "}
                    <input
                      aria-label="Element text color"
                      type="color"
                      value={selected.color}
                      onChange={(event) =>
                        updateElement({
                          ...selected,
                          color: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button
                    aria-pressed={selected.bold}
                    onClick={() =>
                      updateElement({ ...selected, bold: !selected.bold })
                    }
                  >
                    Bold
                  </button>
                  <select
                    aria-label="Element alignment"
                    value={selected.align}
                    onChange={(event) =>
                      updateElement({
                        ...selected,
                        align: event.target.value as SlideElement["align"],
                      })
                    }
                  >
                    {["left", "center", "right"].map((align) => (
                      <option key={align}>{align}</option>
                    ))}
                  </select>
                </>
              )}
              {selected.type !== "image" && selected.type !== "text" && (
                <label>
                  Fill{" "}
                  <input
                    aria-label="Element fill"
                    type="color"
                    value={selected.fill}
                    onChange={(event) =>
                      updateElement({ ...selected, fill: event.target.value })
                    }
                  />
                </label>
              )}
              {(["x", "y", "width", "height"] as const).map((key) => (
                <label key={key}>
                  {key}
                  <input
                    aria-label={`Element ${key}`}
                    type="number"
                    min={key === "width" || key === "height" ? 20 : 0}
                    key={`${selected.id}-${key}-${selected[key]}`}
                    defaultValue={Math.round(selected[key])}
                    onBlur={(event) => {
                      const limit =
                        key === "x"
                          ? 1280 - selected.width
                          : key === "y"
                            ? 720 - selected.height
                            : key === "width"
                              ? 1280 - selected.x
                              : 720 - selected.y;
                      updateElement({
                        ...selected,
                        [key]: Math.max(
                          key === "width" || key === "height" ? 20 : 0,
                          Math.min(limit, Number(event.target.value)),
                        ),
                      });
                    }}
                  />
                </label>
              ))}
              <button
                disabled={active.elements.length >= 100}
                onClick={() =>
                  addElement(selected.type, {
                    ...selected,
                    id: crypto.randomUUID(),
                    x: Math.min(1280 - selected.width, selected.x + 20),
                    y: Math.min(720 - selected.height, selected.y + 20),
                  })
                }
              >
                Duplicate element
              </button>
              <button
                onClick={() =>
                  updateSlide({
                    ...active,
                    elements: [
                      ...active.elements.filter(
                        (element) => element.id !== selected.id,
                      ),
                      selected,
                    ],
                  })
                }
              >
                Bring to front
              </button>
              <button
                onClick={() =>
                  updateSlide({
                    ...active,
                    elements: [
                      selected,
                      ...active.elements.filter(
                        (element) => element.id !== selected.id,
                      ),
                    ],
                  })
                }
              >
                Send to back
              </button>
              <button
                onClick={() => {
                  updateSlide({
                    ...active,
                    elements: active.elements.filter(
                      (element) => element.id !== selected.id,
                    ),
                  });
                  setSelectedId(null);
                }}
              >
                Delete element
              </button>
            </div>
          )}
        </div>
      </div>
      <footer>
        Slide {index + 1} of {slides.length}
      </footer>
      <input
        hidden
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
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
            addElement("image", {
              src: String(reader.result),
              text: "",
              width: 480,
              height: 320,
            });
          reader.readAsDataURL(file);
          event.target.value = "";
        }}
      />
      {deleteOpen && (
        <Modal
          className="office__dialog"
          label="Delete slide"
          onClose={() => setDeleteOpen(false)}
        >
          <p>Delete slide {index + 1}?</p>
          <button
            onClick={() => {
              updateSlides(slides.filter((slide) => slide.id !== active.id));
              setActiveId(slides[index === 0 ? 1 : index - 1].id);
              setSelectedId(null);
              setDeleteOpen(false);
            }}
          >
            Delete
          </button>
          <button onClick={() => setDeleteOpen(false)}>Cancel</button>
        </Modal>
      )}
      {presenting && (
        <Modal
          className="slides__presentation"
          label="Presentation"
          onClose={() => setPresenting(false)}
        >
          <SlideCanvas slide={active} />
          <div className="office__toolbar">
            <button
              disabled={index === 0}
              onClick={() => setActiveId(slides[index - 1].id)}
            >
              Previous
            </button>
            <span>
              Slide {index + 1} of {slides.length}
            </span>
            <button
              disabled={index === slides.length - 1}
              onClick={() => setActiveId(slides[index + 1].id)}
            >
              Next
            </button>
            <button
              onClick={(event) => {
                event.currentTarget
                  .closest("dialog")
                  ?.requestFullscreen?.()
                  .catch(() =>
                    doc.setError("Fullscreen is unavailable in this browser."),
                  );
              }}
            >
              Fullscreen
            </button>
            <button
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                setPresenting(false);
              }}
            >
              Exit presentation
            </button>
          </div>
        </Modal>
      )}
      <div hidden ref={printRef}>
        {slides.map((slide) => (
          <div className="page" key={slide.id}>
            <SlideCanvas slide={slide} />
          </div>
        ))}
      </div>
    </OfficeFrame>
  );
}

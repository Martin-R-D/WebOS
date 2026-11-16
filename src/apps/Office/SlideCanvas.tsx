import { useRef } from "react";
import type { PointerEvent } from "react";
import type { Slide, SlideElement } from "./slidesModel";

export function SlideCanvas({
  slide,
  selected,
  onSelect,
  onChange,
}: {
  slide: Slide;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (element: SlideElement) => void;
}) {
  const drag = useRef<{
    element: SlideElement;
    x: number;
    y: number;
    resize: boolean;
    next: SlideElement;
  } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  function begin(
    event: PointerEvent<SVGElement>,
    element: SlideElement,
    resize = false,
  ) {
    if (!onChange || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(element.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      element,
      x: event.clientX,
      y: event.clientY,
      resize,
      next: element,
    };
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const current = drag.current;
    const bounds = svg.current?.getBoundingClientRect();
    if (!current || !bounds) return;
    const dx = ((event.clientX - current.x) * 1280) / bounds.width;
    const dy = ((event.clientY - current.y) * 720) / bounds.height;
    current.next = current.resize
      ? {
          ...current.element,
          width: Math.max(
            20,
            Math.min(1280 - current.element.x, current.element.width + dx),
          ),
          height: Math.max(
            20,
            Math.min(720 - current.element.y, current.element.height + dy),
          ),
        }
      : {
          ...current.element,
          x: Math.max(
            0,
            Math.min(1280 - current.element.width, current.element.x + dx),
          ),
          y: Math.max(
            0,
            Math.min(720 - current.element.height, current.element.y + dy),
          ),
        };
    // Preview the gesture without adding every pointer movement to undo history.
    const group = svg.current?.querySelector<SVGGElement>(
      `[data-element="${current.element.id}"]`,
    );
    if (group)
      group.setAttribute(
        "transform",
        current.resize
          ? `translate(${current.element.x} ${current.element.y}) scale(${current.next.width / current.element.width} ${current.next.height / current.element.height}) translate(${-current.element.x} ${-current.element.y})`
          : `translate(${current.next.x - current.element.x} ${current.next.y - current.element.y})`,
      );
  }
  function finish() {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    svg.current
      ?.querySelector(`[data-element="${current.element.id}"]`)
      ?.removeAttribute("transform");
    onChange?.(current.next);
  }
  return (
    <svg
      ref={svg}
      className="slides__canvas"
      viewBox="0 0 1280 720"
      role="img"
      aria-label="Slide canvas"
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={() => {
        const current = drag.current;
        if (current)
          svg.current
            ?.querySelector(`[data-element="${current.element.id}"]`)
            ?.removeAttribute("transform");
        drag.current = null;
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onSelect?.(null);
      }}
    >
      <rect
        width="1280"
        height="720"
        fill={slide.background}
        onPointerDown={() => onSelect?.(null)}
      />
      {slide.elements.map((element) => (
        <g
          key={element.id}
          data-element={element.id}
          onPointerDown={(event) => begin(event, element)}
          style={{ cursor: onChange ? "move" : "default", touchAction: "none" }}
        >
          {element.type === "text" && (
            <foreignObject
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
            >
              <div
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: element.fontSize,
                  fontWeight: element.bold ? "bold" : "normal",
                  textAlign: element.align,
                  color: element.color,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  height: "100%",
                  overflow: "hidden",
                  userSelect: "none",
                }}
              >
                {element.text}
              </div>
            </foreignObject>
          )}
          {element.type === "image" && (
            <image
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              href={element.src}
              preserveAspectRatio="xMidYMid meet"
            />
          )}
          {element.type === "rectangle" && (
            <rect
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              fill={element.fill}
            />
          )}
          {element.type === "circle" && (
            <ellipse
              cx={element.x + element.width / 2}
              cy={element.y + element.height / 2}
              rx={element.width / 2}
              ry={element.height / 2}
              fill={element.fill}
            />
          )}
          {element.type === "line" && (
            <line
              x1={element.x}
              y1={element.y}
              x2={element.x + element.width}
              y2={element.y + element.height}
              stroke={element.fill}
              strokeWidth="6"
            />
          )}
          {selected === element.id && (
            <>
              <rect
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
              />
              <rect
                aria-label="Resize element"
                x={element.x + element.width - 16}
                y={element.y + element.height - 16}
                width="32"
                height="32"
                fill="#2563eb"
                onPointerDown={(event) => begin(event, element, true)}
              />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

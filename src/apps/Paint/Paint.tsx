import { useRef, useState, useEffect } from "react";
import { Paintbrush, Eraser, Undo2, Trash2, Download } from "lucide-react";
import type { AppProps } from "../../types";
import { cx } from "../../lib/helpers";
import "./Paint.css";

const COLORS = [
  "#1a1a2e", "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
  "#1abc9c", "#3498db", "#6c5ce7", "#e84393", "#ffffff",
];

const SIZES = [2, 5, 10, 18];

const CANVAS_W = 1000;
const CANVAS_H = 620;
const MAX_UNDO = 25;

export function Paint({}: AppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const undoStack = useRef<ImageData[]>([]);

  const [color, setColor] = useState(COLORS[7]);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // map pointer position to internal canvas coordinates (canvas is CSS-scaled)
  function toCanvasPoint(e: React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }

  function pushUndo() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    undoStack.current.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    setCanUndo(true);
  }

  function handlePointerDown(e: React.PointerEvent) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pushUndo();
    drawing.current = true;

    const { x, y } = toCanvasPoint(e);
    ctx.strokeStyle = eraser ? "#ffffff" : color;
    ctx.lineWidth = eraser ? size * 2.5 : size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    // dot on single click
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = toCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp() {
    drawing.current = false;
  }

  function undo() {
    const ctx = canvasRef.current?.getContext("2d");
    const prev = undoStack.current.pop();
    if (!ctx || !prev) return;
    ctx.putImageData(prev, 0, 0);
    setCanUndo(undoStack.current.length > 0);
  }

  function clearCanvas() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    pushUndo();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "painting.png";
    a.click();
  }

  return (
    <div className="paint">
      <div className="paint__toolbar">
        <div className="paint__tools">
          <button
            className={cx("paint__tool", !eraser && "paint__tool--active")}
            onClick={() => setEraser(false)}
            title="Brush"
          >
            <Paintbrush size={15} />
          </button>
          <button
            className={cx("paint__tool", eraser && "paint__tool--active")}
            onClick={() => setEraser(true)}
            title="Eraser"
          >
            <Eraser size={15} />
          </button>
        </div>

        <div className="paint__sizes">
          {SIZES.map((s) => (
            <button
              key={s}
              className={cx("paint__size", size === s && "paint__size--active")}
              onClick={() => setSize(s)}
              title={`${s}px`}
            >
              <span style={{ width: Math.min(s + 3, 18), height: Math.min(s + 3, 18) }} />
            </button>
          ))}
        </div>

        <div className="paint__colors">
          {COLORS.map((c) => (
            <button
              key={c}
              className={cx("paint__color", color === c && !eraser && "paint__color--active")}
              style={{ background: c }}
              onClick={() => { setColor(c); setEraser(false); }}
              title={c}
            />
          ))}
        </div>

        <div className="paint__actions">
          <button className="paint__tool" onClick={undo} disabled={!canUndo} title="Undo">
            <Undo2 size={15} />
          </button>
          <button className="paint__tool" onClick={clearCanvas} title="Clear">
            <Trash2 size={15} />
          </button>
          <button className="paint__tool" onClick={download} title="Save as PNG">
            <Download size={15} />
          </button>
        </div>
      </div>

      <div className="paint__stage">
        <canvas
          ref={canvasRef}
          className="paint__canvas"
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
}

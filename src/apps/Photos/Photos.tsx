import { AppHeading } from "../shared/AppHeading";
import { Images } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppProps } from "../../types";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { isImageFile, openFsNode } from "../../lib/openNode";
import "./Photos.css";

export function Photos({ launchProps }: AppProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const rootId = useFileSystemStore((state) => state.rootId);
  const initial =
    typeof launchProps?.fileId === "string" ? launchProps.fileId : null;
  const [selected, setSelected] = useState<string | null>(initial);
  const [folder, setFolder] = useState(nodes[initial ?? ""]?.parentId ?? "all");
  const [zoom, setZoom] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [interval, setIntervalSeconds] = useState(5);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const images = useMemo(
    () =>
      Object.values(nodes)
        .filter(
          (node) =>
            node.type === "file" &&
            isImageFile(node.name) &&
            (folder === "all" || node.parentId === folder),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [nodes, folder],
  );
  const current = selected ? nodes[selected] : null;
  const index = images.findIndex((image) => image.id === selected);

  function choose(id: string | null) {
    setSelected(id);
    setZoom(null);
    setFailed(false);
    setMessage("");
  }

  function next(direction: number) {
    if (!images.length) return;
    choose(
      images[(Math.max(0, index) + direction + images.length) % images.length]
        .id,
    );
  }

  useEffect(() => {
    if (!playing || !current || images.length < 2) return;
    const timer = window.setInterval(() => {
      setSelected(images[(Math.max(0, index) + 1) % images.length].id);
      setZoom(null);
      setFailed(false);
    }, interval * 1000);
    return () => window.clearInterval(timer);
  }, [playing, current, images, index, interval]);

  function openPaint() {
    if (!current) return;
    useWindowStore.getState().openWindow({
      appId: "paint",
      title: current.name,
      icon: "Palette",
      width: 900,
      height: 640,
      launchProps: { fileId: current.id },
    });
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await container.current?.requestFullscreen();
    } catch {
      setMessage("Fullscreen is unavailable in this browser.");
    }
  }

  return (
    <div className="photos app-design" ref={container}>
      <AppHeading
        icon={Images}
        title="Photos"
        subtitle="YOUR MOMENTS"
        detail={`${images.length} images`}
      />
      <div className="photos__toolbar">
        <label>
          Folder{" "}
          <select
            aria-label="Photo folder"
            value={folder}
            onChange={(event) => {
              setFolder(event.target.value);
              choose(null);
              setPlaying(false);
            }}
          >
            <option value="all">All images</option>
            {Object.values(nodes)
              .filter((node) => node.type === "folder")
              .map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id === rootId ? "Root" : node.name}
                </option>
              ))}
          </select>
        </label>
        {selected && (
          <button
            onClick={() => {
              choose(null);
              setPlaying(false);
            }}
          >
            Gallery
          </button>
        )}
      </div>
      {selected ? (
        current ? (
          <>
            <div className="photos__toolbar">
              <button disabled={images.length < 2} onClick={() => next(-1)}>
                Previous
              </button>
              <button disabled={images.length < 2} onClick={() => next(1)}>
                Next
              </button>
              <button
                onClick={() =>
                  setZoom((value) => Math.max(0.1, (value ?? 1) - 0.25))
                }
              >
                Zoom out
              </button>
              <button
                onClick={() =>
                  setZoom((value) => Math.min(4, (value ?? 1) + 0.25))
                }
              >
                Zoom in
              </button>
              <button onClick={() => setZoom(null)}>Fit</button>
              <button onClick={() => setZoom(1)}>Actual size</button>
              <button onClick={fullscreen}>Fullscreen</button>
              <button
                disabled={images.length < 2}
                aria-pressed={playing}
                onClick={() => setPlaying(!playing)}
              >
                {playing ? "Stop slideshow" : "Slideshow"}
              </button>
              <label>
                Seconds{" "}
                <select
                  value={interval}
                  onChange={(event) =>
                    setIntervalSeconds(Number(event.target.value))
                  }
                >
                  {[3, 5, 10].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <button onClick={openPaint}>Open in Paint</button>
              <button
                onClick={() => {
                  if (nodes[current.parentId ?? ""])
                    openFsNode(nodes[current.parentId!]);
                }}
              >
                Show in File Explorer
              </button>
            </div>
            <p className="photos__caption">
              {current.name}
              {zoom === null ? " · Fit" : ` · ${Math.round(zoom * 100)}%`}
            </p>
            <div className="photos__viewer">
              {failed ||
              !/^data:image\/(png|jpeg|gif|webp|bmp);base64,/i.test(
                current.content ?? "",
              ) ? (
                <p>Unable to display this image.</p>
              ) : (
                <img
                  key={current.id}
                  src={current.content}
                  alt={current.name}
                  onError={() => {
                    setFailed(true);
                    setPlaying(false);
                  }}
                  style={
                    zoom === null
                      ? {}
                      : { maxWidth: "none", maxHeight: "none", zoom }
                  }
                />
              )}
            </div>
          </>
        ) : (
          <p role="status">
            This image was deleted. Choose Gallery to view other images.
          </p>
        )
      ) : (
        <div className="photos__gallery">
          {!images.length && (
            <p>
              No images in this folder. Save an image in Paint to get started.
            </p>
          )}
          {images.map((image) => (
            <button key={image.id} onClick={() => choose(image.id)}>
              <img src={image.content} alt="" loading="lazy" />
              <span>{image.name}</span>
            </button>
          ))}
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}

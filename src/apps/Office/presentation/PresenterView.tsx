import { useEffect, useState } from "react";
import { Modal } from "../../../shell/Modal/Modal";
import { SlideCanvas } from "../SlideCanvas";
import type { Slide } from "../slidesModel";
import { useAudience } from "./useAudience";
import "./Presentation.css";

export function PresenterView({
  slide,
  next,
  index,
  count,
  onPrevious,
  onNext,
  onClose,
}: {
  slide: Slide;
  next?: Slide;
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const audience = useAudience(slide, index, count);
  useEffect(() => {
    const started = Date.now();
    const interval = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  function close() {
    if (document.fullscreenElement) void document.exitFullscreen();
    onClose();
  }

  return (
    <Modal
      className="slides__presentation presenter"
      label="Presentation"
      onClose={close}
    >
      <SlideCanvas slide={slide} />
      <div className="office__toolbar">
        <button disabled={index === 0} onClick={onPrevious}>
          Previous
        </button>
        <span>
          Slide {index + 1} of {count}
        </span>
        <button disabled={index === count - 1} onClick={onNext}>
          Next
        </button>
        <span aria-label="Elapsed presentation time">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
        <button onClick={audience.open}>
          {audience.connected
            ? "Reopen audience window"
            : "Open audience window"}
        </button>
        <button
          onClick={(event) => {
            void event.currentTarget
              .closest("dialog")
              ?.requestFullscreen?.()
              .catch(() => {});
          }}
        >
          Fullscreen
        </button>
        <button onClick={close}>Exit presentation</button>
      </div>
      {audience.status && <p role="status">{audience.status}</p>}
      <div className="presenter__details">
        <section aria-label="Speaker notes">
          <h2>Speaker notes</h2>
          <p className="presenter__notes">
            {slide.notes || "No notes for this slide."}
          </p>
        </section>
        <section aria-label="Next slide">
          <h2>Next slide</h2>
          {next ? <SlideCanvas slide={next} /> : <p>Last slide</p>}
        </section>
      </div>
    </Modal>
  );
}

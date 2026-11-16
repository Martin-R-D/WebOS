import { useEffect, useState } from "react";
import { SlideCanvas } from "../SlideCanvas";
import { validateSlidesContent } from "../slidesModel";
import type { Slide } from "../slidesModel";
import "./Presentation.css";

export function AudienceView({ session }: { session: string }) {
  const [current, setCurrent] = useState<{
    slide: Slide;
    index: number;
    count: number;
  } | null>(null);
  useEffect(() => {
    if (!/^[a-f0-9-]{36}$/i.test(session) || !window.BroadcastChannel) return;
    const channel = new BroadcastChannel(`webos-presentation:${session}`);
    channel.onmessage = (event) => {
      const message = event.data;
      if (message?.type === "end") {
        window.close();
        return;
      }
      if (
        message?.type !== "slide" ||
        !Number.isInteger(message.index) ||
        !Number.isInteger(message.count) ||
        message.index < 0 ||
        message.count < 1 ||
        message.count > 100 ||
        message.index >= message.count
      )
        return;
      try {
        validateSlidesContent({ slides: [message.slide] });
        setCurrent({
          slide: message.slide,
          index: message.index,
          count: message.count,
        });
      } catch {
        /* Ignore malformed messages rather than replacing a valid slide. */
      }
    };
    channel.postMessage({ type: "ready" });
    return () => channel.close();
  }, [session]);
  return (
    <main className="audience" aria-label="Audience presentation">
      {current ? (
        <>
          <SlideCanvas slide={current.slide} />
          <p>
            Slide {current.index + 1} of {current.count}
          </p>
        </>
      ) : (
        <p>Waiting for the presenter…</p>
      )}
    </main>
  );
}

import { useEffect } from "react";

/** Keep the shell above software keyboards without changing layout breakpoints. */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    function update() {
      // Let browser zoom pan naturally instead of resizing the UI beneath it.
      if (viewport!.scale !== 1) return;
      root.style.setProperty("--viewport-height", `${viewport!.height}px`);
      root.style.setProperty("--viewport-top", `${viewport!.offsetTop}px`);
    }
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--viewport-height");
      root.style.removeProperty("--viewport-top");
    };
  }, []);
}

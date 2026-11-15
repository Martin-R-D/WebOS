import { useSyncExternalStore } from "react";

// Keep in sync with the compact layout media query in mobile.css.
const query = "(max-width: 767px)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(query);
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
}
export function useCompact() {
  return useSyncExternalStore(subscribe, () => window.matchMedia?.(query).matches ?? false, () => false);
}

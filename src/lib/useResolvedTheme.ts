import { useSyncExternalStore } from "react";
import { useSystemStore } from "../stores/useSystemStore";
import type { ThemeName } from "../types";

const query = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(query);
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
}

export function useResolvedTheme(): ThemeName {
  const theme = useSystemStore((state) => state.theme);
  const followSystem = useSystemStore((state) => state.followSystemTheme);
  const dark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? true,
    () => true,
  );
  return followSystem ? (dark ? "dark" : "light") : theme;
}

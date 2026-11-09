"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Hydration-safe media query subscription (server renders `serverValue`). */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

export const FINE_POINTER_MOTION = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

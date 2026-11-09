"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { lockScroll, unlockScroll } from "./scroll";

/**
 * Shared modal behaviour: scroll lock, Escape to close, background made inert
 * (keyboard/screen readers stay inside the overlay), focus moved in and
 * restored to the opener on close.
 */
export function useOverlay(
  active: boolean,
  onClose: () => void,
  options: { initialFocus?: () => HTMLElement | null; inertSelector?: string } = {}
) {
  const onCloseRef = useRef(onClose);
  const initialFocusRef = useRef(options.initialFocus);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    initialFocusRef.current = options.initialFocus;
  });
  const inertSelector = options.inertSelector ?? "[data-page-root], [data-site-footer], [data-concierge-launcher]";

  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    lockScroll();
    const inertEls = Array.from(document.querySelectorAll<HTMLElement>(inertSelector));
    inertEls.forEach((el) => el.setAttribute("inert", ""));

    const focusTimer = window.setTimeout(() => {
      initialFocusRef.current?.()?.focus({ preventScroll: true });
    }, 80);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      inertEls.forEach((el) => el.removeAttribute("inert"));
      unlockScroll();
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [active, inertSelector]);
}

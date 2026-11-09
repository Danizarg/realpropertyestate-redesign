"use client";

import type Lenis from "lenis";
import { ScrollTrigger } from "./gsap";

/**
 * Module-level scroll coordination shared by the smooth-scroll provider,
 * overlays (menu, concierge, gallery viewer) and page transitions.
 */
export const scrollState: { lenis: Lenis | null; locks: number } = { lenis: null, locks: 0 };

export function lockScroll() {
  scrollState.locks += 1;
  if (scrollState.locks === 1) {
    scrollState.lenis?.stop();
    document.documentElement.style.overflow = "hidden";
  }
}

export function unlockScroll() {
  scrollState.locks = Math.max(0, scrollState.locks - 1);
  if (scrollState.locks === 0) {
    document.documentElement.style.overflow = "";
    scrollState.lenis?.start();
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }
}

export function scrollToTop(immediate = true) {
  if (scrollState.lenis) scrollState.lenis.scrollTo(0, { immediate, force: true });
  window.scrollTo({ top: 0, behavior: immediate ? "instant" : "smooth" });
}

export function scrollToElement(target: string | HTMLElement, offset = -96) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (scrollState.lenis) {
    scrollState.lenis.scrollTo(el, { offset, duration: 1.4 });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
}

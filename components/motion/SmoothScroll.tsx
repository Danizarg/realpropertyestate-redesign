"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";
import { scrollState } from "./scroll";
import { prefersReducedMotion } from "@/lib/experience";

/**
 * Tuned smooth scrolling (desktop wheel/trackpad only — touch keeps native
 * momentum), driven from GSAP's ticker so ScrollTrigger and Lenis share one
 * frame loop. Disabled entirely for reduced-motion users.
 */
export default function SmoothScroll() {
  useEffect(() => {
    let refreshTimer = 0;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    };
    document.fonts?.ready.then(scheduleRefresh).catch(() => {});
    window.addEventListener("load", scheduleRefresh);

    if (prefersReducedMotion()) {
      return () => {
        window.removeEventListener("load", scheduleRefresh);
      };
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1,
    });
    scrollState.lenis = lenis;
    if (scrollState.locks > 0) lenis.stop();

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      window.removeEventListener("load", scheduleRefresh);
      window.clearTimeout(refreshTimer);
      gsap.ticker.remove(tick);
      lenis.destroy();
      scrollState.lenis = null;
    };
  }, []);

  return null;
}

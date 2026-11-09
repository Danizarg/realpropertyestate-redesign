"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "./gsap";
import { useMediaQuery, FINE_POINTER_MOTION } from "@/lib/use-media-query";

/**
 * A contextual cursor label that appears only over elements marked
 * data-cursor="View" (property imagery, galleries). The native cursor stays.
 */
export default function CursorFollower() {
  const ref = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const enabled = useMediaQuery(FINE_POINTER_MOTION);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.55, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.55, ease: "power3.out" });
    let current = "";
    const onMove = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor]");
      const next = target?.dataset.cursor ?? "";
      if (next !== current) {
        current = next;
        if (next) setLabel(next);
        gsap.to(el, { scale: next ? 1 : 0, opacity: next ? 1 : 0, duration: 0.5, ease: "expo.out" });
      }
    };
    const onLeave = () => {
      current = "";
      gsap.to(el, { scale: 0, opacity: 0, duration: 0.4 });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[90] -ml-11 -mt-11 w-22 h-22 rounded-full flex items-center justify-center bg-ivory/90 text-ink micro-sm backdrop-blur-sm"
      style={{ width: "5.5rem", height: "5.5rem", transform: "scale(0)", opacity: 0 }}
    >
      {label}
    </div>
  );
}

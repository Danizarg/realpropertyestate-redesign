"use client";

import { useRef } from "react";
import { gsap, useIsoLayoutEffect } from "./gsap";
import { prefersReducedMotion } from "@/lib/experience";

/**
 * Depth-based parallax for an image layer. The child is over-scaled slightly
 * and drifts against the scroll direction. Transform-only (GPU friendly).
 */
export function Parallax({
  children,
  amount = 12,
  scale = 1.18,
  className = "absolute inset-0",
  reveal = false,
}: {
  children: React.ReactNode;
  /** Percent of travel across the element's scroll through the viewport. */
  amount?: number;
  scale?: number;
  className?: string;
  /** Also play a masked reveal the first time it enters view. */
  reveal?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const w = wrap.current;
    const i = inner.current;
    if (!w || !i) return;
    if (prefersReducedMotion()) {
      gsap.set(w, { clipPath: "none" });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        i,
        { yPercent: -amount / 2, scale },
        {
          yPercent: amount / 2,
          scale,
          ease: "none",
          scrollTrigger: { trigger: w, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
      if (reveal) {
        gsap.fromTo(
          w,
          { clipPath: "inset(100% 0% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.8,
            ease: "expo.inOut",
            scrollTrigger: { trigger: w, start: "top 85%", once: true },
          }
        );
      }
    }, w);
    return () => ctx.revert();
  }, [amount, scale, reveal]);

  return (
    <div ref={wrap} className={className} style={{ overflow: "hidden" }} data-parallax-reveal={reveal ? "" : undefined}>
      <div ref={inner} className="absolute inset-0 will-change-transform">
        {children}
      </div>
    </div>
  );
}

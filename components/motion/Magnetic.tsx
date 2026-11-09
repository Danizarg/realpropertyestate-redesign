"use client";

import { useEffect, useRef } from "react";
import { gsap } from "./gsap";
import { hasFinePointer, prefersReducedMotion } from "@/lib/experience";

/** Restrained magnetic attraction for primary controls (fine pointers only). */
export function Magnetic({
  children,
  strength = 0.22,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(Math.max(-14, Math.min(14, dx * strength)));
      yTo(Math.max(-10, Math.min(10, dy * strength)));
    };
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: "elastic.out(1, 0.45)" });
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [strength]);

  return (
    <span ref={ref} className={className ?? "inline-flex"}>
      {children}
    </span>
  );
}

/** Button label that rolls to a duplicate on hover (pairs with .btn styles). */
export function RollLabel({ children }: { children: string }) {
  return (
    <span className="btn-label">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  );
}

export function Arrow({ className = "w-4 h-4", direction = "right" }: { className?: string; direction?: "right" | "left" | "up" | "down" | "up-right" }) {
  const rotate = { right: 0, down: 90, left: 180, up: -90, "up-right": -45 }[direction];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path d="M3 12h17M14 6l6 6-6 6" strokeLinecap="square" />
    </svg>
  );
}

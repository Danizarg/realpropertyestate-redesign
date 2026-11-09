"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/experience";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  state: OrbState;
  /** 0–1 live level (microphone or voice analyser). */
  levelRef: React.MutableRefObject<number>;
  /** Momentary pulses (one per spoken word). */
  pulseRef: React.MutableRefObject<number>;
  className?: string;
}

/**
 * Fluid concierge presence: layered, slowly deforming rings drawn on a 2D
 * canvas. Amplitude follows the live level; speech adds word pulses; thinking
 * spins a fine orbit. Rendering pauses when hidden.
 */
export default function ConciergeOrb({ state, levelRef, pulseRef, className }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    let raf = 0;
    let t = 0;
    let energy = 0;
    let spin = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.round(width * dpr));
      cv.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(cv);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      const { width: w, height: h } = cv.getBoundingClientRect();
      const s = stateRef.current;
      const speed = reduced ? 0.15 : 1;
      t += 0.012 * speed;

      // Target energy per state + live level + decaying word pulses
      pulseRef.current *= 0.9;
      const base = s === "idle" ? 0.12 : s === "thinking" ? 0.28 : s === "listening" ? 0.2 : 0.3;
      const target = base + levelRef.current * 0.9 + pulseRef.current * 0.6;
      energy += (target - energy) * 0.12;
      spin += (s === "thinking" ? 0.045 : 0.006) * speed;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.27;

      // Core glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (1.9 + energy));
      glow.addColorStop(0, `rgba(197,177,138,${0.32 + energy * 0.25})`);
      glow.addColorStop(0.45, "rgba(197,177,138,0.08)");
      glow.addColorStop(1, "rgba(197,177,138,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Deforming rings
      const rings = 5;
      for (let r = 0; r < rings; r++) {
        ctx.beginPath();
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const wobble =
            Math.sin(a * 3 + t * (1.2 + r * 0.3) + r) * 0.06 +
            Math.sin(a * 5 - t * (0.8 + r * 0.2) + r * 2) * 0.035 +
            Math.sin(a * 2 + t * 0.6 - r) * 0.04;
          const rad = R * (0.82 + r * 0.07) * (1 + wobble * (0.6 + energy * 2.4));
          const x = cx + Math.cos(a + spin * (r % 2 ? 1 : -1)) * rad;
          const y = cy + Math.sin(a + spin * (r % 2 ? 1 : -1)) * rad;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = r === 0 ? `rgba(245,242,235,${0.5 + energy * 0.3})` : `rgba(197,177,138,${0.42 - r * 0.06})`;
        ctx.lineWidth = r === 0 ? 1.2 : 0.8;
        ctx.stroke();
      }

      // Thinking orbit
      if (s === "thinking") {
        for (let p = 0; p < 3; p++) {
          const a = spin * 3 + (p * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * R * 1.35, cy + Math.sin(a) * R * 1.35, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(245,242,235,0.85)";
          ctx.fill();
        }
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [levelRef, pulseRef]);

  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}

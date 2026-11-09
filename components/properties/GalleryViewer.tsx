"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "@/components/motion/gsap";
import { useOverlay } from "@/components/motion/useOverlay";
import { Arrow } from "@/components/motion/Magnetic";
import { CloseIcon } from "@/components/site/SocialIcons";
import { prefersReducedMotion } from "@/lib/experience";
import type { PropertyImage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  images: PropertyImage[];
  name: string;
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}

/** Fullscreen image viewer: keyboard, swipe, thumbnails, neighbour preloading. */
export default function GalleryViewer({ images, name, index, onIndex, onClose }: Props) {
  const open = index !== null;
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const dir = useRef(1);
  const [mounted, setMounted] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useOverlay(open && mounted, onClose, {
    initialFocus: () => closeBtn.current,
    inertSelector: "header, [data-page-root], [data-concierge-launcher]",
  });

  if (open && !mounted) setMounted(true);

  useEffect(() => {
    const el = root.current;
    if (!el || !mounted) return;
    const reduced = prefersReducedMotion();
    if (open) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.01 : 0.5, ease: "power2.out" });
    } else {
      gsap.to(el, { opacity: 0, duration: reduced ? 0.01 : 0.35, ease: "power2.in", onComplete: () => setMounted(false) });
    }
  }, [open, mounted]);

  const go = (delta: number) => {
    if (index === null || images.length < 2) return;
    dir.current = delta;
    onIndex((index + delta + images.length) % images.length);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Home") onIndex(0);
      else if (e.key === "End") onIndex(images.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Image entrance + keep the active thumbnail in view + preload neighbours
  useEffect(() => {
    if (index === null) return;
    const img = stage.current?.querySelector("[data-viewer-image]");
    if (img && !prefersReducedMotion()) {
      gsap.fromTo(img, { opacity: 0, x: 70 * dir.current }, { opacity: 1, x: 0, duration: 0.8, ease: "expo.out" });
    }
    thumbs.current
      ?.querySelector<HTMLElement>(`[data-thumb="${index}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    [1, -1, 2].forEach((d) => {
      const n = images[(index + d + images.length) % images.length];
      if (n) {
        const pre = new window.Image();
        pre.src = n.url;
      }
    });
  }, [index, images]);

  if (!mounted || index === null) {
    if (!mounted) return null;
  }
  const current = index !== null ? images[index] : null;

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — photographs`}
      className="fixed inset-0 z-[110] bg-obsidian text-ivory flex flex-col"
      style={{ opacity: 0 }}
      data-lenis-prevent
    >
      <div className="flex items-center justify-between shell h-16 md:h-20 shrink-0">
        <p className="micro-sm text-ivory/70 truncate pr-6">{name}</p>
        <div className="flex items-center gap-6">
          <p className="micro-sm tabular-nums" aria-live="polite">
            {String((index ?? 0) + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </p>
          <button ref={closeBtn} type="button" onClick={onClose} className="inline-flex items-center gap-3 micro-sm p-2 -mr-2 hover:text-champagne transition-colors">
            Close <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={stage}
        className="relative flex-1 min-h-0 touch-pan-y"
        onPointerDown={(e) => {
          touch.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t) return;
          const dx = e.clientX - t.x;
          const dy = e.clientY - t.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        }}
      >
        {current && (
          <div key={current.id} data-viewer-image className="absolute inset-0 mx-auto max-w-[1600px] px-4 md:px-24">
            <div className="relative w-full h-full">
              <Image
                src={current.url}
                alt={`${name} — photograph ${(index ?? 0) + 1} of ${images.length}`}
                fill
                sizes="100vw"
                className="object-contain select-none"
                draggable={false}
              />
            </div>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photograph"
              className="absolute left-0 top-0 bottom-0 w-[18%] md:w-24 flex items-center justify-start pl-3 md:pl-6 group"
            >
              <span className="hidden md:flex w-12 h-12 items-center justify-center border border-ivory/20 group-hover:bg-ivory group-hover:text-ink transition-colors">
                <Arrow direction="left" className="w-4 h-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photograph"
              className="absolute right-0 top-0 bottom-0 w-[18%] md:w-24 flex items-center justify-end pr-3 md:pr-6 group"
            >
              <span className="hidden md:flex w-12 h-12 items-center justify-center border border-ivory/20 group-hover:bg-ivory group-hover:text-ink transition-colors">
                <Arrow className="w-4 h-4" />
              </span>
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div ref={thumbs} className="shrink-0 flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-8 py-4 md:py-5" aria-label="Thumbnails">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              data-thumb={i}
              onClick={() => {
                dir.current = i > (index ?? 0) ? 1 : -1;
                onIndex(i);
              }}
              aria-label={`Show photograph ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative shrink-0 w-20 md:w-24 aspect-[4/3] overflow-hidden transition-opacity duration-500",
                i === index ? "opacity-100 outline outline-1 outline-champagne outline-offset-2" : "opacity-40 hover:opacity-80"
              )}
            >
              <Image src={img.url} alt="" fill sizes="96px" loading="lazy" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

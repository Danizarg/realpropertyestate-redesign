"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, useIsoLayoutEffect } from "@/components/motion/gsap";
import { Arrow } from "@/components/motion/Magnetic";
import GalleryViewer from "./GalleryViewer";
import type { PropertyImage } from "@/lib/types";
import { cn } from "@/lib/utils";

const STRIP_MAX = 8;
/** Varied frame heights give the strip an editorial rhythm. */
const RHYTHM = [
  "lg:h-[62svh]",
  "lg:h-[46svh] lg:self-start lg:mt-[14svh]",
  "lg:h-[70svh]",
  "lg:h-[50svh] lg:self-end lg:mb-[12svh]",
  "lg:h-[58svh]",
  "lg:h-[44svh] lg:self-start lg:mt-[16svh]",
  "lg:h-[66svh]",
  "lg:h-[52svh] lg:self-end lg:mb-[14svh]",
];

/**
 * Desktop: a pinned, scroll-driven horizontal sequence of the first frames.
 * Touch: a native swipe carousel. Any frame opens the fullscreen viewer.
 */
export default function CinematicGallery({ images, name }: { images: PropertyImage[]; name: string }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const strip = images.slice(0, STRIP_MAX);

  useIsoLayoutEffect(() => {
    const el = section.current;
    const tr = track.current;
    if (!el || !tr || strip.length < 3) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const distance = () => Math.max(0, tr.scrollWidth - window.innerWidth);
      const tween = gsap.to(tr, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      tr.querySelectorAll<HTMLElement>("[data-frame] img").forEach((img) => {
        gsap.fromTo(
          img,
          { xPercent: -6, scale: 1.14 },
          {
            xPercent: 6,
            scale: 1.14,
            ease: "none",
            scrollTrigger: { trigger: img.closest("[data-frame]"), containerAnimation: tween, start: "left right", end: "right left", scrub: true },
          }
        );
      });
    });
    return () => mm.revert();
  }, [strip.length]);

  if (images.length === 0) return null;

  return (
    <>
      <section ref={section} id="gallery" data-nav-theme="dark" className="relative bg-obsidian text-ivory overflow-hidden" aria-label="Photographs">
        {strip.length >= 3 ? (
          <div
            ref={track}
            className="flex lg:h-[100svh] items-center gap-4 lg:gap-8 overflow-x-auto lg:overflow-visible snap-x snap-mandatory lg:snap-none no-scrollbar py-16 lg:py-0 px-[var(--gutter)] lg:w-max"
          >
            <div className="hidden lg:flex flex-col justify-center shrink-0 w-[28vw] pr-[3vw]">
              <p className="micro text-champagne mb-6">Gallery</p>
              <p className="display-m">The residence in frames.</p>
              <button type="button" onClick={() => setViewer(0)} className="mt-10 self-start link-line micro-sm">
                View all {images.length} photographs <Arrow className="w-3.5 h-3.5" />
              </button>
            </div>
            {strip.map((img, i) => (
              <button
                key={img.id}
                type="button"
                data-frame
                data-cursor="View"
                onClick={() => setViewer(i)}
                aria-label={`Open photograph ${i + 1} of ${images.length}`}
                className={cn(
                  "group relative shrink-0 overflow-hidden bg-obsidian-3 snap-center",
                  "w-[82vw] aspect-[4/5] sm:w-[60vw] sm:aspect-[4/3]",
                  "lg:aspect-auto",
                  i % 2 === 0 ? "lg:w-[46vw]" : "lg:w-[30vw]",
                  RHYTHM[i % RHYTHM.length]
                )}
              >
                <Image
                  src={img.url}
                  alt={`${name} — photograph ${i + 1}`}
                  fill
                  sizes="(max-width: 1024px) 82vw, 46vw"
                  loading={i < 2 ? "eager" : "lazy"}
                  className="object-cover transition-[filter] duration-700 group-hover:brightness-110"
                />
                <span className="absolute left-4 bottom-3 micro-sm text-ivory/80">{String(i + 1).padStart(2, "0")}</span>
              </button>
            ))}
            {images.length > strip.length && (
              <button
                type="button"
                onClick={() => setViewer(strip.length)}
                className="shrink-0 snap-center w-[60vw] sm:w-[40vw] lg:w-[24vw] aspect-[4/5] lg:aspect-auto lg:h-[50svh] border border-ivory/15 flex flex-col items-center justify-center gap-4 hover:bg-ivory hover:text-ink transition-colors duration-500"
              >
                <span className="font-serif text-5xl font-light">+{images.length - strip.length}</span>
                <span className="micro-sm">More photographs</span>
              </button>
            )}
            <div className="hidden lg:block w-[6vw] shrink-0" aria-hidden="true" />
          </div>
        ) : (
          <div className="shell py-20 grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setViewer(i)}
                data-cursor="View"
                className="relative aspect-[4/3] overflow-hidden bg-obsidian-3"
                aria-label={`Open photograph ${i + 1} of ${images.length}`}
              >
                <Image src={img.url} alt={`${name} — photograph ${i + 1}`} fill sizes="50vw" className="object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="lg:hidden shell pb-14 -mt-4">
          <button type="button" onClick={() => setViewer(0)} className="link-line micro-sm">
            View all {images.length} photographs <Arrow className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      <GalleryViewer images={images} name={name} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
    </>
  );
}

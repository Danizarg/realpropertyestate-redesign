"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useIsoLayoutEffect } from "@/components/motion/gsap";
import TransitionLink from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/motion/Magnetic";
import { unsplash } from "@/lib/media-library";
import type { Chapter } from "@/lib/lifestyle";
import { prefersReducedMotion } from "@/lib/experience";

export default function LifestyleChapters({ chapters }: { chapters: Chapter[] }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    const el = section.current;
    const tr = track.current;
    if (!el || !tr) return;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const distance = () => tr.scrollWidth - window.innerWidth;
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
          onUpdate: (self) => bar.current && gsap.set(bar.current, { scaleX: self.progress }),
        },
      });
      tr.querySelectorAll<HTMLElement>("[data-chapter]").forEach((panel) => {
        const img = panel.querySelector("img");
        if (img) {
          gsap.fromTo(
            img,
            { xPercent: -7, scale: 1.18 },
            {
              xPercent: 7,
              scale: 1.18,
              ease: "none",
              scrollTrigger: { trigger: panel, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
            }
          );
        }
        const copy = panel.querySelector("[data-chapter-copy]");
        if (copy) {
          gsap.fromTo(
            copy,
            { opacity: 0, y: 40 },
            {
              opacity: 1,
              y: 0,
              duration: 1.2,
              ease: "expo.out",
              scrollTrigger: { trigger: panel, containerAnimation: tween, start: "left 70%", toggleActions: "play none none reverse" },
            }
          );
        }
      });
    });

    mm.add("(max-width: 1023px), (prefers-reduced-motion: reduce)", () => {
      if (prefersReducedMotion()) return;
      tr.querySelectorAll<HTMLElement>("[data-chapter]").forEach((panel) => {
        gsap.fromTo(
          panel.querySelector("[data-chapter-frame]"),
          { clipPath: "inset(12% 8% 12% 8%)" },
          { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: panel, start: "top 95%", end: "top 40%", scrub: 0.5 } }
        );
      });
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={section} id="lifestyle" data-nav-theme="dark" className="relative bg-obsidian text-ivory overflow-hidden">
      <div className="grain absolute inset-0 pointer-events-none" />
      <div
        ref={track}
        className="relative flex flex-col lg:flex-row lg:h-[100svh] lg:items-center lg:w-max gap-24 lg:gap-0 py-28 lg:py-0"
      >
        {/* Opening panel */}
        <div className="shell lg:w-[46vw] lg:max-w-none lg:pl-[var(--gutter)] lg:pr-[6vw] shrink-0">
          <p className="micro text-champagne mb-8 flex items-center gap-4">
            <span className="block w-10 h-px bg-current" />
            The Marbella lifestyle
          </p>
          <h2 className="display-l">
            A coastline, a mountain and <em className="font-light">a way of life.</em>
          </h2>
          <p className="mt-10 max-w-md body-copy text-ivory/75">
            “Marbella is far more than a destination—it is a way of life.” Five places that shape everyday life here, and
            the residences we present within them.
          </p>
          <p className="hidden lg:flex mt-14 micro-sm text-stone items-center gap-4">
            Scroll to explore <Arrow className="w-4 h-4" />
          </p>
        </div>

        {chapters.map((c, i) => (
          <article
            key={c.title}
            data-chapter
            className="shell lg:max-w-none lg:w-[72vw] xl:w-[64vw] shrink-0 lg:pr-[5vw] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center"
          >
            <div
              data-chapter-frame
              className={`relative overflow-hidden bg-obsidian-3 lg:col-span-7 aspect-[4/5] sm:aspect-[16/11] lg:aspect-auto lg:h-[68svh] ${
                i % 2 === 1 ? "lg:order-2 lg:col-start-6" : ""
              }`}
            >
              <Image
                src={unsplash(c.image.id, 1800)}
                alt={c.image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
                style={{ objectPosition: c.image.position }}
              />
              <span className="absolute left-5 bottom-4 micro-sm text-ivory/80">{c.place}</span>
            </div>
            <div data-chapter-copy className={`lg:col-span-5 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
              <p className="font-serif font-light text-[5.5rem] lg:text-[7rem] leading-none text-ivory/10 select-none" aria-hidden="true">
                0{i + 1}
              </p>
              <h3 className="display-m -mt-8 lg:-mt-12">{c.title}</h3>
              <p className="mt-6 body-copy text-ivory/75 max-w-sm">{c.text}</p>
              {c.query && c.count ? (
                <TransitionLink
                  href={`/properties?location=${encodeURIComponent(c.query)}`}
                  className="link-line micro-sm mt-8 text-champagne"
                >
                  {c.count} {c.count === 1 ? "residence" : "residences"} in {c.place.split(" · ")[0]}
                  <Arrow className="w-3.5 h-3.5" />
                </TransitionLink>
              ) : null}
            </div>
          </article>
        ))}
        <div className="hidden lg:block w-[8vw] shrink-0" aria-hidden="true" />
      </div>

      <div className="hidden lg:flex absolute bottom-10 inset-x-0 shell items-center gap-6 pointer-events-none">
        <span className="micro-sm text-stone">01</span>
        <span className="relative flex-1 h-px bg-ivory/15">
          <span ref={bar} className="absolute inset-0 bg-champagne origin-left" style={{ transform: "scaleX(0)" }} />
        </span>
        <span className="micro-sm text-stone">0{chapters.length}</span>
      </div>
    </section>
  );
}

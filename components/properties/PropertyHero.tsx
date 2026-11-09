"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useIsoLayoutEffect } from "@/components/motion/gsap";
import { whenPageRevealed } from "@/components/motion/transition-state";
import { scrollToElement } from "@/components/motion/scroll";
import TransitionLink from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/motion/Magnetic";
import { prefersReducedMotion } from "@/lib/experience";
import type { PropertyImage } from "@/lib/types";
import { DETAIL_SCRIM } from "@/lib/scrims";

interface Props {
  name: string;
  eyebrow: string;
  price: string;
  status: string | null;
  cover: PropertyImage | null;
  imageCount: number;
}

export default function PropertyHero({ name, eyebrow, price, status, cover, imageCount }: Props) {
  const root = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = el.querySelectorAll("[data-hero-item]");
    const words = el.querySelectorAll("[data-hero-word]");
    if (prefersReducedMotion()) {
      gsap.set(items, { opacity: 1 });
      gsap.set(words, { y: 0, yPercent: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.set(words, { y: 0, yPercent: 110 });
      gsap.set(items, { opacity: 0, y: 24 });
      gsap.to(media.current, {
        yPercent: 16,
        scale: 1.06,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
    }, el);
    const cancel = whenPageRevealed(() => {
      ctx.add(() => {
        gsap
          .timeline({ delay: 0.15 })
          .to(words, { yPercent: 0, duration: 1.4, ease: "expo.out", stagger: 0.06 })
          .to(items, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.08 }, 0.3);
      });
    });
    return () => {
      cancel();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      data-nav-theme="dark"
      className="relative h-[100svh] min-h-[600px] bg-obsidian text-ivory overflow-hidden"
      aria-label={name}
    >
      <div ref={media} data-shared-target className="absolute inset-0 will-change-transform">
        {cover ? (
          <Image src={cover.url} alt={name} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-obsidian-3" />
        )}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: DETAIL_SCRIM }}
      />

      <div className="relative h-full shell flex flex-col justify-between pt-[calc(var(--nav-h)+1.5rem)] pb-10 md:pb-14">
        <div data-hero-item>
          <TransitionLink href="/properties" className="link-line micro-sm text-ivory/85">
            <Arrow direction="left" className="w-3.5 h-3.5" /> All residences
          </TransitionLink>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 items-end">
          <div className="lg:col-span-9">
            <p data-hero-item className="micro text-ivory/80 flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
              <span className="block w-10 h-px bg-champagne" />
              {eyebrow}
              {status && status !== "Available" && (
                <span className="border border-ivory/40 px-3 py-1 text-ivory">{status}</span>
              )}
            </p>
            <h1 className="display-xl max-w-[14ch]" aria-label={name}>
              {name.split(" ").map((w, i, all) => (
                <span key={i}>
                  <span aria-hidden="true" className="inline-block overflow-hidden align-bottom pb-[0.06em] -mb-[0.06em]">
                    <span data-hero-word className="inline-block">
                      {w}
                    </span>
                  </span>
                  {i < all.length - 1 ? " " : null}
                </span>
              ))}
            </h1>
          </div>
          <div data-hero-item className="lg:col-span-3 lg:text-right">
            <p className="micro-sm text-ivory/70">Price</p>
            <p className="mt-2 font-serif text-[clamp(1.8rem,3vw,2.75rem)] leading-none">{price}</p>
            {imageCount > 1 && (
              <button
                type="button"
                onClick={() => scrollToElement("#gallery", -40)}
                className="mt-6 inline-flex link-line micro-sm text-ivory/85"
              >
                {imageCount} photographs <Arrow direction="down" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

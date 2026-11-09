"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useIsoLayoutEffect } from "@/components/motion/gsap";
import { whenIntroComplete, whenPageRevealed } from "@/components/motion/transition-state";
import TransitionLink from "@/components/motion/TransitionLink";
import { Magnetic, RollLabel, Arrow } from "@/components/motion/Magnetic";
import { useConcierge } from "@/components/concierge/ConciergeProvider";
import { REPLAY_EVENT } from "@/components/intro/replay";
import { prefersReducedMotion } from "@/lib/experience";
import type { HomepageCoverSettings } from "@/lib/types";
import { HERO_SCRIM } from "@/lib/scrims";

/** Splits a headline into masked words for the entrance (keeps an accessible label). */
function MaskedWords({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i, all) => (
        <span key={i}>
          <span className="inline-block overflow-hidden align-bottom pb-[0.06em] -mb-[0.06em]" aria-hidden="true">
            <span data-hero-word className="inline-block">
              {w}
            </span>
          </span>
          {i < all.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

export default function Hero({ cover, total }: { cover: HomepageCoverSettings; total: number }) {
  const concierge = useConcierge();
  const root = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const words = el.querySelectorAll("[data-hero-word]");
    const items = el.querySelectorAll("[data-hero-item]");

    if (reduced) {
      gsap.set(items, { opacity: 1 });
      gsap.set(words, { y: 0, yPercent: 0 });
      gsap.set(mediaRef.current, { scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(words, { y: 0, yPercent: 110 });
      gsap.set(items, { opacity: 0, y: 24 });
      gsap.set(mediaRef.current, { scale: 1.08 });

      // Scroll-out: the frame recedes while the copy lifts away.
      gsap.to(mediaRef.current, {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(contentRef.current, {
        y: -90,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "35% top", end: "bottom top", scrub: true },
      });
    }, el);

    let entrance: gsap.core.Timeline | null = null;
    const play = () => {
      entrance?.kill();
      entrance = gsap
        .timeline()
        .to(mediaRef.current, { scale: 1, duration: 2.4, ease: "expo.out" }, 0)
        .to(words, { yPercent: 0, duration: 1.5, ease: "expo.out", stagger: 0.07 }, 0.25)
        .to(items, { opacity: 1, y: 0, duration: 1.3, ease: "expo.out", stagger: 0.08 }, 0.7);
    };

    let cancelIntro = () => {};
    const cancelReveal = whenPageRevealed(() => {
      cancelIntro = whenIntroComplete(play);
    });

    const onReplay = () => {
      entrance?.kill();
      gsap.set(words, { y: 0, yPercent: 110 });
      gsap.set(items, { opacity: 0, y: 24 });
      gsap.set(mediaRef.current, { scale: 1.08 });
      cancelIntro();
      cancelIntro = whenIntroComplete(play);
    };
    window.addEventListener(REPLAY_EVENT, onReplay);

    return () => {
      window.removeEventListener(REPLAY_EVENT, onReplay);
      cancelReveal();
      cancelIntro();
      entrance?.kill();
      ctx.revert();
    };
  }, []);

  const isVideo = cover.mediaType === "video";

  return (
    <section
      ref={root}
      data-nav-theme="dark"
      className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-obsidian text-ivory"
      aria-label="Introduction"
    >
      <div ref={mediaRef} className="absolute inset-0 will-change-transform" style={{ transform: "scale(1.08)" }}>
        {isVideo ? (
          <video
            src={cover.mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="img-cover"
            aria-hidden="true"
          />
        ) : (
          <Image src={cover.mediaUrl} alt={cover.title} fill priority sizes="100vw" className="object-cover" />
        )}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: HERO_SCRIM }}
      />

      <div ref={contentRef} className="relative h-full shell flex flex-col justify-end pb-[clamp(6.5rem,14vh,9.5rem)] md:pb-[clamp(7rem,15vh,10.5rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 items-end">
          <div className="lg:col-span-9">
            <p data-hero-item className="micro text-ivory/80 flex items-center gap-4 mb-7">
              <span className="block w-10 h-px bg-champagne" />
              Marbella · Costa del Sol
            </p>
            <h1 className="display-xl max-w-[13ch]" aria-label={cover.title}>
              <MaskedWords text={cover.title} />
            </h1>
            <p data-hero-item className="mt-8 max-w-md text-[15.5px] leading-relaxed text-ivory/80">
              {cover.subtitle}
            </p>
            <div data-hero-item className="mt-10 flex flex-wrap gap-3">
              <Magnetic>
                <TransitionLink href={cover.buttonLink || "/properties"} className="btn btn-light">
                  <RollLabel>{cover.buttonText || "Explore Residences"}</RollLabel>
                  <Arrow className="w-4 h-4" />
                </TransitionLink>
              </Magnetic>
              <Magnetic>
                <button type="button" onClick={() => concierge.open()} className="btn btn-ghost-light">
                  <RollLabel>Speak to Our Concierge</RollLabel>
                </button>
              </Magnetic>
            </div>
          </div>

          <div data-hero-item className="hidden lg:flex lg:col-span-3 flex-col items-end text-right gap-8">
            {total > 0 && (
              <div>
                <p className="font-serif font-light text-6xl leading-none">{total}</p>
                <p className="micro-sm text-ivory/70 mt-3">Residences presented</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        data-hero-item
        className="absolute bottom-[6.75rem] left-1/2 -translate-x-1/2 hidden xl:flex flex-col items-center gap-3 text-ivory/70"
        aria-hidden="true"
      >
        <span className="micro-sm">Scroll</span>
        <span className="relative block w-px h-12 bg-ivory/20 overflow-hidden">
          <span className="absolute inset-0 bg-ivory scroll-cue-line" />
        </span>
      </div>
    </section>
  );
}

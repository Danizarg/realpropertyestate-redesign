"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useIsoLayoutEffect } from "@/components/motion/gsap";
import TransitionLink from "@/components/motion/TransitionLink";
import { SplitReveal, Reveal } from "@/components/motion/Reveal";
import { Magnetic, RollLabel, Arrow } from "@/components/motion/Magnetic";
import { IMAGERY, unsplash } from "@/lib/media-library";
import { prefersReducedMotion } from "@/lib/experience";

/** The closing call to action: a window onto the sea that opens as you arrive. */
export default function PrivateEnquiry() {
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        frame.current,
        { clipPath: "inset(10% 8% 10% 8%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 85%", end: "top 15%", scrub: 0.6 },
        }
      );
      gsap.fromTo(
        frame.current?.querySelector("img") ?? null,
        { scale: 1.25 },
        { scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} data-nav-theme="dark" className="relative bg-obsidian text-ivory">
      <div ref={frame} className="relative min-h-[100svh] flex items-center overflow-hidden">
        <Image
          src={unsplash(IMAGERY.stairsToSea.id, 2400)}
          alt={IMAGERY.stairsToSea.alt}
          fill
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: IMAGERY.stairsToSea.position }}
        />
        <div className="absolute inset-0 bg-obsidian/55" aria-hidden="true" />
        <div className="relative shell py-32 text-center flex flex-col items-center">
          <Reveal as="p" className="micro text-champagne mb-10">
            Private enquiry
          </Reveal>
          <SplitReveal as="h2" className="display-xl max-w-[12ch]">
            Your next chapter begins here.
          </SplitReveal>
          <Reveal className="mt-10 max-w-xl">
            <p className="body-copy text-ivory/80">
              Whether you are searching for a primary residence, a second home, or a private investment — we are here
              to guide you with complete discretion.
            </p>
          </Reveal>
          <Reveal className="mt-12 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <TransitionLink href="/contact" className="btn btn-light">
                <RollLabel>Make a Private Enquiry</RollLabel>
                <Arrow className="w-4 h-4" />
              </TransitionLink>
            </Magnetic>
            <Magnetic>
              <TransitionLink href="/properties" className="btn btn-ghost-light">
                <RollLabel>Explore Properties</RollLabel>
              </TransitionLink>
            </Magnetic>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

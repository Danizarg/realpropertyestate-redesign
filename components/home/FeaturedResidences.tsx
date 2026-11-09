"use client";

import { useRef } from "react";
import { gsap, useIsoLayoutEffect } from "@/components/motion/gsap";
import { SplitReveal, Reveal } from "@/components/motion/Reveal";
import TransitionLink from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/motion/Magnetic";
import PropertyCard from "@/components/properties/PropertyCard";
import { prefersReducedMotion } from "@/lib/experience";
import type { ListingSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Editorial, asymmetric layout slots for up to five residences. */
const SLOTS = [
  { wrap: "md:col-span-8", aspect: "16 / 10", sizes: "(max-width: 768px) 100vw, 66vw" },
  { wrap: "md:col-span-4 md:mt-[22vh]", aspect: "4 / 5", sizes: "(max-width: 768px) 100vw, 33vw" },
  { wrap: "md:col-span-5 md:col-start-2", aspect: "4 / 5", sizes: "(max-width: 768px) 100vw, 42vw" },
  { wrap: "md:col-span-6 md:mt-[16vh]", aspect: "16 / 11", sizes: "(max-width: 768px) 100vw, 50vw" },
  { wrap: "md:col-span-7 md:col-start-3", aspect: "16 / 10", sizes: "(max-width: 768px) 100vw, 58vw" },
];

export default function FeaturedResidences({ listings, total, curated }: { listings: ListingSummary[]; total: number; curated: boolean }) {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>("[data-feature]").forEach((item) => {
        const frame = item.querySelector<HTMLElement>("[data-shared-image]");
        const img = frame?.querySelector("img");
        if (!frame) return;
        gsap.fromTo(
          frame,
          { clipPath: "inset(18% 12% 18% 12%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "none",
            scrollTrigger: { trigger: item, start: "top 92%", end: "top 35%", scrub: 0.6 },
          }
        );
        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.3 },
            { scale: 1, ease: "none", scrollTrigger: { trigger: item, start: "top bottom", end: "bottom 40%", scrub: 0.6 } }
          );
        }
      });
    }, el);
    return () => ctx.revert();
  }, [listings.length]);

  if (listings.length === 0) return null;

  return (
    <section ref={root} data-nav-theme="light" className="relative bg-soft-white text-ink pt-28 md:pt-40 pb-28 md:pb-40">
      <div className="shell">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-8 items-end mb-16 md:mb-24">
          <div className="md:col-span-8">
            <Reveal as="p" className="micro text-bronze mb-6 flex items-center gap-4">
              <span className="block w-10 h-px bg-current" />
              {curated ? "Selected residences" : "Newly presented"}
            </Reveal>
            <SplitReveal as="h2" className="display-l max-w-[12ch]">
              {curated ? "Featured residences" : "Recently presented residences"}
            </SplitReveal>
          </div>
          <Reveal className="md:col-span-4 md:justify-self-end">
            <p className="text-ink-soft max-w-xs body-copy">
              A considered selection from our current collection across Marbella and the Costa del Sol.
            </p>
            <TransitionLink href="/properties" className="link-line micro-sm mt-6">
              View all {total} residences <Arrow className="w-3.5 h-3.5" />
            </TransitionLink>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 lg:gap-x-12 gap-y-20 md:gap-y-28">
          {listings.slice(0, SLOTS.length).map((p, i) => {
            const slot = SLOTS[i];
            return (
              <div key={p.id} data-feature className={cn(slot.wrap)}>
                <PropertyCard
                  property={p}
                  index={i}
                  aspect={slot.aspect}
                  sizes={slot.sizes}
                  titleClassName={i === 0 ? "md:text-[2.6rem]" : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

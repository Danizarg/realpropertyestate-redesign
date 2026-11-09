"use client";

import { useRef } from "react";
import { gsap, SplitText, useIsoLayoutEffect } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/Reveal";
import TransitionLink from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/motion/Magnetic";
import VideoFacade from "./VideoFacade";
import { prefersReducedMotion } from "@/lib/experience";

const STATEMENT = "Real estate presented with restraint, precision and discretion.";

const PILLARS = [
  { title: "Integrity", text: "Transparent advice at every stage, from the first viewing to the notary." },
  { title: "Expertise", text: "Specialists supported by architects, engineers, lawyers and notaries." },
  { title: "Discretion", text: "Private presentations and confidential enquiries, always." },
  { title: "Tailored service", text: "Every search shaped around your vision, timeline and way of living." },
];

export default function Philosophy({ videoEmbedUrl, videoTitle }: { videoEmbedUrl: string | null; videoTitle: string }) {
  const statement = useRef<HTMLHeadingElement>(null);

  // Word-by-word illumination tied to scroll position.
  useIsoLayoutEffect(() => {
    const el = statement.current;
    if (!el || prefersReducedMotion()) return;
    let split: SplitText | null = null;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, {
        type: "words",
        autoSplit: true,
        onSplit(self) {
          return gsap.fromTo(
            self.words,
            { opacity: 0.14 },
            {
              opacity: 1,
              stagger: 0.12,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 42%", scrub: 0.6 },
            }
          );
        },
      });
    }, el);
    return () => {
      split?.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section data-nav-theme="light" className="relative bg-ivory text-ink py-28 md:py-40 overflow-hidden">
      <div className="shell grid grid-cols-1 lg:grid-cols-12 gap-y-20 gap-x-12">
        <div className={videoEmbedUrl ? "lg:col-span-8" : "lg:col-span-10"}>
          <Reveal as="p" className="micro text-bronze mb-10 flex items-center gap-4">
            <span className="block w-10 h-px bg-current" />
            Our approach
          </Reveal>
          <h2 ref={statement} className="display-l max-w-[15ch]">
            {STATEMENT}
          </h2>
          <Reveal className="mt-14 grid sm:grid-cols-12 gap-8">
            <p className="sm:col-span-7 lead text-ink/85">
              We curate homes for clients who value location, proportion, privacy and architectural quality.
            </p>
            <div className="sm:col-span-5">
              <p className="body-copy text-ink-soft">
                Every property we represent is selected for its intrinsic merit, not simply its market value.
              </p>
              <TransitionLink href="/about" className="link-line micro-sm mt-7">
                About us <Arrow className="w-3.5 h-3.5" />
              </TransitionLink>
            </div>
          </Reveal>
        </div>

        {videoEmbedUrl && (
          <Reveal variant="mask" className="lg:col-span-4 lg:col-start-9 lg:pt-24">
            <VideoFacade embedUrl={videoEmbedUrl} title={videoTitle} className="w-full max-w-[380px] mx-auto lg:ml-auto" />
          </Reveal>
        )}

        <div className="lg:col-span-12 mt-4">
          <Reveal stagger={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-ink/15">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="pt-8 pb-4 sm:pr-8 lg:border-r last:border-r-0 border-ink/10 lg:pl-8 first:lg:pl-0">
                <p className="micro-sm text-bronze">0{i + 1}</p>
                <h3 className="heading mt-5">{p.title}</h3>
                <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft max-w-[30ch]">{p.text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

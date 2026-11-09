import Image from "next/image";
import TransitionLink from "@/components/motion/TransitionLink";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal, SplitReveal } from "@/components/motion/Reveal";
import { Magnetic, RollLabel, Arrow } from "@/components/motion/Magnetic";

/** Founder introduction — copy taken verbatim from the existing About biography. */
export default function FounderPreview() {
  return (
    <section data-nav-theme="dark" className="relative bg-obsidian-2 text-ivory py-28 md:py-40 overflow-hidden">
      <div className="shell grid grid-cols-1 lg:grid-cols-12 gap-y-16 gap-x-12 items-center">
        <div className="lg:col-span-5 relative">
          <div className="relative aspect-[4/5] overflow-hidden bg-obsidian-3">
            <Parallax amount={10} scale={1.14} reveal>
              <Image
                src="/about/massimo-michelino.png"
                alt="Massimo Michelino, Founder and CEO of Real Property Estate"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
                style={{ objectPosition: "center 15%" }}
              />
            </Parallax>
          </div>
          <p className="mt-5 micro-sm text-stone">Massimo Michelino — Founder &amp; CEO</p>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal as="p" className="micro text-champagne mb-8 flex items-center gap-4">
            <span className="block w-10 h-px bg-current" />
            Founder &amp; expertise
          </Reveal>
          <SplitReveal as="h2" className="display-l">
            Massimo Michelino
          </SplitReveal>
          <Reveal className="mt-10 space-y-6 max-w-xl">
            <p className="lead text-ivory/90">
              “Born in Italy and inspired by the exceptional lifestyle of Marbella, I have dedicated my career to
              connecting discerning clients with some of the finest real estate opportunities on the Costa del Sol.”
            </p>
            <p className="body-copy text-ivory/70">
              For more than two decades, together with a trusted team of experienced professionals, Real Property
              Estate has built a reputation based on integrity, expertise, discretion and exceptional service.
            </p>
          </Reveal>
          <Reveal className="mt-12 flex flex-wrap items-center gap-8">
            <Magnetic>
              <TransitionLink href="/about" className="btn btn-light">
                <RollLabel>Discover Our Story</RollLabel>
                <Arrow className="w-4 h-4" />
              </TransitionLink>
            </Magnetic>
            <p className="font-serif italic text-xl text-champagne-soft">Your vision. Our expertise.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

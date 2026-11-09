import Image from "next/image";
import type { Metadata } from "next";
import TransitionLink from "@/components/motion/TransitionLink";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal, SplitReveal } from "@/components/motion/Reveal";
import { Magnetic, RollLabel, Arrow } from "@/components/motion/Magnetic";
import { WhatsAppIcon } from "@/components/site/SocialIcons";
import { WHATSAPP_GENERAL_URL } from "@/lib/whatsapp";
import { IMAGERY, unsplash } from "@/lib/media-library";

export const metadata: Metadata = {
  title: "About — Real Property Estate",
  description:
    "Massimo Michelino, Founder and CEO of Real Property Estate, on two decades connecting discerning clients to Marbella's finest addresses.",
};

// Drawn directly from the biography below — no additional claims.
const PORTFOLIO = [
  "Luxury villas",
  "Contemporary apartments",
  "Penthouses",
  "Beachfront residences",
  "Country estates",
  "Building plots",
  "Commercial properties",
  "Hotels",
  "Investment opportunities",
];

const DISCIPLINES = ["Real estate specialists", "Architects", "Engineers", "Developers", "Builders", "Lawyers", "Notaries"];

export default function AboutPage() {
  return (
    <>
      {/* Opening */}
      <section data-nav-theme="dark" className="relative min-h-[100svh] bg-obsidian text-ivory overflow-hidden flex items-end">
        <div className="absolute inset-0">
          <Parallax amount={14} scale={1.12}>
            <Image
              src={unsplash(IMAGERY.whiteVilla.id, 2400)}
              alt={IMAGERY.whiteVilla.alt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: IMAGERY.whiteVilla.position }}
            />
          </Parallax>
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-obsidian/30" />
        </div>
        <div className="relative shell pb-20 md:pb-28 pt-40 w-full">
          <Reveal as="p" className="micro text-champagne mb-8 flex items-center gap-4">
            <span className="block w-10 h-px bg-current" />
            Essence of Marbella
          </Reveal>
          <SplitReveal as="h1" split="words" trigger="mount" className="display-xl max-w-[12ch]">
            About Real Property Estate
          </SplitReveal>
          <Reveal className="mt-10 max-w-md">
            <p className="font-serif italic text-[1.5rem] leading-snug text-ivory/85">
              Your vision. Our expertise. Your perfect property in Marbella.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Founder */}
      <section data-nav-theme="light" className="bg-soft-white text-ink py-24 md:py-40">
        <div className="shell grid grid-cols-1 lg:grid-cols-12 gap-y-14 gap-x-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="relative aspect-[4/5] overflow-hidden bg-ivory-2">
                <Parallax amount={8} scale={1.1} reveal>
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
              <p className="mt-5 micro-sm text-ink-soft">Massimo Michelino, Founder &amp; CEO</p>
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
            <p className="micro text-bronze mb-8">The founder</p>
            <SplitReveal as="h2" className="display-m">
              Born in Italy. Inspired by Marbella.
            </SplitReveal>
            <Reveal className="mt-12 space-y-7 body-copy text-ink/85 max-w-xl">
              <p className="lead text-ink">
                My name is Massimo Michelino, Founder and CEO of Real Property Estate. Born in Italy and inspired by the
                exceptional lifestyle of Marbella, I have dedicated my career to connecting discerning clients with some
                of the finest real estate opportunities on the Costa del Sol.
              </p>
              <p>
                For more than two decades, together with my trusted team of experienced professionals, we have built a
                strong reputation based on integrity, expertise, discretion, and exceptional service. Our mission is
                simple: to transform every real estate transaction into a seamless and rewarding experience.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Marbella — a way of life */}
      <section data-nav-theme="dark" className="relative bg-obsidian text-ivory overflow-hidden">
        <div className="relative h-[85svh] min-h-[560px]">
          <Parallax amount={16} scale={1.16}>
            <Image
              src={unsplash(IMAGERY.golfValley.id, 2400)}
              alt={IMAGERY.golfValley.alt}
              fill
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: IMAGERY.golfValley.position }}
            />
          </Parallax>
          <div className="absolute inset-0 bg-obsidian/55" />
          <div className="relative h-full shell flex items-center">
            <SplitReveal as="p" className="display-l max-w-[18ch]">
              Marbella is far more than a destination—it is a way of life.
            </SplitReveal>
          </div>
        </div>
        <div className="shell py-20 md:py-28 grid grid-cols-1 lg:grid-cols-12 gap-y-10 gap-x-12">
          <Reveal className="lg:col-span-6 body-copy text-ivory/80">
            <p>
              With its year-round Mediterranean climate, outstanding security, world-class infrastructure, prestigious
              international community, renowned golf courses, luxury marinas, fine dining, and breathtaking coastline, it
              offers one of the highest standards of living anywhere in the world.
            </p>
          </Reveal>
          <Reveal className="lg:col-span-5 lg:col-start-8 body-copy text-ivory/80">
            <p>
              It is also one of Europe&rsquo;s most attractive real estate markets. Thanks to its consistent demand,
              limited supply in prime locations, and remarkable long-term appreciation, investing in Marbella continues to
              be one of the safest and most rewarding choices for both private buyers and international investors.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Portfolio */}
      <section data-nav-theme="light" className="bg-ivory text-ink py-24 md:py-36">
        <div className="shell grid grid-cols-1 lg:grid-cols-12 gap-y-14 gap-x-12">
          <div className="lg:col-span-5">
            <p className="micro text-bronze mb-8">The portfolio</p>
            <Reveal className="body-copy text-ink/85 max-w-md">
              <p>
                At Real Property Estate, we offer an exclusive portfolio that includes luxury villas, contemporary
                apartments, penthouses, beachfront residences, country estates, building plots, commercial properties,
                hotels, and premium investment opportunities throughout Marbella and the Costa del Sol.
              </p>
            </Reveal>
            <TransitionLink href="/properties" className="mt-10 link-line micro-sm">
              Explore the collection <Arrow className="w-3.5 h-3.5" />
            </TransitionLink>
          </div>
          <Reveal as="ul" stagger={0.05} className="lg:col-span-6 lg:col-start-7 border-t border-ink/15">
            {PORTFOLIO.map((item, i) => (
              <li key={item} className="flex items-baseline justify-between gap-6 border-b border-ink/10 py-5">
                <span className="font-serif font-light text-[clamp(1.6rem,3vw,2.6rem)] leading-tight">{item}</span>
                <span className="micro-sm text-ink-soft tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Team */}
      <section data-nav-theme="light" className="bg-soft-white text-ink py-24 md:py-40">
        <div className="shell grid grid-cols-1 lg:grid-cols-12 gap-y-14 gap-x-12 items-start">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <p className="micro text-bronze mb-8">A multidisciplinary team</p>
            <SplitReveal as="h2" className="display-m max-w-[16ch]">
              Comprehensive support at every stage.
            </SplitReveal>
            <Reveal className="mt-12 space-y-7 body-copy text-ink/85 max-w-xl">
              <p>
                What truly distinguishes us is the strength of our multidisciplinary team. Alongside our real estate
                specialists, we work with highly qualified architects, engineers, developers, builders, lawyers, and
                notaries, allowing us to provide comprehensive support at every stage of the process—from selecting the
                perfect property to legal advice, architectural design, construction, renovation, and investment planning.
              </p>
              <p>
                Whether you are looking for a permanent residence, a holiday home, a commercial asset, a development
                opportunity, or a profitable investment, we are committed to understanding your vision and delivering a
                tailor-made solution with professionalism, transparency, and absolute dedication.
              </p>
              <p>
                At Real Property Estate, we don&rsquo;t simply sell properties—we create opportunities, build lasting
                relationships, and help turn your dreams into reality.
              </p>
            </Reveal>
            <Reveal stagger={0.04} className="mt-12 flex flex-wrap gap-2">
              {DISCIPLINES.map((d) => (
                <span key={d} className="chip">
                  {d}
                </span>
              ))}
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 order-1 lg:order-2">
            <div className="relative aspect-[4/5] overflow-hidden bg-ivory-2">
              <Parallax amount={8} scale={1.1} reveal>
                <Image
                  src="/about/real-property-estate-team.png"
                  alt="Real Property Estate team member in Marbella"
                  fill
                  sizes="(max-width: 1024px) 100vw, 36vw"
                  className="object-cover"
                  style={{ objectPosition: "center 10%" }}
                />
              </Parallax>
            </div>
            <p className="mt-5 micro-sm text-ink-soft">A trusted team for Marbella real estate</p>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section data-nav-theme="dark" className="relative bg-obsidian text-ivory py-28 md:py-40 overflow-hidden">
        <div className="grain absolute inset-0 pointer-events-none" />
        <div className="relative shell text-center flex flex-col items-center">
          <SplitReveal as="p" className="display-l max-w-[16ch] italic">
            Your vision. Our expertise. Your perfect property in Marbella.
          </SplitReveal>
          <Reveal className="mt-10 max-w-lg">
            <p className="body-copy text-ivory/75">
              Begin a private conversation about your property search in Marbella.
            </p>
          </Reveal>
          <Reveal className="mt-12 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <a href={WHATSAPP_GENERAL_URL} target="_blank" rel="noopener noreferrer" className="btn btn-light">
                <WhatsAppIcon className="w-4 h-4" />
                <RollLabel>Contact via WhatsApp</RollLabel>
              </a>
            </Magnetic>
            <Magnetic>
              <TransitionLink href="/properties" className="btn btn-ghost-light">
                <RollLabel>View Properties</RollLabel>
              </TransitionLink>
            </Magnetic>
          </Reveal>
        </div>
      </section>
    </>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import TransitionLink from "@/components/motion/TransitionLink";
import { SplitReveal, Reveal } from "@/components/motion/Reveal";
import { usePageTransition } from "@/components/motion/TransitionProvider";
import { useConcierge } from "@/components/concierge/ConciergeProvider";
import { useSound, SoundBars } from "@/components/experience/SoundProvider";
import { replayIntro } from "@/components/intro/replay";
import { Arrow } from "@/components/motion/Magnetic";
import { WHATSAPP_DISPLAY_PHONE, WHATSAPP_GENERAL_URL } from "@/lib/whatsapp";
import { INSTAGRAM_URL, TIKTOK_URL } from "@/lib/social";
import { CONTACT_EMAIL, NAV_LINKS } from "./nav-links";

/** The closing scene: a quiet, dark editorial colophon. */
export default function SiteFooter() {
  const { navigate } = usePageTransition();
  const concierge = useConcierge();
  const sound = useSound();

  return (
    <footer data-site-footer data-nav-theme="dark" className="relative bg-obsidian text-ivory overflow-hidden mt-auto">
      <div className="grain absolute inset-0 pointer-events-none" />
      <div className="relative shell pt-24 md:pt-32 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-16 gap-x-10">
          <div className="lg:col-span-6">
            <p className="micro text-champagne mb-8">Real Property Estate</p>
            <SplitReveal as="p" className="display-m max-w-[14ch]">
              Begin a private conversation.
            </SplitReveal>
            <Reveal className="mt-12 flex flex-col gap-4 text-[clamp(1.15rem,1.8vw,1.6rem)] font-serif">
              <a href={`mailto:${CONTACT_EMAIL}`} className="link-line self-start hover:text-champagne transition-colors">
                {CONTACT_EMAIL} <Arrow direction="up-right" className="w-4 h-4" />
              </a>
              <a
                href={WHATSAPP_GENERAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="link-line self-start hover:text-champagne transition-colors"
              >
                WhatsApp {WHATSAPP_DISPLAY_PHONE} <Arrow direction="up-right" className="w-4 h-4" />
              </a>
            </Reveal>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-10 text-[14px] lg:pt-16">
            <div>
              <p className="micro-sm text-stone mb-5">Navigate</p>
              <ul className="space-y-3">
                <li>
                  <TransitionLink href="/" className="hover:text-champagne transition-colors">
                    Home
                  </TransitionLink>
                </li>
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <TransitionLink href={l.href} className="hover:text-champagne transition-colors">
                      {l.short}
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="micro-sm text-stone mb-5">Connect</p>
              <ul className="space-y-3">
                <li>
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-champagne transition-colors">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className="hover:text-champagne transition-colors">
                    TikTok
                  </a>
                </li>
                <li>
                  <a href={WHATSAPP_GENERAL_URL} target="_blank" rel="noopener noreferrer" className="hover:text-champagne transition-colors">
                    WhatsApp
                  </a>
                </li>
                <li className="text-stone">Marbella, Spain · Costa del Sol</li>
              </ul>
            </div>
            <div>
              <p className="micro-sm text-stone mb-5">Experience</p>
              <ul className="space-y-3">
                <li>
                  <button type="button" onClick={() => concierge.open()} className="hover:text-champagne transition-colors text-left">
                    Concierge
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => replayIntro((href) => navigate(href))}
                    className="hover:text-champagne transition-colors text-left"
                  >
                    Replay introduction
                  </button>
                </li>
                {sound.supported && (
                  <li>
                    <button
                      type="button"
                      onClick={sound.toggle}
                      aria-pressed={sound.enabled}
                      className="inline-flex items-center gap-2.5 hover:text-champagne transition-colors"
                    >
                      <SoundBars active={sound.enabled} /> Sound {sound.enabled ? "on" : "off"}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Monumental wordmark */}
        <div className="mt-24 md:mt-36 border-t border-ivory/10 pt-10 md:pt-14">
          <div className="flex items-end gap-[2.5vw]">
            <Image
              src="/brand/monogram-light.png"
              alt=""
              width={286}
              height={272}
              className="w-[11vw] max-w-[150px] min-w-[56px] h-auto opacity-90 shrink-0"
            />
            <SplitReveal
              as="p"
              split="chars"
              aria-label="Real Property Estate"
              className="font-serif font-light uppercase whitespace-nowrap leading-[0.82] tracking-[-0.01em] text-[5.6vw] text-ivory/90"
            >
              Real Property Estate
            </SplitReveal>
          </div>
        </div>

        <div className="mt-12 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[12px] text-stone">
          <p>© {new Date().getFullYear()} Real Property Estate. All rights reserved.</p>
          <p className="md:text-center">Editorial photography of Marbella via Unsplash.</p>
          <Link href="/login" className="text-ivory/30 hover:text-ivory transition-colors">
            Owner access
          </Link>
        </div>
      </div>
    </footer>
  );
}

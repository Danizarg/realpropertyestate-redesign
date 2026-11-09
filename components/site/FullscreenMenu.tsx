"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/components/motion/gsap";
import { useOverlay } from "@/components/motion/useOverlay";
import { usePageTransition } from "@/components/motion/TransitionProvider";
import { useConcierge } from "@/components/concierge/ConciergeProvider";
import { useSound, SoundBars } from "@/components/experience/SoundProvider";
import { replayIntro } from "@/components/intro/replay";
import { Arrow } from "@/components/motion/Magnetic";
import { NAV_LINKS, CONTACT_EMAIL } from "./nav-links";
import { IMAGERY, unsplash } from "@/lib/media-library";
import { WHATSAPP_DISPLAY_PHONE, WHATSAPP_GENERAL_URL } from "@/lib/whatsapp";
import { INSTAGRAM_URL, TIKTOK_URL } from "@/lib/social";
import { prefersReducedMotion } from "@/lib/experience";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", image: IMAGERY.banusDusk },
  ...NAV_LINKS.map((l) => ({ href: l.href, label: l.label, image: l.image })),
];

export default function FullscreenMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { navigate } = usePageTransition();
  const concierge = useConcierge();
  const sound = useSound();
  const rootRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(0);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useOverlay(mounted && open, onClose, { initialFocus: () => firstLinkRef.current });

  if (open && !mounted) setMounted(true);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    const idx = ITEMS.findIndex((i) => i.href === pathname);
    if (idx >= 0) setHovered(idx);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!mounted || !root) return;
    const reduced = prefersReducedMotion();
    tlRef.current?.kill();
    if (open) {
      const tl = gsap.timeline();
      tl.fromTo(
        root,
        { clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: reduced ? 0.01 : 1, ease: "expo.inOut" }
      )
        .fromTo(
          root.querySelectorAll("[data-menu-line]"),
          { yPercent: 110 },
          { yPercent: 0, duration: reduced ? 0.01 : 1.2, ease: "expo.out", stagger: 0.07 },
          reduced ? 0 : 0.45
        )
        .fromTo(
          root.querySelectorAll("[data-menu-fade]"),
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.05 },
          reduced ? 0 : 0.7
        )
        .fromTo(
          root.querySelector("[data-menu-image]"),
          { clipPath: "inset(100% 0% 0% 0%)", scale: 1.15 },
          { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: reduced ? 0.01 : 1.6, ease: "expo.inOut" },
          reduced ? 0 : 0.3
        );
      tlRef.current = tl;
    } else {
      tlRef.current = gsap.timeline({ onComplete: () => setMounted(false) }).to(root, {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: reduced ? 0.01 : 0.85,
        ease: "expo.inOut",
      });
    }
  }, [open, mounted]);

  if (!mounted) return null;

  const go = (href: string) => {
    onClose();
    if (href !== pathname) navigate(href);
  };

  return (
    <div
      ref={rootRef}
      id="site-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      className="fixed inset-0 z-[55] bg-obsidian text-ivory overflow-y-auto"
      style={{ clipPath: "inset(0% 0% 100% 0%)" }}
      data-lenis-prevent
    >
      <div className="grain absolute inset-0 pointer-events-none" />
      <div className="relative min-h-full shell grid grid-cols-1 lg:grid-cols-12 gap-x-10 pt-[calc(var(--nav-h)+2rem)] pb-10">
        {/* Links */}
        <nav aria-label="Menu" className="lg:col-span-7 flex flex-col justify-center">
          <ul className="space-y-1 md:space-y-0">
            {ITEMS.map((item, i) => {
              const active = item.href === pathname;
              return (
                <li key={item.href} className="overflow-hidden">
                  <a
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                      e.preventDefault();
                      go(item.href);
                    }}
                    onPointerEnter={() => setHovered(i)}
                    onFocus={() => setHovered(i)}
                    aria-current={active ? "page" : undefined}
                    data-menu-line
                    className="group flex items-baseline gap-5 md:gap-8 py-1"
                  >
                    <span className="micro-sm text-stone w-6 shrink-0">0{i + 1}</span>
                    <span
                      className={cn(
                        "font-serif font-light text-[clamp(2.8rem,8.4vw,7.2rem)] leading-[1.02] tracking-[-0.02em] transition-[color,transform] duration-700 ease-[var(--ease-out)]",
                        hovered === i ? "text-ivory md:translate-x-3" : "text-ivory/45",
                        active && "italic"
                      )}
                    >
                      {item.label}
                    </span>
                    <Arrow
                      className={cn(
                        "hidden md:block w-8 h-8 transition-all duration-700 ease-[var(--ease-out)]",
                        hovered === i ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                      )}
                    />
                  </a>
                </li>
              );
            })}
            <li className="overflow-hidden">
              <button
                type="button"
                data-menu-line
                onPointerEnter={() => setHovered(ITEMS.length)}
                onFocus={() => setHovered(ITEMS.length)}
                onClick={() => {
                  onClose();
                  window.setTimeout(() => concierge.open(), 400);
                }}
                className="group flex items-baseline gap-5 md:gap-8 py-1 text-left"
              >
                <span className="micro-sm text-stone w-6 shrink-0">0{ITEMS.length + 1}</span>
                <span
                  className={cn(
                    "font-serif font-light text-[clamp(2.8rem,8.4vw,7.2rem)] leading-[1.02] tracking-[-0.02em] transition-[color,transform] duration-700 ease-[var(--ease-out)]",
                    hovered === ITEMS.length ? "text-champagne md:translate-x-3" : "text-ivory/45"
                  )}
                >
                  Concierge
                </span>
              </button>
            </li>
          </ul>
        </nav>

        {/* Imagery + details */}
        <aside className="lg:col-span-5 flex flex-col justify-end gap-10 mt-14 lg:mt-0">
          <div data-menu-image className="relative hidden lg:block aspect-[4/5] max-h-[56vh] overflow-hidden bg-obsidian-2">
            {[...ITEMS.map((i) => i.image), IMAGERY.banusBlue].map((img, i) => (
              <Image
                key={`${img.id}-${i}`}
                src={unsplash(img.id, 1100)}
                alt=""
                fill
                sizes="40vw"
                className={cn(
                  "object-cover transition-[opacity,transform] duration-[1.2s] ease-[var(--ease-out)]",
                  hovered === i ? "opacity-100 scale-100" : "opacity-0 scale-[1.06]"
                )}
                style={{ objectPosition: img.position }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/60 to-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-8 text-[14px]">
            <div data-menu-fade>
              <p className="micro-sm text-stone mb-3">Contact</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="block hover:text-champagne transition-colors break-all">
                {CONTACT_EMAIL}
              </a>
              <a
                href={WHATSAPP_GENERAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-1 hover:text-champagne transition-colors"
              >
                {WHATSAPP_DISPLAY_PHONE}
              </a>
              <p className="mt-1 text-stone">Marbella, Costa del Sol</p>
            </div>
            <div data-menu-fade>
              <p className="micro-sm text-stone mb-3">Follow</p>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="block hover:text-champagne transition-colors">
                Instagram
              </a>
              <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className="block mt-1 hover:text-champagne transition-colors">
                TikTok
              </a>
            </div>
          </div>

          <div data-menu-fade className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-6 border-t border-ivory/10">
            <button
              type="button"
              onClick={() => {
                onClose();
                window.setTimeout(() => replayIntro((href) => navigate(href)), 500);
              }}
              className="micro-sm text-stone hover:text-ivory transition-colors"
            >
              Replay introduction
            </button>
            {sound.supported && (
              <button
                type="button"
                onClick={sound.toggle}
                aria-pressed={sound.enabled}
                className="micro-sm text-stone hover:text-ivory transition-colors inline-flex items-center gap-2.5"
              >
                <SoundBars active={sound.enabled} /> Sound {sound.enabled ? "on" : "off"}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import TransitionLink from "@/components/motion/TransitionLink";
import { useSound, SoundBars } from "@/components/experience/SoundProvider";
import { useConcierge } from "@/components/concierge/ConciergeProvider";
import { InstagramIcon, TikTokIcon, SearchIcon } from "./SocialIcons";
import { INSTAGRAM_URL, TIKTOK_URL } from "@/lib/social";
import { NAV_LINKS } from "./nav-links";
import FullscreenMenu from "./FullscreenMenu";
import SearchOverlay from "./SearchOverlay";
import { cn } from "@/lib/utils";

/**
 * Transparent over imagery, compacting into a floating glass bar on scroll.
 * Colours follow the section underneath via [data-nav-theme] markers.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const sound = useSound();
  const concierge = useConcierge();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let raf = 0;
    let lastY = window.scrollY;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 24);
      const delta = y - lastY;
      if (y > window.innerHeight * 0.75 && delta > 6) setHidden(true);
      else if (delta < -6 || y < 120) setHidden(false);
      lastY = y;

      const probe = 40;
      let next: "dark" | "light" = "light";
      const markers = document.querySelectorAll<HTMLElement>("[data-nav-theme]");
      for (const el of markers) {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) next = (el.dataset.navTheme as "dark" | "light") ?? "light";
      }
      setTheme(next);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    const settle = window.setTimeout(update, 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(settle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  const effectiveTheme = menuOpen ? "dark" : theme;
  const onDark = effectiveTheme === "dark";

  return (
    <>
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-4 z-[200] bg-ivory text-ink px-4 py-3 micro"
      >
        Skip to content
      </a>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[60] transition-transform duration-700 ease-[var(--ease-out)]",
          hidden && !menuOpen && !searchOpen ? "-translate-y-[130%]" : "translate-y-0"
        )}
      >
        <div
          className={cn(
            "transition-[padding] duration-700 ease-[var(--ease-out)]",
            scrolled && !menuOpen ? "px-2 pt-2 sm:px-3 sm:pt-3" : "px-0 pt-0"
          )}
        >
          <div
            className={cn(
              "relative flex items-center justify-between transition-[height,padding,background-color,border-color,color] duration-700 ease-[var(--ease-out)]",
              scrolled && !menuOpen
                ? cn("h-16 px-4 md:px-6", onDark ? "surface-glass" : "surface-glass-light")
                : "h-[var(--nav-h)] px-[var(--gutter)] border border-transparent",
              onDark ? "text-ivory" : "text-ink"
            )}
          >
            {/* Brand */}
            <TransitionLink
              href="/"
              aria-label="Real Property Estate — home"
              className="group relative flex items-center gap-3.5 shrink-0"
            >
              <span className="relative block h-9 w-[38px] sm:h-10 sm:w-[42px]">
                <Image
                  src="/brand/monogram-light.png"
                  alt=""
                  fill
                  sizes="42px"
                  priority
                  className={cn("object-contain transition-opacity duration-500", onDark ? "opacity-100" : "opacity-0")}
                />
                <Image
                  src="/brand/monogram-dark.png"
                  alt=""
                  fill
                  sizes="42px"
                  priority
                  className={cn("object-contain transition-opacity duration-500", onDark ? "opacity-0" : "opacity-100")}
                />
              </span>
              <span className="hidden sm:flex flex-col leading-none">
                <span className="font-serif uppercase tracking-[0.2em] text-[14px]">Real Property Estate</span>
                <span className={cn("micro-sm mt-1.5 transition-colors", onDark ? "text-champagne" : "text-bronze")}>
                  Marbella
                </span>
              </span>
            </TransitionLink>

            {/* Primary nav (desktop) */}
            <nav aria-label="Primary" className="hidden xl:flex items-center gap-10 2xl:gap-11 absolute left-1/2 -translate-x-1/2">
              {NAV_LINKS.map((link, i) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <TransitionLink
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className="group relative micro flex items-start gap-1.5 py-2"
                  >
                    <span className="text-[9px] opacity-50 tracking-normal">0{i + 1}</span>
                    <span>{link.short}</span>
                    <span
                      className={cn(
                        "absolute left-0 right-0 -bottom-0.5 h-px bg-current origin-left transition-transform duration-700 ease-[var(--ease-out)]",
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      )}
                    />
                  </TransitionLink>
                );
              })}
            </nav>

            {/* Utilities */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden 2xl:flex items-center gap-1 mr-2">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="p-2.5 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <InstagramIcon className="w-[17px] h-[17px]" />
                </a>
                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="p-2.5 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <TikTokIcon className="w-[17px] h-[17px]" />
                </a>
              </div>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search residences"
                className="p-3 opacity-80 hover:opacity-100 transition-opacity"
              >
                <SearchIcon className="w-[18px] h-[18px]" />
              </button>

              {sound.supported && (
                <button
                  type="button"
                  onClick={sound.toggle}
                  aria-pressed={sound.enabled}
                  aria-label={sound.enabled ? "Turn sound off" : "Turn sound on"}
                  className="hidden md:inline-flex items-center gap-2.5 px-3 py-3 micro-sm opacity-80 hover:opacity-100 transition-opacity"
                >
                  <SoundBars active={sound.enabled} />
                  <span className="w-[22px] text-left">{sound.enabled ? "On" : "Off"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => concierge.open()}
                className={cn(
                  "hidden md:inline-flex items-center gap-3 h-10 pl-3.5 pr-4 micro-sm border transition-colors duration-500",
                  onDark ? "border-ivory/25 hover:bg-ivory hover:text-ink" : "border-ink/20 hover:bg-ink hover:text-ivory"
                )}
              >
                <span className="relative w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-champagne" />
                  <span className="absolute -inset-1 rounded-full border border-champagne/60 animate-[breathe_3s_ease-in-out_infinite]" />
                </span>
                Concierge
              </button>

              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="site-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="group inline-flex items-center gap-3 pl-3 pr-1 py-3 micro-sm"
              >
                <span className="hidden sm:inline w-[38px] text-right" aria-hidden="true">
                  {menuOpen ? "Close" : "Menu"}
                </span>
                <span className="relative block w-6 h-3" aria-hidden="true">
                  <span
                    className={cn(
                      "absolute left-0 right-0 h-px bg-current transition-transform duration-500 ease-[var(--ease-out)]",
                      menuOpen ? "top-1/2 rotate-45" : "top-0 group-hover:scale-x-75 origin-right"
                    )}
                  />
                  <span
                    className={cn(
                      "absolute left-0 right-0 h-px bg-current transition-transform duration-500 ease-[var(--ease-out)]",
                      menuOpen ? "top-1/2 -rotate-45" : "bottom-0"
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <FullscreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

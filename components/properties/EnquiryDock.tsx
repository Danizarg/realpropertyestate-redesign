"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { scrollToElement } from "@/components/motion/scroll";
import { WhatsAppIcon } from "@/components/site/SocialIcons";
import ShareButton from "./ShareButton";
import { cn } from "@/lib/utils";

/**
 * Sticky enquiry bar: appears once the hero has scrolled away and steps aside
 * while the enquiry form itself is on screen.
 */
export default function EnquiryDock({
  name,
  price,
  coverUrl,
  whatsappUrl,
}: {
  name: string;
  price: string;
  coverUrl: string | null;
  whatsappUrl: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let pastHero = false;
    let formInView = false;
    const sync = () => setVisible(pastHero && !formInView);
    const hero = document.querySelector("[data-shared-target]")?.closest("section");
    const form = document.getElementById("enquiry");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === hero) pastHero = !e.isIntersecting && e.boundingClientRect.top < 0;
          if (e.target === form) formInView = e.isIntersecting;
        }
        sync();
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    if (hero) io.observe(hero);
    if (form) io.observe(form);
    return () => io.disconnect();
  }, []);

  // Let the concierge launcher sit above the dock on phones.
  useEffect(() => {
    const root = document.documentElement;
    const h = ref.current?.offsetHeight ?? 0;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    root.style.setProperty("--dock-offset", visible && narrow ? `${h + 8}px` : "0px");
    return () => root.style.setProperty("--dock-offset", "0px");
  }, [visible]);

  return (
    <div
      ref={ref}
      className={cn(
        "fixed z-[50] inset-x-0 bottom-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-5 transition-[opacity,transform] duration-700 ease-[var(--ease-out)]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
      )}
      inert={!visible}
    >
      <div className="surface-glass text-ivory flex items-center gap-3 md:gap-5 p-2.5 md:pl-2.5 md:pr-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:pb-2.5">
        {coverUrl && (
          <span className="relative hidden sm:block w-14 h-11 overflow-hidden shrink-0">
            <Image src={coverUrl} alt="" fill sizes="56px" className="object-cover" />
          </span>
        )}
        <span className="min-w-0 flex-1 md:flex-none md:max-w-[16rem]">
          <span className="block text-[13px] truncate">{name}</span>
          <span className="block font-serif text-[15px] text-champagne truncate">{price}</span>
        </span>
        <ShareButton title={name} label="Share" className="hidden md:inline-flex micro-sm px-3 py-3 hover:text-champagne transition-colors" />
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp about ${name}`}
          className="inline-flex items-center justify-center w-11 h-11 border border-ivory/20 hover:bg-ivory hover:text-ink transition-colors"
        >
          <WhatsAppIcon className="w-5 h-5" />
        </a>
        <button
          type="button"
          onClick={() => scrollToElement("#enquiry", -24)}
          className="btn btn-light !min-h-11 !px-5"
        >
          Request a viewing
        </button>
      </div>
    </div>
  );
}

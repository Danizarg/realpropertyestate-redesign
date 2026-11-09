"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { gsap, ScrollTrigger } from "./gsap";
import { scrollToTop } from "./scroll";
import { setCovering } from "./transition-state";
import { prefersReducedMotion } from "@/lib/experience";

export interface NavigateOptions {
  /** Shown on the curtain while the next page loads. */
  label?: string;
  /** An element containing an <img>; it will morph into the next page's hero. */
  image?: HTMLElement | null;
}

interface TransitionContextValue {
  navigate: (href: string, options?: NavigateOptions) => void;
}

const TransitionContext = createContext<TransitionContextValue>({
  navigate: () => {},
});

export const usePageTransition = () => useContext(TransitionContext);

function labelForPath(pathname: string): string {
  if (pathname === "/") return "Marbella";
  if (pathname === "/properties") return "Residences";
  if (pathname.startsWith("/properties/")) return "Residence";
  if (pathname === "/about") return "Our story";
  if (pathname === "/contact") return "Private enquiry";
  return "Real Property Estate";
}

type Pending =
  | { mode: "curtain"; path: string }
  | { mode: "image"; path: string; clone: HTMLDivElement }
  | null;

/**
 * Seamless navigation: an obsidian curtain (or a shared image that grows into
 * the next page's hero) covers the page, the route changes underneath, and the
 * new page is revealed — no white flashes, no hard cuts.
 */
export default function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const curtainRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const pending = useRef<Pending>(null);
  const busy = useRef(false);
  const fallbackTimer = useRef(0);

  const finish = useCallback(() => {
    window.clearTimeout(fallbackTimer.current);
    busy.current = false;
    pending.current = null;
    setCovering(false);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, []);

  const revealCurtain = useCallback(() => {
    const curtain = curtainRef.current;
    if (!curtain) return finish();
    scrollToTop(true);
    gsap.set("[data-page-root]", { opacity: 1 });
    gsap.killTweensOf(progressRef.current);
    gsap
      .timeline({ onComplete: () => gsap.set(curtain, { visibility: "hidden", yPercent: 100 }) })
      .to(labelRef.current, { opacity: 0, y: -16, duration: 0.4, ease: "power2.in" })
      .to(curtain, { yPercent: -100, duration: 0.85, ease: "expo.inOut" }, 0.1)
      .add(finish, 0.45);
  }, [finish]);

  const revealImage = useCallback(
    (clone: HTMLDivElement) => {
      scrollToTop(true);
      gsap.set("[data-page-root]", { opacity: 1 });
      const started = performance.now();
      const poll = () => {
        const target = document.querySelector<HTMLImageElement>("[data-shared-target] img");
        const ready = target && target.complete && target.naturalWidth > 0;
        if (ready || performance.now() - started > 3000) {
          gsap.to(clone, {
            opacity: 0,
            duration: 0.7,
            ease: "power2.out",
            onComplete: () => clone.remove(),
          });
          finish();
          return;
        }
        window.setTimeout(poll, 50);
      };
      poll();
    },
    [finish]
  );

  // A fresh mount (e.g. returning from the owner area) never starts covered.
  useEffect(() => {
    setCovering(false);
  }, []);

  // The new route has committed: reveal it.
  useEffect(() => {
    const p = pending.current;
    if (!p) return;
    if (p.mode === "curtain") revealCurtain();
    else revealImage(p.clone);
  }, [pathname, revealCurtain, revealImage]);

  const navigate = useCallback(
    (href: string, options: NavigateOptions = {}) => {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        window.location.href = href;
        return;
      }
      const target = url.pathname + url.search + url.hash;
      if (busy.current) return;

      if (url.pathname === window.location.pathname || prefersReducedMotion()) {
        router.push(target, { scroll: url.pathname !== window.location.pathname });
        return;
      }

      busy.current = true;
      setCovering(true);
      const armFallback = () => {
        window.clearTimeout(fallbackTimer.current);
        fallbackTimer.current = window.setTimeout(() => {
          const p = pending.current;
          if (!p) return;
          if (p.mode === "curtain") revealCurtain();
          else revealImage(p.clone);
        }, 6000);
      };

      const sourceImg = options.image?.querySelector("img") as HTMLImageElement | null;
      if (options.image && sourceImg) {
        const rect = options.image.getBoundingClientRect();
        const clone = document.createElement("div");
        clone.setAttribute("aria-hidden", "true");
        Object.assign(clone.style, {
          position: "fixed",
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          overflow: "hidden",
          zIndex: "95",
          pointerEvents: "none",
          background: "#101413",
        } satisfies Partial<CSSStyleDeclaration>);
        const img = document.createElement("img");
        img.src = sourceImg.currentSrc || sourceImg.src;
        img.alt = "";
        Object.assign(img.style, {
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: getComputedStyle(sourceImg).objectPosition,
        } satisfies Partial<CSSStyleDeclaration>);
        clone.appendChild(img);
        document.body.appendChild(clone);

        gsap
          .timeline()
          .to("[data-page-root]", { opacity: 0, duration: 0.5, ease: "power2.out" }, 0)
          .to(
            clone,
            {
              left: 0,
              top: 0,
              width: window.innerWidth,
              height: window.innerHeight,
              duration: 1,
              ease: "expo.inOut",
            },
            0
          )
          .add(() => {
            pending.current = { mode: "image", path: url.pathname, clone };
            router.push(target, { scroll: false });
            armFallback();
          });
        return;
      }

      const curtain = curtainRef.current;
      if (!curtain) {
        router.push(target);
        finish();
        return;
      }
      if (labelRef.current) labelRef.current.textContent = options.label ?? labelForPath(url.pathname);
      gsap.set(curtain, { visibility: "visible", yPercent: 100 });
      gsap.set(labelRef.current, { opacity: 0, y: 24 });
      gsap
        .timeline()
        .to(curtain, { yPercent: 0, duration: 0.8, ease: "expo.inOut" })
        .to(labelRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, "-=0.3")
        .fromTo(
          progressRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 2.4, ease: "power1.inOut", repeat: -1, transformOrigin: "0% 50%" },
          "-=0.4"
        )
        .add(() => {
          pending.current = { mode: "curtain", path: url.pathname };
          router.push(target, { scroll: false });
          armFallback();
        }, 0.8);
    },
    [router, finish, revealCurtain, revealImage]
  );

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div
        ref={curtainRef}
        aria-hidden="true"
        className="fixed inset-0 z-[96] bg-obsidian text-ivory flex flex-col items-center justify-center"
        style={{ visibility: "hidden", transform: "translateY(100%)" }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-champagne/40" />
        <Image
          src="/brand/monogram-light.png"
          alt=""
          width={286}
          height={272}
          className="w-12 h-auto opacity-80 mb-8"
        />
        <p ref={labelRef} className="font-serif italic font-light text-[clamp(2.5rem,6vw,5rem)] leading-none">
          Marbella
        </p>
        <span className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40 h-px bg-ivory/10 overflow-hidden">
          <span ref={progressRef} className="block h-full w-full bg-champagne/70" style={{ transform: "scaleX(0)" }} />
        </span>
      </div>
    </TransitionContext.Provider>
  );
}

"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useIsoLayoutEffect } from "./gsap";
import { whenPageRevealed } from "./transition-state";
import { prefersReducedMotion } from "@/lib/experience";

type RevealVariant = "up" | "fade" | "mask";

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  /** Animate direct children one after another instead of the wrapper. */
  stagger?: number;
  start?: string;
  children?: React.ReactNode;
}

/** Scroll-triggered entrance. Content is visible without JS and for reduced motion. */
export function Reveal({
  as: Tag = "div",
  variant = "up",
  delay = 0,
  duration = 1.4,
  stagger,
  start = "top 88%",
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = stagger ? (Array.from(el.children) as HTMLElement[]) : [el];
    if (prefersReducedMotion()) {
      gsap.set([el, ...targets], { opacity: 1, y: 0, clipPath: "none" });
      return;
    }
    let trigger: ScrollTrigger | null = null;
    const ctx = gsap.context(() => {
      if (stagger) {
        gsap.set(el, { opacity: 1, y: 0, clipPath: "none" });
        gsap.set(targets, variant === "mask" ? { clipPath: "inset(100% 0 0 0)" } : { opacity: 0, y: variant === "up" ? 40 : 0 });
      }
    }, el);

    const cancel = whenPageRevealed(() => {
      ctx.add(() => {
        trigger = ScrollTrigger.create({
          trigger: el,
          start,
          once: true,
          onEnter: () => {
            const vars: gsap.TweenVars =
              variant === "mask"
                ? { clipPath: "inset(0% 0 0 0)", opacity: 1, duration: duration + 0.2, ease: "expo.inOut" }
                : { opacity: 1, y: 0, duration, ease: "expo.out" };
            gsap.to(targets, { ...vars, delay, stagger: stagger ?? 0 });
          },
        });
      });
    });
    return () => {
      cancel();
      trigger?.kill();
      ctx.revert();
    };
  }, [variant, delay, duration, stagger, start]);

  return (
    <Tag ref={ref} data-reveal={stagger ? undefined : variant} data-reveal-children={stagger ? variant : undefined} {...rest}>
      {children}
    </Tag>
  );
}

interface SplitRevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  /** "lines" for paragraphs/headlines, "chars" for short display words. */
  split?: "lines" | "words" | "chars";
  /** "scroll" waits for the viewport; "mount" plays once the page is revealed. */
  trigger?: "scroll" | "mount";
  delay?: number;
  stagger?: number;
  duration?: number;
  start?: string;
  /** Wait for an external signal (e.g. the intro) before playing on mount. */
  waitFor?: (play: () => void) => () => void;
  children?: React.ReactNode;
}

/** Masked line / word / character reveal using GSAP SplitText (screen-reader safe). */
export function SplitReveal({
  as: Tag = "div",
  split = "lines",
  trigger = "scroll",
  delay = 0,
  stagger,
  duration = 1.35,
  start = "top 86%",
  waitFor,
  children,
  ...rest
}: SplitRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1 });
      return;
    }

    let splitInstance: SplitText | null = null;
    let tween: gsap.core.Tween | null = null;
    let played = false;
    let cancelWait: () => void = () => {};

    const each = split === "chars" ? 0.035 : split === "words" ? 0.06 : 0.11;

    const build = () => {
      splitInstance = SplitText.create(el, {
        type: split === "lines" ? "lines" : split === "words" ? "words,lines" : "chars,words",
        mask: split === "lines" ? "lines" : split === "words" ? "lines" : "words",
        linesClass: "split-line",
        autoSplit: true,
        onSplit(self) {
          const items = split === "lines" ? self.lines : split === "words" ? self.words : self.chars;
          gsap.set(el, { opacity: 1 });
          tween?.kill();
          tween = gsap.from(items, {
            yPercent: 115,
            opacity: split === "chars" ? 0 : 1,
            duration,
            ease: "expo.out",
            stagger: stagger ?? each,
            delay,
            paused: !played,
          });
          return tween;
        },
      });
    };

    const play = () => {
      played = true;
      tween?.play();
    };

    build();

    let st: ScrollTrigger | null = null;
    const cancelReveal = whenPageRevealed(() => {
      if (trigger === "mount") {
        if (waitFor) cancelWait = waitFor(play);
        else play();
      } else {
        st = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: play });
      }
    });

    return () => {
      cancelReveal();
      cancelWait();
      st?.kill();
      tween?.kill();
      splitInstance?.revert();
    };
  }, [split, trigger, delay, stagger, duration, start, waitFor]);

  return (
    <Tag ref={ref} data-split="" {...rest}>
      {children}
    </Tag>
  );
}

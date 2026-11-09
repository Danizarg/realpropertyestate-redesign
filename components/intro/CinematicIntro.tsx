"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useIsoLayoutEffect } from "@/components/motion/gsap";
import { markIntroComplete, resetIntroComplete } from "@/components/motion/transition-state";
import { useSound, AMBIENT_LEVEL, SoundBars } from "@/components/experience/SoundProvider";
import { prefetchSpeech, speak, stopSpeaking, unlockSpeech, type SpeakHandle } from "@/lib/audio/voice";
import { IMAGERY, unsplash } from "@/lib/media-library";
import { prefersReducedMotion, readPref, STORAGE, writePref } from "@/lib/experience";
import { REPLAY_EVENT } from "./replay";
import type { HomepageCoverSettings } from "@/lib/types";
import { HERO_SCRIM } from "@/lib/scrims";
import { cn } from "@/lib/utils";

const NARRATION = [
  "Welcome to Marbella.",
  "A place where extraordinary living meets timeless beauty.",
  "Discover your next chapter with Real Property Estate.",
];

const SCENE_IMAGES = [IMAGERY.banusDusk, IMAGERY.stairsToSea];

type Phase = "arrival" | "playing" | "leaving" | "done";

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const capped = (p: Promise<void> | undefined, ms: number) => (p ? Promise.race([p, wait(ms)]) : Promise.resolve());

/**
 * "Welcome to Marbella" — a fullscreen opening sequence.
 *  I.   Arrival: the emblem in darkness and a sound-consent prompt.
 *  II.  Three scenes with choreographed typography, optionally narrated and
 *       scored; each act advances only when its line has been spoken.
 *  III. Hand-off: the last frame is the homepage cover itself, so the overlay
 *       dissolves into the hero without a cut.
 * Skippable at any moment (button or Escape); shown once per visitor and
 * replayable from the menu or footer.
 */
export default function CinematicIntro({ cover }: { cover: HomepageCoverSettings }) {
  const sound = useSound();
  const soundRef = useRef(sound);
  useIsoLayoutEffect(() => {
    soundRef.current = sound;
  });

  const [phase, setPhase] = useState<Phase>("arrival");
  const [withSound, setWithSound] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [caption, setCaption] = useState<number>(-1);
  const [act, setAct] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const scenes = useRef<(HTMLDivElement | null)[]>([]);
  const media = useRef<(HTMLDivElement | null)[]>([]);
  const emblem = useRef<HTMLDivElement>(null);
  const consent = useRef<HTMLDivElement>(null);
  const enterBtn = useRef<HTMLButtonElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const t1 = useRef<HTMLDivElement>(null);
  const t2 = useRef<HTMLDivElement>(null);
  const t3 = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);

  const run = useRef(0);
  const speech = useRef<SpeakHandle | null>(null);
  const timelines = useRef<gsap.core.Timeline[]>([]);
  const reduced = useRef(false);
  const narratedRef = useRef(false);

  // Skip immediately for returning visitors (decided pre-paint).
  useIsoLayoutEffect(() => {
    reduced.current = prefersReducedMotion();
    const replayFlag = readPref(STORAGE.introReplay, true);
    if (replayFlag) {
      writePref(STORAGE.introReplay, null, true);
      document.documentElement.removeAttribute("data-intro");
    }
    if (document.documentElement.getAttribute("data-intro") === "skip") {
      setPhase("done");
      markIntroComplete();
    }
  }, []);

  const killAll = () => {
    timelines.current.forEach((t) => t.kill());
    timelines.current = [];
    speech.current?.cancel();
    stopSpeaking();
  };

  const finish = useCallback(() => {
    document.documentElement.setAttribute("data-intro", "skip");
    setPhase("done");
    // The scrollbar returns now — re-measure pinned scenes.
    requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
  }, []);

  const handoff = useCallback(
    (fast: boolean) => {
      run.current += 1;
      killAll();
      const s = soundRef.current;
      if (s.enabled) s.setLevel(AMBIENT_LEVEL.bed, 5);
      writePref(STORAGE.introSeen, "1");
      setPhase("leaving");
      setCaption(-1);
      markIntroComplete();
      const lastMedia = media.current[2];
      // The final frame keeps easing toward the hero framing (matching the
      // hero's own 2.4s settle), but the page is released as soon as the
      // overlay has faded — never held for the full camera move.
      const fadeStart = fast ? 0.1 : 0.5;
      const fadeDuration = fast ? 0.8 : 1.4;
      gsap.to(lastMedia, { scale: 1, duration: 2.4, ease: "expo.out" });
      const tl = gsap.timeline();
      tl.to([t1.current, t2.current, t3.current, chrome.current, emblem.current], {
        opacity: 0,
        duration: fast ? 0.4 : 0.8,
        ease: "power2.out",
      })
        .to(root.current, { autoAlpha: 0, duration: fadeDuration, ease: "power2.inOut" }, fadeStart)
        .add(finish, fadeStart + fadeDuration);
      timelines.current.push(tl);
    },
    [finish]
  );

  const sequence = useCallback(
    async (narrated: boolean) => {
      const id = ++run.current;
      const alive = () => run.current === id;
      const d = (s: number) => (reduced.current ? 0.001 : s);
      setPhase("playing");
      setAct(1);

      narratedRef.current = narrated;
      const say = (i: number) => {
        setCaption(i);
        if (!narratedRef.current) return undefined;
        speech.current = speak(NARRATION[i], { connect: soundRef.current.connectVoice });
        return speech.current.done;
      };

      const chars1 = t1.current?.querySelectorAll("[data-c]") ?? [];
      const words2 = t2.current?.querySelectorAll("[data-w]") ?? [];

      // ── Act I — Marbella
      const a1 = gsap.timeline();
      a1.to(consent.current, { autoAlpha: 0, y: -12, duration: 0.6, ease: "power2.in" })
        .to(emblem.current, { autoAlpha: 0, scale: d(0.92), duration: 1.1, ease: "power3.inOut" }, 0.15)
        .set(scenes.current[0], { opacity: 1 }, 0.5)
        .fromTo(
          scenes.current[0],
          { clipPath: reduced.current ? "inset(0% 0% 0% 0%)" : "inset(49.6% 0% 49.6% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: d(2.1), ease: "expo.inOut" },
          0.5
        )
        .fromTo(media.current[0], { scale: reduced.current ? 1 : 1.4 }, { scale: reduced.current ? 1 : 1.1, duration: d(8.5), ease: "power2.out" }, 0.5)
        .fromTo(chars1, { yPercent: reduced.current ? 0 : 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.6, stagger: 0.07, ease: "expo.out" }, 1.6)
        .fromTo(t1.current?.querySelector("[data-sub]") ?? null, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1.2 }, 2.6)
        .fromTo(progress.current, { scaleX: 0 }, { scaleX: 1 / 3, duration: 6, ease: "none" }, 0.5);
      timelines.current.push(a1);

      await wait(1700);
      if (!alive()) return;
      const l1 = say(0);
      await Promise.all([wait(3800), capped(l1, 7000)]);
      if (!alive()) return;

      // ── Act II — a place to call home
      setAct(2);
      const a2 = gsap.timeline();
      a2.to(chars1, { yPercent: reduced.current ? 0 : -120, opacity: 0, duration: 0.9, stagger: 0.035, ease: "expo.in" })
        .to(t1.current?.querySelector("[data-sub]") ?? null, { opacity: 0, duration: 0.5 }, 0)
        .to(scenes.current[1], { opacity: 1, duration: 1.9, ease: "power2.inOut" }, 0.5)
        .fromTo(
          media.current[1],
          { scale: reduced.current ? 1 : 1.26, yPercent: reduced.current ? 0 : -3 },
          { scale: reduced.current ? 1 : 1.08, yPercent: reduced.current ? 0 : 2, duration: d(10), ease: "none" },
          0.5
        )
        .fromTo(words2, { yPercent: reduced.current ? 0 : 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.5, stagger: 0.085, ease: "expo.out" }, 1.5)
        .to(progress.current, { scaleX: 2 / 3, duration: 6, ease: "none" }, 0.5);
      timelines.current.push(a2);

      await wait(1400);
      if (!alive()) return;
      const l2 = say(1);
      await Promise.all([wait(4700), capped(l2, 9500)]);
      if (!alive()) return;

      // ── Act III — Real Property Estate (the homepage cover)
      setAct(3);
      const brand = t3.current;
      const a3 = gsap.timeline();
      a3.to(words2, { yPercent: reduced.current ? 0 : -115, opacity: 0, duration: 0.9, stagger: 0.03, ease: "expo.in" })
        .set(scenes.current[2], { opacity: 1 }, 0.5)
        .fromTo(
          scenes.current[2],
          { clipPath: reduced.current ? "inset(0% 0% 0% 0%)" : "inset(24% 32% 24% 32%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: d(2.4), ease: "expo.inOut" },
          0.5
        )
        .fromTo(media.current[2], { scale: reduced.current ? 1.08 : 1.4 }, { scale: 1.08, duration: d(3.2), ease: "expo.inOut" }, 0.5)
        .fromTo(
          brand?.querySelector("[data-brand]") ?? null,
          { opacity: 0, letterSpacing: reduced.current ? "0.24em" : "0.7em" },
          { opacity: 1, letterSpacing: "0.24em", duration: 2.6, ease: "expo.out" },
          1.7
        )
        .fromTo(brand?.querySelector("[data-rule]") ?? null, { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: "expo.inOut" }, 2.1)
        .fromTo(brand?.querySelector("[data-tag]") ?? null, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 1.2 }, 2.5)
        .to(progress.current, { scaleX: 1, duration: 5.5, ease: "none" }, 0.5);
      timelines.current.push(a3);

      await wait(1800);
      if (!alive()) return;
      const l3 = say(2);
      await Promise.all([wait(4300), capped(l3, 8500)]);
      if (!alive()) return;
      handoff(false);
    },
    [handoff]
  );

  const begin = useCallback(
    (narrated: boolean) => {
      // Called directly from a click: audio may start here.
      setWithSound(narrated);
      const captionPref = readPref(STORAGE.captions);
      setCaptionsOn(captionPref ? captionPref === "on" : narrated);
      if (narrated) {
        unlockSpeech();
        void prefetchSpeech(NARRATION);
        soundRef.current.enable(AMBIENT_LEVEL.intro);
      } else if (soundRef.current.enabled) {
        soundRef.current.disable();
      }
      void sequence(narrated);
    },
    [sequence]
  );

  // Arrival choreography whenever the intro (re)starts.
  useEffect(() => {
    if (phase !== "arrival") return;
    const el = root.current;
    if (!el || document.documentElement.getAttribute("data-intro") === "skip") return;
    SCENE_IMAGES.forEach((img) => {
      const pre = new window.Image();
      pre.src = unsplash(img.id, 2400);
    });
    gsap.set(el, { autoAlpha: 1 });
    gsap.set(scenes.current, { opacity: 0 });
    const tl = gsap.timeline();
    tl.fromTo(el.querySelector("[data-glow]"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 2.6, ease: "power2.out" })
      .fromTo(
        el.querySelector("[data-emblem]"),
        { opacity: 0, y: 14, filter: "blur(10px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.9, ease: "expo.out" },
        0.2
      )
      .fromTo(el.querySelectorAll("[data-rule-arrival]"), { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: "expo.inOut" }, 0.7)
      .fromTo(
        el.querySelector("[data-wordmark]"),
        { opacity: 0, letterSpacing: "0.62em" },
        { opacity: 1, letterSpacing: "0.34em", duration: 2.2, ease: "expo.out" },
        0.8
      )
      .fromTo(chrome.current, { opacity: 0 }, { opacity: 1, duration: 1 }, 0.9)
      .fromTo(
        consent.current,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 1.3, ease: "expo.out", onComplete: () => enterBtn.current?.focus({ preventScroll: true }) },
        1.7
      );
    timelines.current.push(tl);
    return () => {
      tl.kill();
    };
  }, [phase]);

  // Keep keyboard and screen-reader focus inside the intro while it plays.
  useEffect(() => {
    if (phase === "done") return;
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("header, [data-concierge-launcher], [data-site-footer], main > :not(.rpe-intro)")
    );
    els.forEach((e) => e.setAttribute("inert", ""));
    return () => els.forEach((e) => e.removeAttribute("inert"));
  }, [phase]);

  // Replay from the menu / footer.
  useEffect(() => {
    const onReplay = () => {
      killAll();
      resetIntroComplete();
      document.documentElement.removeAttribute("data-intro");
      setCaption(-1);
      setAct(0);
      setPhase("arrival");
    };
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, []);

  // Escape always skips.
  useEffect(() => {
    if (phase === "done" || phase === "leaving") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handoff(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handoff]);

  useEffect(() => () => killAll(), []);

  if (phase === "done") return null;

  const toggleCaptions = () => {
    setCaptionsOn((v) => {
      writePref(STORAGE.captions, v ? "off" : "on");
      return !v;
    });
  };

  return (
    <div
      ref={root}
      className="rpe-intro fixed inset-0 z-[120] bg-obsidian text-ivory overflow-hidden select-none"
      data-state={phase}
      role="dialog"
      aria-modal="true"
      aria-label="Introduction: Welcome to Marbella"
    >
      {/* Scenes */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(el) => {
            scenes.current[i] = el;
          }}
          className="absolute inset-0 overflow-hidden"
          style={{ opacity: 0 }}
          aria-hidden="true"
        >
          <div
            ref={(el) => {
              media.current[i] = el;
            }}
            className="absolute inset-0 will-change-transform"
          >
            {i < 2 ? (
              <Image
                src={unsplash(SCENE_IMAGES[i].id, 2400)}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: SCENE_IMAGES[i].position }}
              />
            ) : cover.mediaType === "video" ? (
              <video src={cover.mediaUrl} autoPlay muted loop playsInline preload="auto" className="img-cover" />
            ) : (
              <Image src={cover.mediaUrl} alt="" fill sizes="100vw" className="object-cover" />
            )}
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                i === 2
                  ? HERO_SCRIM
                  : "radial-gradient(120% 90% at 50% 45%, rgba(16,20,19,0.12) 0%, rgba(16,20,19,0.55) 70%, rgba(16,20,19,0.85) 100%)",
            }}
          />
        </div>
      ))}

      {/* Arrival: emblem + consent */}
      <div ref={emblem} className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <div className="relative flex flex-col items-center">
          <div
            data-glow
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 w-[36rem] h-[36rem] -ml-[18rem] -mt-[19rem] pointer-events-none"
            style={{ background: "radial-gradient(closest-side, rgba(197,177,138,0.26) 0%, rgba(197,177,138,0.07) 45%, rgba(197,177,138,0) 100%)" }}
          />
          <Image
            data-emblem
            src="/brand/monogram-light.png"
            alt="Real Property Estate"
            width={286}
            height={272}
            priority
            className="relative w-16 sm:w-[4.6rem] h-auto"
          />
          <div className="relative mt-8 flex items-center gap-4">
            <span data-rule-arrival className="block h-px w-10 sm:w-16 bg-champagne/60 origin-right" />
            <span data-wordmark className="font-serif uppercase text-[13px] sm:text-[15px] tracking-[0.34em] whitespace-nowrap">
              Real Property Estate
            </span>
            <span data-rule-arrival className="block h-px w-10 sm:w-16 bg-champagne/60 origin-left" />
          </div>
        </div>

        <div ref={consent} className="relative mt-16 sm:mt-20 text-center max-w-md" style={{ opacity: 0, visibility: "hidden" }}>
          <p className="font-serif italic font-light text-[clamp(1.6rem,3.4vw,2.3rem)] leading-tight">
            Experience Marbella with sound
          </p>
          <p className="mt-4 text-[13.5px] leading-relaxed text-stone">
            A short cinematic introduction with narration and an ambient score. Captions are available.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button ref={enterBtn} type="button" onClick={() => begin(true)} className="btn btn-light">
              <SoundBars active className="text-obsidian" />
              Enter with sound
            </button>
            <button type="button" onClick={() => begin(false)} className="btn btn-ghost-light">
              Continue silently
            </button>
          </div>
        </div>
      </div>

      {/* Act I */}
      <div ref={t1} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden={act !== 1}>
        <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(60% 42% at 50% 50%, rgba(16,20,19,0.38) 0%, rgba(16,20,19,0) 100%)" }} />
        <p className="relative flex overflow-hidden font-serif font-light text-[clamp(3.6rem,13vw,13rem)] leading-[0.9] tracking-[0.04em] pb-[0.08em]">
          {"MARBELLA.".split("").map((c, i) => (
            <span key={i} data-c className="inline-block" style={{ opacity: 0 }}>
              {c}
            </span>
          ))}
        </p>
        <p data-sub className="relative micro mt-6 text-ivory/80" style={{ opacity: 0 }}>
          Costa del Sol · Spain
        </p>
      </div>

      {/* Act II */}
      <div ref={t2} className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none" aria-hidden={act !== 2}>
        <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(58% 46% at 50% 50%, rgba(16,20,19,0.45) 0%, rgba(16,20,19,0) 100%)" }} />
        <p className="relative font-serif italic font-light text-center text-[clamp(2.4rem,6.4vw,6.4rem)] leading-[1.02] max-w-[16ch]">
          {"An extraordinary place to call home.".split(" ").map((w, i, all) => (
            <span key={i}>
              <span className="inline-block overflow-hidden align-bottom pb-[0.1em]">
                <span data-w className="inline-block" style={{ opacity: 0 }}>
                  {w}
                </span>
              </span>
              {i < all.length - 1 ? " " : null}
            </span>
          ))}
        </p>
      </div>

      {/* Act III */}
      <div ref={t3} className="absolute inset-0 flex flex-col items-center justify-center px-6 pointer-events-none" aria-hidden={act !== 3}>
        <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(62% 38% at 50% 50%, rgba(16,20,19,0.55) 0%, rgba(16,20,19,0) 100%)" }} />
        <p data-brand className="relative font-serif uppercase text-center text-[clamp(1.7rem,4.6vw,4.4rem)] leading-tight tracking-[0.24em]" style={{ opacity: 0 }}>
          Real Property Estate
        </p>
        <span data-rule className="relative block mt-7 h-px w-24 bg-champagne" style={{ transform: "scaleX(0)" }} />
        <p data-tag className="relative micro mt-6 text-ivory/80" style={{ opacity: 0 }}>
          Essence of Marbella
        </p>
      </div>

      {/* Chrome: coordinates, skip, captions, sound, progress */}
      <div ref={chrome} className="absolute inset-0 pointer-events-none" style={{ opacity: 0 }}>
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-[var(--gutter)] h-[var(--nav-h)]">
          <p className="micro-sm text-ivory/60 hidden sm:block">36°30′ N · 4°53′ W</p>
          <button
            type="button"
            onClick={() => handoff(true)}
            className="pointer-events-auto ml-auto micro-sm inline-flex items-center gap-3 py-3 pl-4 hover:text-champagne transition-colors"
          >
            Skip intro
            <span aria-hidden="true" className="block w-8 h-px bg-current" />
          </button>
        </div>

        <div className="absolute bottom-0 inset-x-0 px-[var(--gutter)] pb-[max(1.6rem,env(safe-area-inset-bottom))]">
          <p
            aria-live="polite"
            className={cn(
              "mx-auto max-w-2xl text-center text-[15px] sm:text-[17px] leading-snug min-h-[3em] transition-opacity duration-700",
              captionsOn && caption >= 0 ? "opacity-100" : "opacity-0"
            )}
          >
            {captionsOn && caption >= 0 ? (
              <span className="bg-obsidian/55 px-3 py-1.5 box-decoration-clone">{NARRATION[caption]}</span>
            ) : null}
          </p>
          <div className="mt-4 flex items-center justify-between gap-6">
            <p className="micro-sm text-ivory/60 w-16">{act > 0 ? `0${act} / 03` : ""}</p>
            <span className="relative flex-1 max-w-xs h-px bg-ivory/15 overflow-hidden">
              <span ref={progress} className="absolute inset-0 bg-champagne origin-left" style={{ transform: "scaleX(0)" }} />
            </span>
            <div className="pointer-events-auto flex items-center gap-1 w-16 justify-end">
              {phase === "playing" && (
                <>
                  <button
                    type="button"
                    onClick={toggleCaptions}
                    aria-pressed={captionsOn}
                    aria-label={captionsOn ? "Hide captions" : "Show captions"}
                    className={cn("micro-sm px-2 py-2 border transition-colors", captionsOn ? "border-ivory/60" : "border-ivory/15 text-ivory/60")}
                  >
                    CC
                  </button>
                  {withSound && sound.supported && (
                    <button
                      type="button"
                      onClick={() => {
                        if (sound.enabled) {
                          sound.disable();
                          narratedRef.current = false;
                          speech.current?.cancel();
                          stopSpeaking();
                          setWithSound(false);
                        }
                      }}
                      aria-label="Mute sound"
                      className="p-2"
                    >
                      <SoundBars active={sound.enabled} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AmbientScore } from "@/lib/audio/ambient";
import { readPref, STORAGE, writePref } from "@/lib/experience";

export const AMBIENT_LEVEL = { intro: 0.09, bed: 0.04 } as const;

interface SoundContextValue {
  /** Ambient score currently playing. */
  enabled: boolean;
  /** The visitor's remembered choice ("on" | "off" | null when never asked). */
  preference: "on" | "off" | null;
  supported: boolean;
  /** Must be called from a click/tap handler (browser autoplay policy). */
  enable: (level?: number) => void;
  disable: () => void;
  toggle: () => void;
  setLevel: (level: number, fadeSeconds?: number) => void;
  /** Route an <audio> element (server voice) through a visualiser analyser. */
  connectVoice: (el: HTMLAudioElement) => void;
  voiceAnalyser: () => AnalyserNode | null;
  musicAnalyser: () => AnalyserNode | null;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used inside <SoundProvider>");
  return ctx;
}

export default function SoundProvider({ children }: { children: React.ReactNode }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const scoreRef = useRef<AmbientScore | null>(null);
  const voiceAnalyserRef = useRef<AnalyserNode | null>(null);
  const levelRef = useRef<number>(AMBIENT_LEVEL.bed);
  const [enabled, setEnabled] = useState(false);
  // Preference is only read by client-only features (intro, concierge), so
  // reading storage in the initialiser cannot cause a hydration mismatch.
  const [preference, setPreference] = useState<"on" | "off" | null>(() => {
    if (typeof window === "undefined") return null;
    const pref = readPref(STORAGE.sound);
    return pref === "on" || pref === "off" ? pref : null;
  });
  const supported = typeof window === "undefined" || "AudioContext" in window || "webkitAudioContext" in window;

  const ensureContext = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    ctxRef.current = ctx;
    scoreRef.current = new AmbientScore(ctx);
    return ctx;
  }, []);

  const enable = useCallback(
    (level: number = AMBIENT_LEVEL.bed) => {
      const ctx = ensureContext();
      if (!ctx) return;
      void ctx.resume();
      levelRef.current = level;
      scoreRef.current?.start(level);
      setEnabled(true);
      setPreference("on");
      writePref(STORAGE.sound, "on");
    },
    [ensureContext]
  );

  const disable = useCallback(() => {
    scoreRef.current?.stop();
    setEnabled(false);
    setPreference("off");
    writePref(STORAGE.sound, "off");
  }, []);

  const toggle = useCallback(() => {
    if (enabled) disable();
    else enable(AMBIENT_LEVEL.bed);
  }, [enabled, enable, disable]);

  const setLevel = useCallback((level: number, fadeSeconds = 2) => {
    levelRef.current = level;
    scoreRef.current?.setLevel(level, fadeSeconds);
  }, []);

  // Pause politely when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      const ctx = ctxRef.current;
      if (!ctx || !enabled) return;
      if (document.hidden) {
        scoreRef.current?.setLevel(0, 0.3);
        window.setTimeout(() => document.hidden && void ctx.suspend(), 350);
      } else {
        void ctx.resume().then(() => scoreRef.current?.setLevel(levelRef.current, 1.5));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled]);

  const connectVoice = useCallback(
    (el: HTMLAudioElement) => {
      const ctx = ensureContext();
      if (!ctx) return;
      void ctx.resume();
      try {
        if (!voiceAnalyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.7;
          analyser.connect(ctx.destination);
          voiceAnalyserRef.current = analyser;
        }
        ctx.createMediaElementSource(el).connect(voiceAnalyserRef.current);
      } catch {
        /* element already connected or unsupported — plays normally */
      }
    },
    [ensureContext]
  );

  const value = useMemo<SoundContextValue>(
    () => ({
      enabled,
      preference,
      supported,
      enable,
      disable,
      toggle,
      setLevel,
      connectVoice,
      voiceAnalyser: () => voiceAnalyserRef.current,
      musicAnalyser: () => scoreRef.current?.analyser ?? null,
    }),
    [enabled, preference, supported, enable, disable, toggle, setLevel, connectVoice]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

/** Animated equaliser bars used by the sound toggle. */
export function SoundBars({ active, className = "" }: { active: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[2px] h-3 ${className}`} aria-hidden="true">
      {[0.9, 0.5, 1, 0.65].map((h, i) => (
        <span
          key={i}
          className="w-[2px] bg-current origin-bottom"
          style={{
            height: "100%",
            transform: active ? undefined : `scaleY(${0.18 + h * 0.08})`,
            animation: active ? `bars ${0.9 + i * 0.17}s ease-in-out ${i * 0.12}s infinite` : "none",
            transition: "transform 0.4s",
          }}
        />
      ))}
    </span>
  );
}

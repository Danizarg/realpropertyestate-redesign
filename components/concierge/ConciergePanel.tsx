"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "@/components/motion/gsap";
import { useOverlay } from "@/components/motion/useOverlay";
import TransitionLink from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/motion/Magnetic";
import { useSound } from "@/components/experience/SoundProvider";
import { CloseIcon, MicIcon, SendIcon, SpeakerIcon } from "@/components/site/SocialIcons";
import ConciergeOrb, { type OrbState } from "./ConciergeOrb";
import {
  createConciergeEngine,
  formatMatchPrice,
  initialConversation,
  openingReply,
  type ConciergeReply,
} from "@/lib/concierge/engine";
import { loadListings, useListings } from "@/lib/listings-client";
import { speak, stopSpeaking, unlockSpeech, type SpeakHandle } from "@/lib/audio/voice";
import { getRecognitionCtor, startRecognition } from "@/lib/audio/recognition";
import { prefersReducedMotion, readPref, STORAGE, writePref } from "@/lib/experience";
import { cn } from "@/lib/utils";

type Entry = { id: string; role: "visitor" } & { text: string } | ({ id: string; role: "concierge" } & ConciergeReply);
type MicState = "idle" | "consent" | "requesting" | "listening" | "denied" | "unsupported" | "error";

const STATUS: Record<OrbState, string> = {
  idle: "At your service",
  listening: "Listening…",
  thinking: "Considering…",
  speaking: "Speaking",
};

const uid = () => Math.random().toString(36).slice(2, 10);

/** Reads compact figures naturally: "€2.5M" → "2.5 million euros". */
const speakable = (text: string) =>
  text
    .replace(/€(d+(?:.d+)?)M/g, "$1 million euros")
    .replace(/€(d+)K/g, "$1 thousand euros")
    .replace(/s—s/g, ", ");
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export default function ConciergePanel({
  open,
  onClose,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  prefill: { text: string; id: number } | null;
}) {
  const sound = useSound();
  const pathname = usePathname();
  const engine = useMemo(() => createConciergeEngine(), []);
  const listings = useListings(true);

  const [entries, setEntries] = useState<Entry[]>(() => [{ id: "welcome", role: "concierge", ...openingReply() }]);
  const [orb, setOrb] = useState<OrbState>("idle");
  const [input, setInput] = useState("");
  const [interim, setInterim] = useState("");
  const [mic, setMic] = useState<MicState>("idle");
  const [micNote, setMicNote] = useState("");
  const [voiceChoice, setVoiceChoice] = useState<boolean | null>(null);
  const voiceOn = voiceChoice ?? sound.preference === "on";
  const [busy, setBusy] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conv = useRef(initialConversation());
  const levelRef = useRef(0);
  const pulseRef = useRef(0);
  const speech = useRef<SpeakHandle | null>(null);
  const recognition = useRef<{ stop: () => void } | null>(null);
  const micStream = useRef<{ stop: () => void } | null>(null);
  const voiceOnRef = useRef(voiceOn);
  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);

  useOverlay(open, onClose, {
    initialFocus: () => inputRef.current,
    inertSelector: "header, [data-page-root], [data-concierge-launcher]",
  });


  // Open / close choreography (expands from the launcher).
  useEffect(() => {
    const el = root.current;
    const p = panel.current;
    if (!el || !p) return;
    const reduced = prefersReducedMotion();
    if (open) {
      gsap.set(el, { visibility: "visible" });
      gsap
        .timeline()
        .fromTo(el.querySelector("[data-backdrop]"), { opacity: 0 }, { opacity: 1, duration: 0.6 })
        .fromTo(
          p,
          { clipPath: "circle(0% at 94% 96%)" },
          { clipPath: "circle(150% at 94% 96%)", duration: reduced ? 0.01 : 1.1, ease: "expo.inOut" },
          0
        )
        .fromTo(
          p.querySelectorAll("[data-panel-in]"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.06 },
          reduced ? 0 : 0.45
        );
    } else {
      gsap
        .timeline({ onComplete: () => gsap.set(el, { visibility: "hidden" }) })
        .to(p, { clipPath: "circle(0% at 94% 96%)", duration: reduced ? 0.01 : 0.8, ease: "expo.inOut" })
        .to(el.querySelector("[data-backdrop]"), { opacity: 0, duration: 0.5 }, 0.2);
    }
  }, [open]);

  const stopListening = useCallback(() => {
    recognition.current?.stop();
    recognition.current = null;
    micStream.current?.stop();
    micStream.current = null;
    levelRef.current = 0;
  }, []);

  const stopVoice = useCallback(() => {
    speech.current?.cancel();
    stopSpeaking();
    levelRef.current = 0;
  }, []);

  // Leaving or closing silences everything.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setMic((m) => (m === "listening" || m === "requesting" ? "idle" : m));
      setOrb("idle");
    }
  }
  useEffect(() => {
    if (!open) {
      stopListening();
      stopVoice();
    }
  }, [open, stopListening, stopVoice]);

  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => () => {
    stopListening();
    stopVoice();
  }, [stopListening, stopVoice]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [entries, interim]);

  const sayAloud = useCallback(
    async (text: string) => {
      setOrb("speaking");
      let sampling = 0;
      const sample = () => {
        const an = sound.voiceAnalyser();
        if (an) {
          const data = new Uint8Array(an.fftSize);
          an.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) sum += ((v - 128) / 128) ** 2;
          levelRef.current = Math.min(1, Math.sqrt(sum / data.length) * 4);
        }
        sampling = requestAnimationFrame(sample);
      };
      speech.current = speak(speakable(text), {
        onWord: () => {
          pulseRef.current = 1;
        },
        connect: (el) => {
          sound.connectVoice(el);
          sample();
        },
      });
      await speech.current.done;
      cancelAnimationFrame(sampling);
      levelRef.current = 0;
      setOrb((o) => (o === "speaking" ? "idle" : o));
    },
    [sound]
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, 400);
      if (!text || busy) return;
      stopVoice();
      setBusy(true);
      setEntries((e) => [...e, { id: uid(), role: "visitor", text }]);
      setInput("");
      setInterim("");
      setOrb("thinking");
      const data = listings ?? (await loadListings());
      await wait(500 + Math.random() * 400);
      const { reply, state } = await engine.respond(text, conv.current, data);
      conv.current = state;
      setEntries((e) => [...e, { id: uid(), role: "concierge", ...reply }]);
      setBusy(false);
      if (voiceOnRef.current) void sayAloud(reply.text);
      else setOrb("idle");
    },
    [busy, engine, listings, sayAloud, stopVoice]
  );

  // Prefilled questions (e.g. from the collection's empty state)
  const lastPrefill = useRef<number | null>(null);
  useEffect(() => {
    if (open && prefill && prefill.id !== lastPrefill.current) {
      lastPrefill.current = prefill.id;
      void send(prefill.text);
    }
  }, [open, prefill, send]);

  const beginListening = useCallback(async () => {
    stopVoice();
    setMicNote("");
    setMic("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      const an = ac.createAnalyser();
      an.fftSize = 512;
      ac.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.fftSize);
      let raf = 0;
      const loop = () => {
        an.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        levelRef.current = Math.min(1, Math.sqrt(sum / data.length) * 5);
        raf = requestAnimationFrame(loop);
      };
      loop();
      micStream.current = {
        stop: () => {
          cancelAnimationFrame(raf);
          stream.getTracks().forEach((t) => t.stop());
          void ac.close();
        },
      };
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setMic("denied");
        return;
      }
      // No visualiser stream — recognition may still work on its own.
    }

    let heard = "";
    recognition.current = startRecognition({
      onInterim: (t) => setInterim(t),
      onFinal: (t) => {
        heard = t;
      },
      onError: (e) => {
        if (e === "denied") setMic("denied");
        else if (e === "no-speech") setMicNote("I didn't quite catch that — try again, or type your request.");
        else if (e === "network") setMicNote("Voice recognition needs your browser's online speech service. Please type instead.");
        else if (e !== "aborted") setMicNote("Voice input isn't available right now. Please type your request.");
      },
      onEnd: () => {
        micStream.current?.stop();
        micStream.current = null;
        recognition.current = null;
        levelRef.current = 0;
        setMic((m) => (m === "listening" || m === "requesting" ? "idle" : m));
        setOrb((o) => (o === "listening" ? "idle" : o));
        setInterim("");
        if (heard) void send(heard);
      },
    });
    if (!recognition.current) {
      micStream.current?.stop();
      setMic("error");
      setMicNote("Voice input isn't available right now. Please type your request.");
      return;
    }
    setMic("listening");
    setOrb("listening");
  }, [send, stopVoice]);

  const onMic = () => {
    if (mic === "listening") {
      recognition.current?.stop();
      return;
    }
    if (!getRecognitionCtor() || !navigator.mediaDevices?.getUserMedia) {
      setMic("unsupported");
      return;
    }
    if (readPref(STORAGE.micConsent) !== "granted") {
      setMic("consent");
      return;
    }
    void beginListening();
  };

  const toggleVoice = () => {
    if (!voiceOn) unlockSpeech();
    else stopVoice();
    setVoiceChoice(!voiceOn);
  };

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[85]"
      style={{ visibility: "hidden" }}
      role="dialog"
      aria-modal="true"
      aria-label="Real Property Estate concierge"
    >
      <div data-backdrop className="absolute inset-0 bg-obsidian/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div
        ref={panel}
        className="absolute inset-0 md:inset-auto md:top-3 md:right-3 md:bottom-3 md:w-[29rem] flex flex-col bg-obsidian/[0.93] text-ivory backdrop-blur-2xl md:border md:border-ivory/10 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]"
        style={{ clipPath: "circle(0% at 94% 96%)" }}
      >
        {/* Header */}
        <div data-panel-in className="flex items-start justify-between gap-4 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2">
          <div>
            <p className="micro-sm text-champagne">Private concierge</p>
            <p className="mt-2 font-serif text-[1.55rem] leading-tight">Real Property Estate</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 -mr-2 hover:text-champagne transition-colors" aria-label="Close concierge">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Presence */}
        <div data-panel-in className="relative flex flex-col items-center">
          <ConciergeOrb state={orb} levelRef={levelRef} pulseRef={pulseRef} className="w-full h-[150px] md:h-[170px]" />
          <p className="-mt-3 micro-sm text-ivory/60" aria-live="polite">
            {STATUS[orb]}
          </p>
          <p className="mt-2 text-[11px] text-stone">Preview mode · answers come from our live listings, on this device</p>
        </div>

        {/* Transcript */}
        <div
          ref={scroller}
          data-panel-in
          className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4 space-y-7"
          data-lenis-prevent
          aria-live="polite"
          aria-relevant="additions"
        >
          {entries.map((e) =>
            e.role === "visitor" ? (
              <div key={e.id} className="pl-10">
                <p className="micro-sm text-stone mb-2 text-right">You</p>
                <p className="text-[15px] leading-relaxed text-right text-ivory/90">{e.text}</p>
              </div>
            ) : (
              <ConciergeEntry key={e.id} entry={e} onSuggest={send} onNavigate={onClose} disabled={busy} />
            )
          )}
          {interim && (
            <div className="pl-10">
              <p className="micro-sm text-stone mb-2 text-right">You</p>
              <p className="text-[15px] leading-relaxed text-right text-ivory/50 italic">{interim}</p>
            </div>
          )}
        </div>

        {/* Microphone notices */}
        {mic === "consent" && (
          <div className="mx-6 mb-3 border border-ivory/15 p-4 text-[13px] leading-relaxed text-ivory/80">
            <p>
              Voice input uses your browser&apos;s speech recognition, which may process audio on its provider&apos;s servers to
              transcribe it. Real Property Estate does not record or store your voice.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn btn-light !min-h-10 !px-4"
                onClick={() => {
                  writePref(STORAGE.micConsent, "granted");
                  void beginListening();
                }}
              >
                Allow microphone
              </button>
              <button type="button" className="btn btn-ghost-light !min-h-10 !px-4" onClick={() => setMic("idle")}>
                Not now
              </button>
            </div>
          </div>
        )}
        {(mic === "denied" || mic === "unsupported" || micNote) && mic !== "consent" && (
          <p role="status" className="mx-6 mb-3 text-[12.5px] leading-relaxed text-champagne-soft">
            {mic === "denied"
              ? "Microphone access is blocked for this site. You can allow it in your browser's site settings — or simply type below."
              : mic === "unsupported"
                ? "Voice input isn't available in this browser. Please type your request — the concierge works just the same."
                : micNote}
          </p>
        )}

        {/* Composer */}
        <form
          data-panel-in
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
        >
          <div className="flex items-center gap-2 border border-ivory/15 focus-within:border-ivory/40 transition-colors pl-4">
            <label htmlFor="concierge-input" className="sr-only">
              Ask the concierge
            </label>
            <input
              ref={inputRef}
              id="concierge-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mic === "listening" ? "Listening…" : "Ask about residences, areas or viewings…"}
              autoComplete="off"
              maxLength={400}
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px] py-3.5 placeholder:text-ivory/35"
            />
            <button
              type="button"
              onClick={onMic}
              aria-label={mic === "listening" ? "Stop listening" : "Speak your request"}
              aria-pressed={mic === "listening"}
              className={cn(
                "relative w-11 h-11 flex items-center justify-center transition-colors",
                mic === "listening" ? "text-obsidian" : "hover:text-champagne",
                (mic === "denied" || mic === "unsupported") && "opacity-40"
              )}
            >
              {mic === "listening" && <span className="absolute inset-1 rounded-full bg-champagne animate-[breathe_1.6s_ease-in-out_infinite]" />}
              <MicIcon className="relative w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="w-12 h-12 flex items-center justify-center bg-ivory text-obsidian disabled:opacity-30 transition-opacity"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={voiceOn}
              className="inline-flex items-center gap-2 micro-sm text-ivory/60 hover:text-ivory transition-colors"
            >
              <SpeakerIcon muted={!voiceOn} className="w-4 h-4" />
              Voice replies {voiceOn ? "on" : "off"}
            </button>
            {orb === "speaking" && (
              <button type="button" onClick={stopVoice} className="micro-sm text-ivory/60 hover:text-ivory transition-colors">
                Stop
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function ConciergeEntry({
  entry,
  onSuggest,
  onNavigate,
  disabled,
}: {
  entry: { id: string } & ConciergeReply;
  onSuggest: (text: string) => void;
  onNavigate: () => void;
  disabled: boolean;
}) {
  const words = entry.text.split(" ");
  return (
    <div className="pr-4">
      <p className="micro-sm text-champagne mb-2">Concierge</p>
      <p className="font-serif text-[1.22rem] leading-[1.45] text-ivory">
        {words.map((w, i) => (
          <span key={i}>
            <span className="inline-block animate-[fadeUp_0.7s_var(--ease-out)_both]" style={{ animationDelay: `${i * 28}ms` }}>
              {w}
            </span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </p>

      {entry.matches && entry.matches.length > 0 && (
        <div className="mt-5 -mx-6 px-6 flex gap-3 overflow-x-auto no-scrollbar snap-x" data-lenis-prevent>
          {entry.matches.map((m) => (
            <TransitionLink
              key={m.id}
              href={`/properties/${m.slug}`}
              transitionLabel={m.name}
              onClick={onNavigate}
              className="group shrink-0 w-56 snap-start bg-ivory/[0.04] border border-ivory/10 hover:border-ivory/30 transition-colors"
            >
              <span className="relative block aspect-[4/3] overflow-hidden bg-obsidian-3">
                {m.cover && (
                  <Image src={m.cover.url} alt="" fill sizes="224px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
              </span>
              <span className="block p-3.5">
                <span className="block font-serif text-[1.05rem] leading-tight truncate">{m.name}</span>
                <span className="block mt-1 text-[11.5px] text-stone truncate">{m.location}</span>
                <span className="block mt-2 text-[13px] text-champagne">{formatMatchPrice(m)}</span>
              </span>
            </TransitionLink>
          ))}
        </div>
      )}

      {entry.actions && entry.actions.length > 0 && (
        <div className="mt-5 flex flex-col items-start gap-2.5">
          {entry.actions.map((a) =>
            a.external ? (
              <a key={a.href} href={a.href} target="_blank" rel="noopener noreferrer" className="link-line micro-sm text-ivory/85 hover:text-ivory">
                {a.label} <Arrow direction="up-right" className="w-3 h-3" />
              </a>
            ) : (
              <TransitionLink key={a.href} href={a.href} onClick={onNavigate} className="link-line micro-sm text-ivory/85 hover:text-ivory">
                {a.label} <Arrow className="w-3 h-3" />
              </TransitionLink>
            )
          )}
        </div>
      )}

      {entry.suggestions && entry.suggestions.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {entry.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => onSuggest(s)}
              className="chip !min-h-9 !text-[12px] disabled:opacity-40"
              style={{ "--chip-line": "rgba(245,242,235,0.2)" } as React.CSSProperties}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

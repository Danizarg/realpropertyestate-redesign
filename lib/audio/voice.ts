/**
 * Voice output for the intro narration and the concierge.
 *
 * Order, per line:
 *  1. Recorded — a pre-rendered clip in public/voice/ (see `npm run voice:render`).
 *     Needs no key and no API at runtime. Replies whose opening sentence was
 *     recorded speak that sentence; the rest stays on screen.
 *  2. "server" — live text-to-speech behind /api/voice, only when a voice key
 *     is configured on the server (never in the client).
 *  3. "browser" — the Web Speech API. Used only when nothing is recorded, so
 *     the site never switches between a recorded voice and a robotic one.
 */
import manifest from "./voice-clips.json";
import { clipKey, sentences } from "@/lib/voice-lines";

export type VoiceProvider = "server" | "browser" | "none";

export interface SpeakOptions {
  /** Called for each spoken word (browser voices that report boundaries). */
  onWord?: (charIndex: number) => void;
  onStart?: () => void;
  /** Optional audio graph to route audio into (for visualisers). */
  connect?: (el: HTMLAudioElement) => void;
}

export interface SpeakHandle {
  done: Promise<void>;
  cancel: () => void;
}

const RECORDED: Record<string, string> = (manifest as { clips?: Record<string, string> }).clips ?? {};
export const hasRecordedVoice = Object.keys(RECORDED).length > 0;

/** The recording for `text`, or for its longest recorded opening run of sentences. */
function recordingFor(text: string): string | null {
  const exact = RECORDED[clipKey(text)];
  if (exact) return exact;
  const parts = sentences(text);
  for (let n = parts.length - 1; n >= 1; n--) {
    const hit = RECORDED[clipKey(parts.slice(0, n).join(" "))];
    if (hit) return hit;
  }
  return null;
}

let providerPromise: Promise<VoiceProvider> | null = null;

export function getVoiceProvider(): Promise<VoiceProvider> {
  if (providerPromise) return providerPromise;
  providerPromise = (async () => {
    try {
      const res = await fetch("/api/voice", { method: "GET", cache: "no-store" });
      if (res.ok) {
        const body = (await res.json()) as { enabled?: boolean };
        if (body.enabled) return "server";
      }
    } catch {
      /* fall through */
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) return "browser";
    return "none";
  })();
  return providerPromise;
}

const PREFERRED_VOICES = [
  /Aria.*Natural/i,
  /Jenny.*Natural/i,
  /Ava.*Natural/i,
  /Samantha/i,
  /Google US English/i,
  /Sonia.*Natural/i,
  /Libby.*Natural/i,
  /Natural/i,
  /Google UK English Female/i,
  /Serena/i,
  /Kate/i,
];

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (voices.length) return resolve(voices);
    const timer = window.setTimeout(() => resolve(synth.getVoices()), 1200);
    synth.addEventListener(
      "voiceschanged",
      () => {
        window.clearTimeout(timer);
        resolve(synth.getVoices());
      },
      { once: true }
    );
  });
}

async function pickVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = (await loadVoices()).filter((v) => /^en(-|_|$)/i.test(v.lang));
  for (const pattern of PREFERRED_VOICES) {
    const match = voices.find((v) => pattern.test(v.name));
    if (match) return (cachedVoice = match);
  }
  cachedVoice = voices.find((v) => /en-US/i.test(v.lang)) ?? voices[0] ?? null;
  return cachedVoice;
}

/** Must be called from a user gesture once (iOS requires it before later speech). */
export function unlockSpeech() {
  try {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

let activeAudio: HTMLAudioElement | null = null;

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
  activeAudio?.pause();
  activeAudio = null;
}

const liveCache = new Map<string, Promise<Blob | null>>();

/** Live server-voice audio for `text`, fetched once per page visit. */
function fetchLive(text: string): Promise<Blob | null> {
  let clip = liveCache.get(text);
  if (!clip) {
    clip = fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((res) => (res.ok ? res.blob() : null))
      .catch(() => null);
    clip.then((b) => {
      if (!b) liveCache.delete(text);
    });
    liveCache.set(text, clip);
  }
  return clip;
}

/**
 * Warms lines ahead of time (e.g. the intro's narration the moment the visitor
 * chooses sound) so speech lands in step with the visuals.
 */
export async function prefetchSpeech(lines: readonly string[]) {
  const live: string[] = [];
  for (const line of lines) {
    const src = recordingFor(line);
    if (src) void fetch(src).catch(() => {});
    else live.push(line);
  }
  if (live.length && (await getVoiceProvider()) === "server") live.forEach((l) => void fetchLive(l));
}

function playElement(audio: HTMLAudioElement, options: SpeakOptions, setCancel: (fn: () => void) => void) {
  audio.crossOrigin = "anonymous";
  activeAudio = audio;
  options.connect?.(audio);
  return new Promise<void>((resolve) => {
    setCancel(() => {
      audio.pause();
      resolve();
    });
    audio.onplay = () => options.onStart?.();
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

export function speak(text: string, options: SpeakOptions = {}): SpeakHandle {
  let cancelled = false;
  let cancelFn = () => {};
  const setCancel = (fn: () => void) => {
    cancelFn = fn;
  };

  const done = (async () => {
    // 1. A recording of this line (or of its opening sentence)
    const recorded = recordingFor(text);
    if (recorded) {
      await playElement(new Audio(recorded), options, setCancel);
      return;
    }

    // 2. Live server voice, when configured
    const provider = await getVoiceProvider();
    if (cancelled) return;
    if (provider === "server") {
      const blob = await fetchLive(text);
      if (cancelled) return;
      if (blob) {
        const url = URL.createObjectURL(blob);
        await playElement(new Audio(url), options, setCancel);
        URL.revokeObjectURL(url);
        return;
      }
    }

    // 3. Browser voice — only when nothing is recorded, so the voice never changes mid-visit
    if (hasRecordedVoice || !("speechSynthesis" in window)) return;
    const voice = await pickVoice();
    if (cancelled) return;
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-US";
      u.rate = 0.92;
      u.pitch = 1;
      u.volume = 1;
      u.onstart = () => options.onStart?.();
      u.onboundary = (e) => {
        if (e.name === "word" || e.name === undefined) options.onWord?.(e.charIndex);
      };
      u.onend = () => resolve();
      u.onerror = () => resolve();
      setCancel(() => {
        window.speechSynthesis.cancel();
        resolve();
      });
      window.speechSynthesis.speak(u);
    });
  })();

  return {
    done,
    cancel: () => {
      cancelled = true;
      cancelFn();
    },
  };
}

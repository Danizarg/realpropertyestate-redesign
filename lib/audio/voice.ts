/**
 * Voice output for the intro narration and the concierge.
 *
 * Provider order:
 *  1. "server" — a premium TTS provider behind /api/voice (see README; only
 *     active when the provider's key is set on the server, never in the client).
 *  2. "browser" — the Web Speech API, using the most natural installed voice.
 *  3. "none" — no speech available; callers fall back to captions only.
 */

export type VoiceProvider = "server" | "browser" | "none";

export interface SpeakOptions {
  /** Called for each spoken word (browser voices that report boundaries). */
  onWord?: (charIndex: number) => void;
  onStart?: () => void;
  /** Optional audio graph to route server audio into (for visualisers). */
  connect?: (el: HTMLAudioElement) => void;
}

export interface SpeakHandle {
  done: Promise<void>;
  cancel: () => void;
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
      /* fall through to the browser voice */
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) return "browser";
    return "none";
  })();
  return providerPromise;
}

const PREFERRED_VOICES = [
  /Sonia.*Natural/i,
  /Libby.*Natural/i,
  /Ryan.*Natural/i,
  /Natural.*English \(United Kingdom\)/i,
  /Google UK English Female/i,
  /Serena/i,
  /Martha/i,
  /Daniel/i,
  /Kate/i,
  /Samantha/i,
  /Aria.*Natural/i,
  /Jenny.*Natural/i,
  /Natural/i,
  /Google US English/i,
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
  cachedVoice = voices.find((v) => /en-GB/i.test(v.lang)) ?? voices[0] ?? null;
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

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
  activeAudio?.pause();
  activeAudio = null;
}

let activeAudio: HTMLAudioElement | null = null;

const clipCache = new Map<string, Promise<Blob | null>>();

/** Server-voice audio for `text`, fetched once per page visit. */
function fetchClip(text: string): Promise<Blob | null> {
  let clip = clipCache.get(text);
  if (!clip) {
    clip = fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((res) => (res.ok ? res.blob() : null))
      .catch(() => null);
    clip.then((b) => {
      if (!b) clipCache.delete(text);
    });
    clipCache.set(text, clip);
  }
  return clip;
}

/**
 * Starts synthesising lines ahead of time (e.g. the intro's narration the
 * moment the visitor chooses sound) so speech lands in step with the visuals.
 * Does nothing when only the browser voice is available.
 */
export async function prefetchSpeech(lines: string[]) {
  if ((await getVoiceProvider()) !== "server") return;
  lines.forEach((l) => void fetchClip(l));
}

export function speak(text: string, options: SpeakOptions = {}): SpeakHandle {
  let cancelled = false;
  let cancelFn = () => {};

  const done = (async () => {
    const provider = await getVoiceProvider();
    if (cancelled) return;

    if (provider === "server") {
      try {
        const blob = await fetchClip(text);
        if (!blob) throw new Error("voice provider error");
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.crossOrigin = "anonymous";
        activeAudio = audio;
        options.connect?.(audio);
        await new Promise<void>((resolve) => {
          cancelFn = () => {
            audio.pause();
            resolve();
          };
          audio.onplay = () => options.onStart?.();
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
        return;
      } catch {
        /* fall back to the browser voice below */
      }
    }

    if (!("speechSynthesis" in window)) return;
    const voice = await pickVoice();
    if (cancelled) return;
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-GB";
      u.rate = 0.9;
      u.pitch = 1;
      u.volume = 1;
      u.onstart = () => options.onStart?.();
      u.onboundary = (e) => {
        if (e.name === "word" || e.name === undefined) options.onWord?.(e.charIndex);
      };
      u.onend = () => resolve();
      u.onerror = () => resolve();
      cancelFn = () => {
        window.speechSynthesis.cancel();
        resolve();
      };
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

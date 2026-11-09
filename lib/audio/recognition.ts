/**
 * Thin wrapper around the browser's Web Speech recognition (Chrome, Edge,
 * Safari). Audio is processed by the browser's own speech service; this site
 * never records, uploads or stores it.
 */

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}
interface RecognitionErrorLike {
  error: string;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => RecognitionLike;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type RecognitionError = "denied" | "no-speech" | "network" | "unavailable" | "aborted";

export interface RecognitionHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (err: RecognitionError) => void;
  onEnd: () => void;
}

export function startRecognition(handlers: RecognitionHandlers): { stop: () => void } | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  const lang = navigator.language?.toLowerCase().startsWith("en") ? navigator.language : "en-GB";
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onInterim((finalText + interim).trim());
  };
  rec.onerror = (e) => {
    const map: Record<string, RecognitionError> = {
      "not-allowed": "denied",
      "service-not-allowed": "denied",
      "no-speech": "no-speech",
      network: "network",
      aborted: "aborted",
      "audio-capture": "unavailable",
    };
    handlers.onError(map[e.error] ?? "unavailable");
  };
  rec.onend = () => {
    if (finalText.trim()) handlers.onFinal(finalText.trim());
    handlers.onEnd();
  };
  try {
    rec.start();
  } catch {
    handlers.onError("unavailable");
    return null;
  }
  return { stop: () => rec.stop() };
}

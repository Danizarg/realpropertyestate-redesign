/**
 * The Zouza "Suza" voice, server side: OpenAI-compatible text-to-speech
 * (gpt-4o-mini-tts, voice "marin", the same delivery instructions), then the
 * same shaping as in the Zouza app — S and Z sounds softened, and a soft,
 * slightly echoing room around the voice with a stereo spread.
 *
 * Server only: it reads secrets and uses the file system, so client code must
 * never import it.
 *
 * Env (never bundled): VOICE_TTS_API_KEY, SUZA_TTS_API_KEY, SUZA_STT_API_KEY or
 * OPENAI_API_KEY (the same OpenAI key Zouza keeps as SUZA_STT_API_KEY);
 * optional VOICE_TTS_URL, VOICE_TTS_MODEL, VOICE_TTS_VOICE, VOICE_TTS_INSTRUCTIONS
 * (the SUZA_TTS_* names from the Zouza app are accepted too).
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeWav, encodeWav, shapeVoice } from "./voice-shaping";

const env = (name: string) => process.env[`VOICE_TTS_${name}`] || process.env[`SUZA_TTS_${name}`] || "";

export const TTS_URL = env("URL") || "https://api.openai.com/v1/audio/speech";
export const TTS_MODEL = env("MODEL") || "gpt-4o-mini-tts";
// marin: female, neutral American, mid pitch, smooth and warm, soft S sounds,
// calm authority — the voice chosen for Zouza.
export const TTS_VOICE = env("VOICE") || "marin";
// gpt-4o-mini-tts ignores `speed`, so pace is set in the wording. Same voice
// description as Zouza's Suza; only the persona line names this concierge.
export const TTS_INSTRUCTIONS =
  env("INSTRUCTIONS") ||
  "You are the Real Property Estate concierge, a calm, reassuring property companion. Speak in a smooth, warm voice with a neutral American accent: mid pitch with gentle, natural movement and precise, clear articulation. Sound confident and composed, with quiet authority and a soothing warmth. Keep the voice fully voiced and smooth, never breathy, whispery or airy, and keep s and z sounds soft. Never bright, chirpy or salesy. Speak at a natural, conversational pace: steady and unrushed, but never slow or drawn out.";

export const MAX_CHARS = 600;
/** Bump when `shape` changes so cached clips are re-rendered. */
const SHAPE_VERSION = 4;

export function suzaVoiceKey(): string {
  return (
    process.env.VOICE_TTS_API_KEY ||
    process.env.SUZA_TTS_API_KEY ||
    process.env.SUZA_STT_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  );
}

// ---------------------------------------------------------------- cache

interface Clip {
  wav: Uint8Array;
  at: number;
}

const CACHE_MAX = 80;
const clips = new Map<string, Clip>();
const pending = new Map<string, Promise<Uint8Array>>();
const CACHE_DIR = join(tmpdir(), "rpe-concierge-voice");

async function remember(id: string, wav: Uint8Array) {
  clips.set(id, { wav, at: Date.now() });
  if (clips.size > CACHE_MAX) {
    const oldest = [...clips.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) clips.delete(oldest[0]);
  }
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(join(CACHE_DIR, `${id}.wav`), wav);
  } catch {
    /* disk cache is best-effort */
  }
}

async function recall(id: string): Promise<Uint8Array | null> {
  const hit = clips.get(id);
  if (hit) {
    hit.at = Date.now();
    return hit.wav;
  }
  try {
    const wav = new Uint8Array(await readFile(join(CACHE_DIR, `${id}.wav`)));
    clips.set(id, { wav, at: Date.now() });
    return wav;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- synthesis

async function synthesise(text: string): Promise<Uint8Array> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(TTS_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${suzaVoiceKey()}`, "content-type": "application/json" },
      body: JSON.stringify({ model: TTS_MODEL, voice: TTS_VOICE, input: text, instructions: TTS_INSTRUCTIONS, response_format: "wav" }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`tts ${res.status} ${detail.slice(0, 200)}`);
    }
    const { samples, sampleRate } = decodeWav(new Uint8Array(await res.arrayBuffer()));
    const { left, right } = shapeVoice(samples, sampleRate, "room");
    return encodeWav(left, right, sampleRate);
  } finally {
    clearTimeout(timer);
  }
}

/** Shaped stereo WAV for `text`, from cache when the same line was said before. */
export async function speakWithSuzaVoice(text: string): Promise<Uint8Array> {
  const id = createHash("sha1")
    .update(`${SHAPE_VERSION}|${TTS_MODEL}|${TTS_VOICE}|${TTS_INSTRUCTIONS}|${text}`)
    .digest("hex")
    .slice(0, 24);
  const cached = await recall(id);
  if (cached) return cached;
  let job = pending.get(id);
  if (!job) {
    job = synthesise(text);
    pending.set(id, job);
    const forget = () => {
      pending.delete(id);
    };
    job.then(forget, forget);
  }
  const wav = await job;
  await remember(id, wav);
  return wav;
}

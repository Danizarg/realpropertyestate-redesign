/**
 * The Zouza "Suza" voice, server side: OpenAI-compatible text-to-speech
 * (gpt-4o-mini-tts, voice "marin", the same delivery instructions), then the
 * same shaping as in the Zouza app — S and Z sounds softened, and a soft,
 * slightly echoing room around the voice with a stereo spread.
 *
 * Server only: it reads secrets and uses the file system, so client code must
 * never import it.
 *
 * Env (never bundled): VOICE_TTS_API_KEY, SUZA_TTS_API_KEY or OPENAI_API_KEY;
 * optional VOICE_TTS_URL, VOICE_TTS_MODEL, VOICE_TTS_VOICE, VOICE_TTS_INSTRUCTIONS
 * (the SUZA_TTS_* names from the Zouza app are accepted too).
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  return process.env.VOICE_TTS_API_KEY || process.env.SUZA_TTS_API_KEY || process.env.OPENAI_API_KEY || "";
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

// ---------------------------------------------------------------- WAV

/** Reads a 16-bit PCM WAV into mono float samples. */
function decodeWav(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 44 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "RIFF") throw new Error("not a wav");
  let offset = 12;
  let sampleRate = 24000;
  let channels = 1;
  let bits = 16;
  let data: { start: number; length: number } | null = null;
  while (offset + 8 <= bytes.length) {
    const tag = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = view.getUint32(offset + 4, true);
    if (tag === "fmt ") {
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bits = view.getUint16(offset + 22, true);
    } else if (tag === "data") {
      data = { start: offset + 8, length: Math.min(size, bytes.length - offset - 8) };
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!data || bits !== 16) throw new Error("unsupported wav");
  const frames = Math.floor(data.length / 2 / channels);
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += view.getInt16(data.start + (i * channels + c) * 2, true) / 32768;
    samples[i] = sum / channels;
  }
  return { samples, sampleRate };
}

/** Writes stereo float samples as a 16-bit PCM WAV. */
function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
  const frames = left.length;
  const out = new Uint8Array(44 + frames * 4);
  const view = new DataView(out.buffer);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i);
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + frames * 4, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, frames * 4, true);
  let o = 44;
  for (let i = 0; i < frames; i++) {
    view.setInt16(o, Math.max(-1, Math.min(1, left[i])) * 32767, true);
    view.setInt16(o + 2, Math.max(-1, Math.min(1, right[i])) * 32767, true);
    o += 4;
  }
  return out;
}

// ---------------------------------------------------------------- the voice

/** A second-order Butterworth low- or high-pass, run over a whole buffer. */
function biquad(input: Float32Array, sr: number, type: "lp" | "hp", freq: number): Float32Array {
  const w = (2 * Math.PI * freq) / sr;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / Math.SQRT2;
  const b0 = type === "lp" ? (1 - cos) / 2 : (1 + cos) / 2;
  const b1 = type === "lp" ? 1 - cos : -(1 + cos);
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  const out = new Float32Array(input.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 * x0 + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    out[i] = y0;
  }
  return out;
}

/** The same filter forwards then backwards: twice as steep, no phase shift. */
function zeroPhase(input: Float32Array, sr: number, type: "lp" | "hp", freq: number): Float32Array {
  return biquad(biquad(input, sr, type, freq).reverse(), sr, type, freq).reverse();
}

/** Median RMS of the clip's voiced 10 ms frames (0 when there is too little speech). */
function vowelLevel(x: Float32Array, sr: number): number {
  const body = biquad(biquad(x, sr, "hp", 100), sr, "lp", 3500);
  const hiss = biquad(x, sr, "hp", 4500);
  const frame = Math.round(sr * 0.01);
  const levels: number[] = [];
  for (let s = 0; s + frame <= x.length; s += frame) {
    let b = 0,
      h = 0;
    for (let i = s; i < s + frame; i++) {
      b += body[i] * body[i];
      h += hiss[i] * hiss[i];
    }
    const rms = Math.sqrt(b / frame);
    if (rms > 0.0056 && b > 16 * h) levels.push(rms);
  }
  if (levels.length < 5) return 0;
  levels.sort((a, b) => a - b);
  return levels[Math.floor(levels.length / 2)];
}

/** Soften S and Z sounds: turn down only the hiss band, only while it outweighs the vowels. */
function deEss(voice: Float32Array, sr: number): Float32Array {
  const ms = (x: number) => Math.round((sr * x) / 1000);
  const threshold = vowelLevel(voice, sr);
  if (!threshold) return voice;
  const hiss = zeroPhase(voice, sr, "hp", 4500);
  const attack = 1 - Math.exp(-1 / (sr * 0.001));
  const release = 1 - Math.exp(-1 / (sr * 0.025));
  const ratio = 3;
  const floor = Math.pow(10, -10 / 20);
  const gain = new Float32Array(voice.length);
  let power = 0;
  for (let i = 0; i < voice.length; i++) {
    const p = hiss[i] * hiss[i];
    power += (p - power) * (p > power ? attack : release);
    const envelope = Math.sqrt(power);
    gain[i] = envelope > threshold ? Math.max(floor, Math.pow(threshold / envelope, 1 - 1 / ratio)) : 1;
  }
  const ahead = ms(2);
  const out = new Float32Array(voice.length);
  for (let i = 0; i < voice.length; i++) {
    let g = gain[i];
    for (let j = 1; j <= ahead && i + j < voice.length; j++) g = Math.min(g, gain[i + j]);
    out[i] = voice[i] - (1 - g) * hiss[i];
  }
  return out;
}

/** Soft, echoing, spatial room with the dry voice kept clearly in front. */
function shape(raw: Float32Array, sr: number): { left: Float32Array; right: Float32Array } {
  const mono = deEss(raw, sr);
  const tailMs = 900;
  const n = mono.length + Math.round((sr * tailMs) / 1000);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const ms = (x: number) => Math.round((sr * x) / 1000);

  for (let i = 0; i < mono.length; i++) {
    left[i] += mono[i] * 0.86;
    right[i] += mono[i] * 0.86;
  }

  const taps: [number, number, "L" | "R"][] = [
    [17, 0.2, "L"],
    [26, 0.17, "R"],
    [38, 0.14, "R"],
    [51, 0.12, "L"],
    [67, 0.09, "R"],
    [84, 0.07, "L"],
  ];
  for (const [delayMs, gain, side] of taps) {
    const d = ms(delayMs);
    const dst = side === "L" ? left : right;
    let lp = 0;
    for (let i = 0; i < mono.length; i++) {
      lp += (mono[i] - lp) * 0.55;
      dst[i + d] += lp * gain;
    }
  }

  const echoDelay = ms(118);
  const feedback = 0.34;
  const wet = 0.3;
  const buf = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const inp = i < mono.length ? mono[i] : 0;
    const back = i >= echoDelay ? buf[i - echoDelay] : 0;
    lp += (inp + back * feedback - lp) * 0.32;
    buf[i] = lp;
    left[i] += buf[i] * wet * 0.9;
    if (i + ms(7) < n) right[i + ms(7)] += buf[i] * wet;
  }

  const mix = new Float32Array(n);
  for (let i = 0; i < n; i++) mix[i] = (left[i] + right[i]) / 2;
  const vowels = vowelLevel(mix, sr);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const byPeak = peak > 0 ? 0.84 / peak : 1;
  const g = vowels > 0 ? Math.min(Math.pow(10, -25 / 20) / vowels, byPeak) : byPeak;
  for (let i = 0; i < n; i++) {
    left[i] *= g;
    right[i] *= g;
  }

  const floor = 0.0015;
  let last = n - 1;
  while (last > 0 && Math.abs(left[last]) < floor && Math.abs(right[last]) < floor) last--;
  const end = Math.min(n, last + ms(60));
  const fade = Math.min(ms(25), end);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    left[end - 1 - i] *= k;
    right[end - 1 - i] *= k;
  }
  return { left: left.subarray(0, end), right: right.subarray(0, end) };
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
    const { left, right } = shape(samples, sampleRate);
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

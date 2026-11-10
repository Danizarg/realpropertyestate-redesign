/**
 * Voice shaping shared by the local recording tool (tools/voice) and the
 * optional live voice route. Dependency-free so Node can run it directly.
 *
 *  - De-essing: softens S and Z sounds only while they outweigh the vowels.
 *  - "room": Zouza's treatment — early reflections, a soft 118 ms echo and a
 *    stereo spread, with the dry voice kept clearly in front.
 *  - "cosmic": the room plus a long, dark, diffuse reverb (Freeverb-style) and
 *    wider stereo, for a floating, celestial presence.
 */

export type VoiceSpace = "room" | "cosmic";

// ---------------------------------------------------------------- WAV

/** Reads a 16-bit PCM WAV into mono float samples. */
export function decodeWav(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
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
export function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
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

// ---------------------------------------------------------------- filters

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

// ---------------------------------------------------------------- the space

/** Freeverb-style diffuse reverb, decorrelated per channel for width. */
function diffuseReverb(
  input: Float32Array,
  sr: number,
  n: number,
  opts: { size: number; damp: number; predelayMs: number; spread: number }
): { left: Float32Array; right: Float32Array } {
  const scale = sr / 44100;
  const combTunings = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const allpassTunings = [556, 441, 341, 225];
  const pre = Math.round((sr * opts.predelayMs) / 1000);

  const run = (offset: number) => {
    const out = new Float32Array(n);
    const combs = combTunings.map((t) => ({ buf: new Float32Array(Math.max(1, Math.round((t + offset) * scale))), idx: 0, store: 0 }));
    const allpasses = allpassTunings.map((t) => ({ buf: new Float32Array(Math.max(1, Math.round((t + offset) * scale))), idx: 0 }));
    for (let i = 0; i < n; i++) {
      const src = i - pre;
      const x = src >= 0 && src < input.length ? input[src] * 0.015 : 0;
      let acc = 0;
      for (const c of combs) {
        const y = c.buf[c.idx];
        c.store = y * (1 - opts.damp) + c.store * opts.damp;
        c.buf[c.idx] = x + c.store * opts.size;
        c.idx = (c.idx + 1) % c.buf.length;
        acc += y;
      }
      for (const a of allpasses) {
        const b = a.buf[a.idx];
        a.buf[a.idx] = acc + b * 0.5;
        a.idx = (a.idx + 1) % a.buf.length;
        acc = b - acc;
      }
      out[i] = acc;
    }
    return out;
  };
  return { left: run(0), right: run(opts.spread) };
}

/**
 * Shapes a mono voice into a stereo clip: de-essed, placed in a room (Zouza's
 * treatment) or in a larger "cosmic" space, loudness-matched, tail trimmed.
 */
export function shapeVoice(raw: Float32Array, sr: number, space: VoiceSpace = "room"): { left: Float32Array; right: Float32Array } {
  const cosmic = space === "cosmic";
  const mono = deEss(raw, sr);
  const tailMs = cosmic ? 2600 : 900;
  const n = mono.length + Math.round((sr * tailMs) / 1000);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const ms = (x: number) => Math.round((sr * x) / 1000);

  // Dry voice, centred (a phone speaker sums the channels).
  const dry = cosmic ? 0.86 : 0.86;
  for (let i = 0; i < mono.length; i++) {
    left[i] += mono[i] * dry;
    right[i] += mono[i] * dry;
  }

  // Early reflections, alternating sides, slightly dulled.
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

  // Soft feedback echo: each repeat softer and darker.
  const echoDelay = ms(cosmic ? 140 : 118);
  const feedback = cosmic ? 0.22 : 0.34;
  const wet = cosmic ? 0.12 : 0.3;
  const buf = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const inp = i < mono.length ? mono[i] : 0;
    const back = i >= echoDelay ? buf[i - echoDelay] : 0;
    lp += (inp + back * feedback - lp) * (cosmic ? 0.24 : 0.32);
    buf[i] = lp;
    left[i] += buf[i] * wet * 0.9;
    if (i + ms(cosmic ? 11 : 7) < n) right[i + ms(cosmic ? 11 : 7)] += buf[i] * wet;
  }

  // The celestial part: a long, dark, wide bloom behind the voice.
  if (cosmic) {
    const darkened = biquad(biquad(mono, sr, "lp", 5200), sr, "hp", 180);
    const verb = diffuseReverb(darkened, sr, n, { size: 0.88, damp: 0.4, predelayMs: 30, spread: 23 });
    const amount = 0.85;
    for (let i = 0; i < n; i++) {
      left[i] += verb.left[i] * amount;
      right[i] += verb.right[i] * amount;
    }
  }

  // Loudness from the vowels (not the loudest instant), with a peak ceiling.
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

  // Trim the inaudible end and fade the cut.
  const floor = cosmic ? 0.0003 : 0.0015;
  let last = n - 1;
  while (last > 0 && Math.abs(left[last]) < floor && Math.abs(right[last]) < floor) last--;
  const end = Math.min(n, last + ms(cosmic ? 120 : 60));
  const fade = Math.min(ms(cosmic ? 220 : 25), end);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    left[end - 1 - i] *= k;
    right[end - 1 - i] *= k;
  }
  return { left: left.subarray(0, end), right: right.subarray(0, end) };
}

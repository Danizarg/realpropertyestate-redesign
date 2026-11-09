/**
 * A slow, generative ambient score built with the Web Audio API — warm
 * detuned pads through a soft low-pass and a synthetic hall reverb. No audio
 * files, nothing to license, ~0 bytes over the network.
 */

const CHORDS: number[][] = [
  // D maj9, B min11, G maj7(#11), A add9 — open voicings, calm and bright
  [146.83, 220.0, 277.18, 329.63, 369.99],
  [123.47, 185.0, 246.94, 293.66, 329.63],
  [98.0, 196.0, 246.94, 293.66, 369.99],
  [110.0, 164.81, 246.94, 277.18, 329.63],
];

const CHORD_SECONDS = 9;

function makeImpulse(ctx: AudioContext, seconds = 3.2, decay = 2.6): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

interface Voice {
  oscillators: OscillatorNode[];
  gain: GainNode;
}

export class AmbientScore {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private master: GainNode;
  private filter: BiquadFilterNode;
  private bus: GainNode;
  private voices: Voice[] = [];
  private chordIndex = 0;
  private timer = 0;
  private running = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.85;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 3;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 950;
    this.filter.Q.value = 0.6;

    // Slow filter "breathing"
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.045;
    lfoGain.gain.value = 320;
    lfo.connect(lfoGain).connect(this.filter.frequency);
    lfo.start();

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.62;
    const dry = ctx.createGain();
    dry.gain.value = 0.5;

    this.bus = ctx.createGain();
    this.bus.connect(this.filter);
    this.filter.connect(dry).connect(this.master);
    this.filter.connect(reverb).connect(wet).connect(this.master);
    this.master.connect(compressor).connect(this.analyser).connect(ctx.destination);
  }

  private playChord(freqs: number[], fade = 4.5) {
    const now = this.ctx.currentTime;
    // release the previous chord
    for (const v of this.voices) {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(0, now + fade + 1.5);
      v.oscillators.forEach((o) => o.stop(now + fade + 2));
    }
    this.voices = freqs.map((f, i) => {
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      const level = (i === 0 ? 0.2 : 0.13) / freqs.length;
      gain.gain.linearRampToValueAtTime(level, now + fade);
      const oscillators = [-6, 5].map((cents, j) => {
        const o = this.ctx.createOscillator();
        o.type = j === 0 ? "sine" : "triangle";
        o.frequency.value = f;
        o.detune.value = cents;
        o.connect(gain);
        o.start(now);
        return o;
      });
      gain.connect(this.bus);
      return { oscillators, gain };
    });
  }

  start(level = 0.08, fadeSeconds = 3.5) {
    if (this.running) return this.setLevel(level, fadeSeconds);
    this.running = true;
    this.playChord(CHORDS[this.chordIndex]);
    this.timer = window.setInterval(() => {
      this.chordIndex = (this.chordIndex + 1) % CHORDS.length;
      this.playChord(CHORDS[this.chordIndex]);
    }, CHORD_SECONDS * 1000);
    this.setLevel(level, fadeSeconds);
  }

  setLevel(level: number, fadeSeconds = 2) {
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(level, now + fadeSeconds);
  }

  stop(fadeSeconds = 1.6) {
    if (!this.running) return;
    this.running = false;
    window.clearInterval(this.timer);
    this.setLevel(0, fadeSeconds);
    const now = this.ctx.currentTime;
    for (const v of this.voices) v.oscillators.forEach((o) => o.stop(now + fadeSeconds + 0.2));
    this.voices = [];
  }

  get isRunning() {
    return this.running;
  }
}

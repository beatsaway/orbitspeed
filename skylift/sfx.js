/**
 * Ladder interaction voices. Layered WebAudio on the shared sfx bus.
 */
import { getAudioCtx, resumeAudio, busOut } from "./music/ctx.js";

let noiseBuf = null;
let lastRung = 0;

function noise(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = Math.floor(ctx.sampleRate * 1.4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    brown = brown * 0.97 + white * 0.03;
    d[i] = white * 0.55 + brown * 1.4;
  }
  noiseBuf = buf;
  return buf;
}

function ready() {
  const ctx = getAudioCtx();
  const dest = busOut("sfx");
  if (!ctx || !dest) return null;
  resumeAudio();
  return { ctx, dest, t: ctx.currentTime };
}

function gainEnv(ctx, t, attack, hold, release, peak) {
  const g = ctx.createGain();
  const a = Math.max(0.004, attack);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + release);
  return g;
}

function tone(ctx, dest, t, type, f0, f1, dur, peak) {
  const osc = ctx.createOscillator();
  const g = gainEnv(ctx, t, 0.008, dur * 0.25, dur * 0.75, peak);
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function burst(ctx, dest, t, dur, peak, fromHz, toHz, q) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(fromHz, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, toHz), t + dur);
  const g = gainEnv(ctx, t, 0.01, dur * 0.2, dur * 0.8, peak);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function echo(ctx, dest, t, delaySec, feedback, dur) {
  const delay = ctx.createDelay(1);
  delay.delayTime.value = delaySec;
  const fb = ctx.createGain();
  fb.gain.value = feedback;
  const wet = ctx.createGain();
  wet.gain.setValueAtTime(0.7, t);
  wet.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(dest);
  return delay;
}

export function createSfx() {
  return {
    drop(weight = 1) {
      const a = ready();
      if (!a) return;
      const k = Math.max(0.4, Math.min(1.7, weight));
      burst(a.ctx, a.dest, a.t, 0.5 / k, 0.1 + 0.05 * k, 900 + 1400 * k, 180, 0.9);
      tone(a.ctx, a.dest, a.t, "sine", 280 * k, 90 + 40 * k, 0.42 / Math.sqrt(k), 0.045 * k);
      tone(a.ctx, a.dest, a.t + 0.02, "triangle", 460 * k, 140 + 50 * k, 0.24 / k, 0.03);
    },
    land(weight = 1) {
      const a = ready();
      if (!a) return;
      const k = Math.max(0.4, Math.min(1.7, weight));
      const { ctx, dest, t } = a;
      const body = ctx.createGain();
      body.gain.value = 1;
      const slap = echo(ctx, dest, t, 0.018 + 0.012 / k, 0.16, 0.28 + 0.12 / k);
      body.connect(slap);
      body.connect(dest);
      tone(ctx, body, t, "sine", 90 + 70 * k, 40 + 18 * k, 0.16 + 0.08 / k, 0.22 + 0.08 * k);
      tone(ctx, body, t, "triangle", 140 + 90 * k, 60 + 24 * k, 0.12, 0.08 * k);
      burst(ctx, body, t, 0.1 + 0.05 / k, 0.14 + 0.06 * k, 420 + 500 * k, 140, 0.7);
      tone(ctx, dest, t, "sine", 700 + 600 * k, 260, 0.05 + 0.02 / k, 0.04 * k);
    },
    climb(dir) {
      const a = ready();
      if (!a) return;
      if (dir === 0) {
        burst(a.ctx, a.dest, a.t, 0.12, 0.08, 700, 180, 1.2);
        tone(a.ctx, a.dest, a.t, "sine", 280, 140, 0.1, 0.05);
        return;
      }
      const up = dir > 0;
      tone(a.ctx, a.dest, a.t, "triangle", up ? 420 : 300, up ? 640 : 180, 0.09, 0.07);
      tone(a.ctx, a.dest, a.t + 0.06, "sine", up ? 680 : 220, up ? 920 : 140, 0.12, 0.05);
      burst(a.ctx, a.dest, a.t, 0.1, 0.07, up ? 1600 : 700, up ? 500 : 200, 2);
    },
    pace(step) {
      const a = ready();
      if (!a) return;
      const base = 220 * Math.pow(1.35, step);
      for (let i = 0; i < 3; i++) {
        tone(a.ctx, a.dest, a.t + i * 0.045, "triangle", base * (1 + i * 0.18), base * (1.4 + i * 0.1), 0.07, 0.05);
      }
      burst(a.ctx, a.dest, a.t, 0.16, 0.05, 1800, 600, 3);
    },
    rung(dir) {
      const a = ready();
      if (!a || a.t - lastRung < 0.07) return;
      lastRung = a.t;
      const f = dir > 0 ? 740 : 410;
      tone(a.ctx, a.dest, a.t, "triangle", f, f * 0.72, 0.045, 0.045);
      burst(a.ctx, a.dest, a.t, 0.04, 0.04, f * 2.2, f * 0.6, 4);
    },
    fall() {
      const a = ready();
      if (!a) return;
      const { ctx, dest, t } = a;
      const tail = echo(ctx, dest, t, 0.19, 0.34, 1.6);
      tone(ctx, dest, t, "sine", 92, 28, 1.15, 0.42);
      tone(ctx, tail, t, "sawtooth", 180, 40, 0.7, 0.08);
      burst(ctx, dest, t, 0.9, 0.34, 2200, 90, 0.55);
      const car = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const g = gainEnv(ctx, t, 0.01, 0.12, 0.7, 0.16);
      car.type = "sine";
      mod.type = "sine";
      car.frequency.setValueAtTime(210, t);
      car.frequency.exponentialRampToValueAtTime(48, t + 0.8);
      mod.frequency.setValueAtTime(37, t);
      modGain.gain.setValueAtTime(280, t);
      modGain.gain.exponentialRampToValueAtTime(20, t + 0.8);
      mod.connect(modGain);
      modGain.connect(car.frequency);
      car.connect(g);
      g.connect(tail);
      car.start(t);
      mod.start(t);
      car.stop(t + 0.9);
      mod.stop(t + 0.9);
    },
    again() {
      const a = ready();
      if (!a) return;
      tone(a.ctx, a.dest, a.t, "sine", 392, 523, 0.22, 0.08);
      tone(a.ctx, a.dest, a.t + 0.12, "sine", 523, 784, 0.28, 0.07);
      tone(a.ctx, a.dest, a.t + 0.12, "triangle", 1046, 1568, 0.2, 0.03);
    },
    bit() {
      const a = ready();
      if (!a) return;
      tone(a.ctx, a.dest, a.t, "sine", 988, 1319, 0.14, 0.045);
      tone(a.ctx, a.dest, a.t + 0.02, "triangle", 1976, 1976, 0.08, 0.012);
    },
    arrive() {
      const a = ready();
      if (!a) return;
      const notes = [784, 988, 1175, 1568];
      for (let i = 0; i < notes.length; i++) {
        const f = notes[i];
        tone(a.ctx, a.dest, a.t + i * 0.08, "sine", f, f, 0.46, 0.06);
        tone(a.ctx, a.dest, a.t + i * 0.08, "triangle", f * 2, f * 2, 0.22, 0.016);
      }
    },
    speak(text, onPulse) {
      const ctx = getAudioCtx();
      const dest = busOut("sfx");
      if (!ctx || !dest) return;
      resumeAudio();
      const voice = { base: 250 };
      const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
      const dur = Math.min(4.2, Math.max(0.7, 0.28 + words * 0.22));
      const t0 = ctx.currentTime + 0.02;
      let t = 0;
      while (t < dur - 0.05) {
        const kind = Math.random();
        const when = t0 + t;
        let len = 0.08;
        if (kind < 0.28) {
          const src = ctx.createBufferSource();
          src.buffer = noise(ctx);
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 1800 + Math.random() * 1400;
          bp.Q.value = 5;
          const g = gainEnv(ctx, when, 0.004, 0.01, 0.03, 0.12);
          src.connect(bp);
          bp.connect(g);
          g.connect(dest);
          src.start(when);
          src.stop(when + 0.08);
          len = 0.04;
        } else if (kind < 0.7) {
          const f0 = voice.base * (0.8 + Math.random() * 0.5);
          tone(ctx, dest, when, Math.random() < 0.5 ? "triangle" : "sine", f0, f0 * (0.75 + Math.random() * 0.6), 0.12, 0.07);
          len = 0.12;
        } else {
          const a = voice.base * (1.2 + Math.random());
          const b = voice.base * (2.2 + Math.random() * 1.5);
          tone(ctx, dest, when, "sine", a, b, 0.09, 0.06);
          len = 0.09;
        }
        if (onPulse) {
          const wait = t * 1000;
          setTimeout(onPulse, wait);
        }
        t += len + 0.04 + Math.random() * 0.08;
      }
    }
  };
}

(function () {
let noiseBuf = null;
let rumble = null;
let whoosh = null;

function noise(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = Math.floor(ctx.sampleRate * 1);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

function ready() {
  const ctx = getAudioCtx();
  const dest = busOut("sfx");
  if (!ctx || !dest) return null;
  void resumeAudio();
  return { ctx, dest, t: ctx.currentTime };
}

function tone(ctx, dest, t, type, f0, f1, dur, peak) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function createSfx() {
  return {
    click() {
      const a = ready();
      if (!a) return;
      tone(a.ctx, a.dest, a.t, "sine", 880, 560, 0.045, 0.03);
    },
    ignite() {
      const a = ready();
      if (!a) return;
      this.quiet();
      const { ctx, dest, t } = a;
      const burst = ctx.createBufferSource();
      burst.buffer = noise(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(180, t);
      bp.frequency.exponentialRampToValueAtTime(2600, t + 0.42);
      bp.frequency.exponentialRampToValueAtTime(740, t + 1.05);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(0.2, t + 0.06);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
      burst.connect(bp);
      bp.connect(bg);
      bg.connect(dest);
      burst.start(t);
      burst.stop(t + 1.2);
      tone(ctx, dest, t, "sawtooth", 78, 40, 0.55, 0.045);
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx);
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(160, t);
      filter.frequency.exponentialRampToValueAtTime(1500, t + 0.35);
      filter.frequency.exponentialRampToValueAtTime(480, t + 1.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.075, t + 0.22);
      src.connect(filter);
      filter.connect(g);
      g.connect(dest);
      src.start(t);
      rumble = { src, g, ctx };
    },
    quiet() {
      this.spinStop();
      if (!rumble) return;
      const { src, g, ctx } = rumble;
      rumble = null;
      const t = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        src.stop(t + 0.3);
      } catch (_) {}
    },
    spin(level) {
      const a = ready();
      if (!a) return;
      const amt = Math.max(0, Math.min(1, level));
      if (amt < 0.04) {
        this.spinStop();
        return;
      }
      const { ctx, dest, t } = a;
      if (!whoosh) {
        const src = ctx.createBufferSource();
        src.buffer = noise(ctx);
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 0.85;
        filter.frequency.value = 360;
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        src.connect(filter);
        filter.connect(g);
        g.connect(dest);
        src.start(t);
        whoosh = { src, g, filter, ctx };
      }
      const wobble = 0.72 + 0.28 * Math.sin(t * (4 + amt * 9));
      const gain = (0.02 + amt * 0.09) * wobble;
      const freq = 260 + amt * 1900;
      try {
        whoosh.g.gain.setTargetAtTime(Math.max(0.0001, gain), t, 0.04);
        whoosh.filter.frequency.setTargetAtTime(freq, t, 0.05);
      } catch (_) {}
    },
    spinStop() {
      if (!whoosh) return;
      const { src, g, ctx } = whoosh;
      whoosh = null;
      const t = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        src.stop(t + 0.22);
      } catch (_) {}
    },
    drop() {
      const a = ready();
      if (!a) return;
      const { ctx, dest, t } = a;
      tone(ctx, dest, t, "triangle", 220, 70, 0.28, 0.06);
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(140, t + 0.22);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      src.connect(filter);
      filter.connect(g);
      g.connect(dest);
      src.start(t);
      src.stop(t + 0.26);
    },
    win() {
      const a = ready();
      if (!a) return;
      tone(a.ctx, a.dest, a.t, "triangle", 523, 523, 0.16, 0.05);
      tone(a.ctx, a.dest, a.t + 0.12, "triangle", 659, 659, 0.16, 0.05);
      tone(a.ctx, a.dest, a.t + 0.24, "triangle", 784, 784, 0.28, 0.06);
    },
    miss() {
      const a = ready();
      if (!a) return;
      tone(a.ctx, a.dest, a.t, "sine", 320, 140, 0.35, 0.05);
      tone(a.ctx, a.dest, a.t + 0.08, "triangle", 220, 90, 0.4, 0.04);
    },
    bang() {
      const a = ready();
      if (!a) return;
      this.quiet();
      const { ctx, dest, t } = a;
      tone(ctx, dest, t, "sine", 110, 28, 0.62, 0.14);
      tone(ctx, dest, t, "triangle", 180, 40, 0.28, 0.06);
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2200, t);
      filter.frequency.exponentialRampToValueAtTime(70, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
      src.connect(filter);
      filter.connect(g);
      g.connect(dest);
      src.start(t);
      src.stop(t + 0.66);
    }
  };
}
window.createSfx = createSfx;
})();

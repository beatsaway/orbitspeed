/**
 * Oscillator voices from Primidi JS-synth profiles (detune in semitones, no sample WAVs)
 * plus Circlebeat-lite drums (kick / snare / hat / tom / clap / ride / cowbell).
 */

const INST = {
  bass: {
    oscs: [{ type: "square", detune: 0 }],
    attack: 0.008,
    decay: 0.1,
    sustain: 0.7,
    release: 0.15,
    lp: 800,
    lpVel: 900,
  },
  warmPad: {
    oscs: [
      { type: "triangle", detune: 0.05 },
      { type: "sine", detune: 12.05 },
    ],
    attack: 0.12,
    decay: 0.28,
    sustain: 0.72,
    release: 0.85,
    lp: 900,
    lpVel: 1100,
  },
  darkPad: {
    oscs: [
      { type: "sine", detune: -0.04 },
      { type: "triangle", detune: 0.06 },
    ],
    attack: 0.22,
    decay: 0.4,
    sustain: 0.7,
    release: 1.15,
    lp: 620,
    lpVel: 700,
  },
  glass: {
    oscs: [
      { type: "sine", detune: 0 },
      { type: "sine", detune: 19.02 },
    ],
    attack: 0.004,
    decay: 0.55,
    sustain: 0.08,
    release: 0.7,
    lp: 2600,
    lpVel: 1800,
  },
  string: {
    oscs: [
      { type: "sawtooth", detune: -0.08 },
      { type: "triangle", detune: 0.07 },
    ],
    attack: 0.05,
    decay: 0.2,
    sustain: 0.65,
    release: 0.35,
    lp: 1600,
    lpVel: 2200,
  },
  organ: {
    oscs: [
      { type: "square", detune: -0.1 },
      { type: "square", detune: 0.02 },
    ],
    attack: 0.01,
    decay: 0.1,
    sustain: 0.85,
    release: 0.2,
    lp: 2200,
    lpVel: 800,
  },
  pluck: {
    oscs: [{ type: "sawtooth", detune: 0 }],
    attack: 0.002,
    decay: 0.12,
    sustain: 0.2,
    release: 0.12,
    lp: 1500,
    lpVel: 2200,
    noise: 0.04,
  },
  epiano: {
    oscs: [
      { type: "square", detune: -0.035 },
      { type: "triangle", detune: 0.031 },
    ],
    attack: 0.0025,
    decay: 0.12,
    sustain: 0.25,
    release: 0.18,
    lp: 4200,
    lpVel: 2800,
    noise: 0.04,
  },
  piano: {
    oscs: [{ type: "triangle", detune: 0 }],
    attack: 0.01,
    decay: 0.32,
    sustain: 0.35,
    release: 0.36,
    lp: 2200,
    lpVel: 1400,
    noise: 0.02,
  },
  bell: {
    oscs: [
      { type: "sine", detune: 0 },
      { type: "triangle", detune: 12 },
    ],
    attack: 0.002,
    decay: 0.35,
    sustain: 0.05,
    release: 0.25,
    lp: 3200,
    lpVel: 2800,
  },
  lead: {
    oscs: [
      { type: "sawtooth", detune: -0.04 },
      { type: "sawtooth", detune: 0.04 },
    ],
    attack: 0.01,
    decay: 0.08,
    sustain: 0.6,
    release: 0.2,
    lp: 1800,
    lpVel: 2600,
  },
};

let _noise = null;

function noiseBuf(ctx) {
  if (_noise && _noise.sampleRate === ctx.sampleRate) return _noise;
  const n = Math.max(1, Math.floor(ctx.sampleRate * 0.28));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + w * 0.03;
    b1 = 0.95 * b1 + w * 0.08;
    d[i] = (w * 0.35 + b0 + b1) * 0.55;
  }
  _noise = buf;
  return buf;
}

export function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function playNote(ctx, dest, midi, t, dur, level, instName) {
  const p = INST[instName] || INST.pluck;
  if (level < 0.004) return;
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  const vel = Math.max(0.15, Math.min(1, level / 0.08));
  const cutoff = Math.max(80, Math.min(12000, p.lp + (p.lpVel || 0) * vel * 0.55));
  lp.frequency.setValueAtTime(cutoff, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(120, p.lp * 0.55), t + Math.max(0.04, p.decay));
  lp.Q.value = 0.7;
  const peak = level;
  const sus = peak * p.sustain;
  const a = Math.max(0.002, p.attack);
  const dcy = Math.max(0.02, p.decay);
  const rel = Math.max(0.04, p.release);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.linearRampToValueAtTime(Math.max(0.0001, sus), t + a + dcy);
  g.gain.setValueAtTime(Math.max(0.0001, sus), t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  lp.connect(g);
  g.connect(dest);
  const hz = midiToHz(midi);
  const oscs = p.oscs.slice(0, 2);
  for (const spec of oscs) {
    const osc = ctx.createOscillator();
    osc.type = spec.type;
    osc.frequency.value = hz * Math.pow(2, (spec.detune || 0) / 12);
    osc.connect(lp);
    osc.start(t);
    osc.stop(t + dur + rel + 0.03);
  }
  if (p.noise > 0.005) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(ctx);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(level * p.noise, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    src.connect(hp);
    hp.connect(ng);
    ng.connect(dest);
    src.start(t);
    src.stop(t + 0.05);
  }
}

export function playKick(ctx, dest, t, level) {
  if (level < 0.01) return;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.055);
  const sq = ctx.createOscillator();
  sq.type = "square";
  sq.frequency.setValueAtTime(150, t);
  sq.frequency.exponentialRampToValueAtTime(42, t + 0.055);
  const fm = ctx.createOscillator();
  fm.type = "sine";
  fm.frequency.value = 150 * 1.6;
  const fmg = ctx.createGain();
  fmg.gain.setValueAtTime(42, t);
  fmg.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
  fm.connect(fmg);
  fmg.connect(osc.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(level * 0.78, t);
  g.gain.setValueAtTime(level * 0.78, t + 0.012);
  g.gain.exponentialRampToValueAtTime(level * 0.12, t + 0.045);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(level * 0.22, t);
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.connect(g);
  sq.connect(sg);
  g.connect(dest);
  sg.connect(dest);
  osc.start(t);
  sq.start(t);
  fm.start(t);
  osc.stop(t + 0.45);
  sq.stop(t + 0.45);
  fm.stop(t + 0.12);
  const click = ctx.createOscillator();
  click.type = "sine";
  click.frequency.value = 3800;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(level * 0.18, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.006);
  click.connect(cg);
  cg.connect(dest);
  click.start(t);
  click.stop(t + 0.02);
}

export function playSnare(ctx, dest, t, level) {
  if (level < 0.01) return;
  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(185, t);
  body.frequency.exponentialRampToValueAtTime(95, t + 0.08);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(level * 0.5, t);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  body.connect(bg);
  bg.connect(dest);
  body.start(t);
  body.stop(t + 0.18);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(level * 0.85, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  src.connect(hp);
  hp.connect(ng);
  ng.connect(dest);
  src.start(t);
  src.stop(t + 0.22);

  const crack = ctx.createBufferSource();
  crack.buffer = noiseBuf(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 6200;
  bp.Q.value = 1.1;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(level * 0.7, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  crack.connect(bp);
  bp.connect(cg);
  cg.connect(dest);
  crack.start(t);
  crack.stop(t + 0.05);
}

export function playHat(ctx, dest, t, level, open) {
  if (level < 0.008) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = open ? 4800 : 7000;
  const g = ctx.createGain();
  const dur = open ? 0.18 : 0.045;
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(hp);
  hp.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + Math.max(dur, 0.05));
  const stick = ctx.createOscillator();
  stick.type = "sine";
  stick.frequency.value = open ? 4200 : 5500;
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(level * 0.22, t);
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
  stick.connect(sg);
  sg.connect(dest);
  stick.start(t);
  stick.stop(t + 0.02);
}

export function playTom(ctx, dest, t, level) {
  if (level < 0.01) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(148, t);
  osc.frequency.exponentialRampToValueAtTime(72, t + 0.14);
  const g = ctx.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + 0.32);
}

export function playClap(ctx, dest, t, level) {
  if (level < 0.01) return;
  for (let i = 0; i < 3; i++) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 1.1;
    const g = ctx.createGain();
    const at = t + i * 0.012;
    g.gain.setValueAtTime(level * (i === 2 ? 0.9 : 0.45), at);
    g.gain.exponentialRampToValueAtTime(0.001, at + (i === 2 ? 0.12 : 0.04));
    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(at);
    src.stop(at + 0.14);
  }
}

export function playRide(ctx, dest, t, level) {
  if (level < 0.008) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 6000;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 9000;
  bp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.setValueAtTime(level * 0.65, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  src.connect(hp);
  hp.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + 0.36);
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o1.type = "sine";
  o2.type = "sine";
  o1.frequency.value = 6000;
  o2.frequency.value = 8500;
  const og = ctx.createGain();
  og.gain.setValueAtTime(level * 0.12, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o1.connect(og);
  o2.connect(og);
  og.connect(dest);
  o1.start(t);
  o2.start(t);
  o1.stop(t + 0.24);
  o2.stop(t + 0.24);
}

export function playCowbell(ctx, dest, t, level) {
  if (level < 0.01) return;
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o1.type = "sine";
  o2.type = "triangle";
  o1.frequency.value = 800;
  o2.frequency.value = 1200;
  const g1 = ctx.createGain();
  const g2 = ctx.createGain();
  g1.gain.setValueAtTime(level * 0.7, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  g2.gain.setValueAtTime(level * 0.4, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  o1.connect(g1);
  o2.connect(g2);
  g1.connect(dest);
  g2.connect(dest);
  o1.start(t);
  o2.start(t);
  o1.stop(t + 0.18);
  o2.stop(t + 0.12);
  const stick = ctx.createBufferSource();
  stick.buffer = noiseBuf(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3200;
  bp.Q.value = 1.5;
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(level * 0.28, t);
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
  stick.connect(bp);
  bp.connect(sg);
  sg.connect(dest);
  stick.start(t);
  stick.stop(t + 0.03);
}

/**
 * Ship BGM — mysterious space-incident score.
 * Restored rooms: lonely modal pads, sometimes a slow hull-pulse.
 * SOS rooms: tighter rhythm, still dark — not lounge jazz, not chiptune.
 */

import { getAudioCtx, resumeAudio, busOut, getMixerLevels } from "./ctx.js?v=groups";
import {
  playNote,
  playKick,
  playSnare,
  playHat,
  playTom,
  playClap,
  playRide,
  playCowbell,
} from "./music-voices.js";

const NOTE = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Fs: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const IV = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
};

function midi(root, oct, type) {
  const r = 12 * (oct + 1) + (NOTE[root] ?? 0);
  const iv = IV[type] || IV.min;
  return iv.map((n) => r + n);
}

function skipState(pattern) {
  return { pattern: (pattern || []).slice(), counter: 0, index: 0 };
}

function shouldSkip(state) {
  if (!state?.pattern?.length) return false;
  state.counter += 1;
  const target = state.pattern[state.index] || 4;
  if (state.counter >= target) {
    state.counter = 0;
    state.index = (state.index + 1) % state.pattern.length;
    return true;
  }
  return false;
}

function guidePool(tones) {
  if (!tones.length) return [];
  if (tones.length < 3) return tones.slice();
  const root = tones[0];
  let third = null;
  let seventh = null;
  for (const n of tones) {
    const pc = ((n - root) % 12 + 12) % 12;
    if ((pc === 3 || pc === 4) && third == null) third = n;
    if ((pc === 10 || pc === 11) && seventh == null) seventh = n;
  }
  if (third != null && seventh != null) return [third, seventh];
  return [tones[0], tones[tones.length - 1]];
}

function nearestTone(pool, prev) {
  if (!pool.length) return null;
  if (prev == null) return pool[0];
  let best = pool[0];
  let dist = Math.abs(pool[0] - prev);
  for (let i = 1; i < pool.length; i++) {
    const d = Math.abs(pool[i] - prev);
    if (d < dist) {
      best = pool[i];
      dist = d;
    }
  }
  return best;
}

function cycleNotes(tones, mode, i) {
  const n = tones.length;
  if (!n) return [];
  if (mode === "block" || mode === "normal") return tones.slice(0, Math.min(3, n));
  if (mode === "descend") return [tones[n - 1 - (i % n)]];
  if (mode === "fifth") return [tones[0], tones[Math.min(2, n - 1)]];
  if (mode === "ascend2") {
    if (n < 2) return [tones[0]];
    const s = i % (n - 1);
    return [tones[s], tones[s + 1]];
  }
  if (mode === "descend2") {
    if (n < 2) return [tones[n - 1]];
    const s = i % (n - 1);
    return [tones[n - 1 - s], tones[n - 2 - s]];
  }
  if (mode === "zigzag") {
    if (n < 2) return [tones[0]];
    const s = i % (n - 1);
    return i % 2 === 0 ? [tones[s], tones[s + 1]] : [tones[s + 1], tones[s]];
  }
  if (mode === "guide") return cycleNotes(guidePool(tones), "walk", i);
  if (mode === "arp") return [tones[i % n]];
  if (mode === "arp8") {
    const oct = Math.floor(i / n) % 2;
    return [tones[i % n] + oct * 12];
  }
  const period = Math.max(1, (n - 1) * 2);
  const p = i % period;
  const idx = p < n ? p : period - p;
  return [tones[Math.max(0, Math.min(n - 1, idx))]];
}

function trebleNotes(tones, next, mode, i, pos, state) {
  const isApproach = mode === "approach" || mode === "lick";
  const isResolve = mode === "resolve";
  const pool = mode === "guide" ? guidePool(tones) : tones;
  const poolNext = mode === "guide" ? guidePool(next) : next;
  if (isResolve && pos >= 0.72 && poolNext.length) {
    const target = nearestTone(poolNext, state.prevMidi);
    if (!state.resolveArmed) {
      state.resolveArmed = true;
      return target != null ? [Math.max(21, target - 1)] : [];
    }
    return target != null ? [target] : [];
  }
  if (isApproach && pos >= (mode === "lick" ? 0.5 : 0.58) && poolNext.length) {
    if (state.nextWalkIdx == null) {
      const land = nearestTone(poolNext, state.prevMidi);
      state.nextWalkIdx = Math.max(0, poolNext.indexOf(land));
      return land != null ? [land] : [];
    }
    state.nextWalkIdx += 1;
    return cycleNotes(poolNext, "walk", state.nextWalkIdx);
  }
  if (mode === "bebop") {
    const target = cycleNotes(pool, "walk", Math.floor(i / 2))[0];
    if (i % 2 === 1 && target != null) {
      const prev = state.prevMidi;
      const step = prev != null && target > prev ? -1 : 1;
      return [Math.max(21, Math.min(108, target + step))];
    }
    return target != null ? [target] : [];
  }
  return cycleNotes(tones, mode, i);
}

function bassNotes(tones, mode, i) {
  if (!tones.length) return [];
  const root = tones[0] - 12;
  const fifth = (tones[Math.min(2, tones.length - 1)] || tones[0]) - 12;
  if (mode === "fifth") return i % 2 === 0 ? [root] : [fifth];
  if (mode === "octave") return i % 2 === 0 ? [root] : [root + 12];
  if (mode === "walk") return [cycleNotes(tones.map((n) => n - 12), "walk", i)[0]];
  if (mode === "ascend") return [tones[i % tones.length] - 12];
  return [root];
}

function volMod(kind, barStep, intensity) {
  if (!kind || kind === "none" || intensity <= 0) return 1;
  const p = barStep / 16;
  let m = 1;
  if (kind === "uphill") m = 0.62 + 0.38 * p;
  else if (kind === "downhill") m = 1 - 0.32 * p;
  else if (kind === "valley") m = 0.62 + 0.38 * Math.abs(p - 0.5) * 2;
  else if (kind === "hill") m = 1 - 0.32 * Math.abs(p - 0.5) * 2;
  else if (kind === "2valley") m = 0.7 + 0.3 * Math.abs((p * 2) % 1 - 0.5) * 2;
  else if (kind === "2hill") m = 1 - 0.28 * Math.abs((p * 2) % 1 - 0.5) * 2;
  return 1 + (m - 1) * intensity;
}

function hit(grid, step) {
  if (!grid) return false;
  const c = grid[step % grid.length];
  return c === "x" || c === "o";
}

function hatOpen(grid, step) {
  if (!grid) return false;
  return grid[step % grid.length] === "o";
}

/** Circlebeat Bjorklund Euclidean rhythm. */
function euclidHits(steps, pulses) {
  steps = Math.max(0, steps | 0);
  pulses = Math.max(0, Math.min(steps, pulses | 0));
  if (!steps) return [];
  if (!pulses) return Array(steps).fill(false);
  if (pulses === steps) return Array(steps).fill(true);
  const pattern = [];
  const counts = [];
  const remainders = [];
  let divisor = steps - pulses;
  remainders.push(pulses);
  let level = 0;
  while (true) {
    counts.push(Math.floor(divisor / remainders[level]));
    remainders.push(divisor % remainders[level]);
    divisor = remainders[level];
    level += 1;
    if (remainders[level] <= 1) break;
  }
  counts.push(divisor);
  function build(lvl) {
    if (lvl === -1) {
      pattern.push(false);
      return;
    }
    if (lvl === -2) {
      pattern.push(true);
      return;
    }
    for (let c = 0; c < counts[lvl]; c++) build(lvl - 1);
    if (remainders[lvl] !== 0) build(lvl - 2);
  }
  build(level);
  return pattern.reverse();
}

function rotateBools(arr, rot) {
  const n = arr.length;
  if (!n) return arr;
  rot = ((rot % n) + n) % n;
  return arr.slice(rot).concat(arr.slice(0, rot));
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function circHit(ring, step) {
  if (!ring?.hits?.length) return false;
  return ring.hits[step % ring.n];
}

function bakeCircle(cfg, gen) {
  if (!cfg) return null;
  const rng = mulberry32(0xc1a1c1e + gen * 9973);
  const out = { morphEvery: cfg.morphEvery || 64 };
  const keys = ["kick", "snare", "hat", "hatOpen", "ride", "tom", "clap", "cow"];
  for (const key of keys) {
    const r = cfg[key];
    if (!r?.n) continue;
    const n = r.n;
    const cycle = r.pulseCycle;
    let pulses = cycle ? cycle[gen % cycle.length] : r.pulses;
    if (r.pulseVar) pulses += (gen % 3) - 1;
    pulses = Math.max(1, Math.min(n, pulses | 0));
    const rot = ((r.rot || 0) + gen * (r.rotStep || 0)) % n;
    let hits = rotateBools(euclidHits(n, pulses), rot);
    const skipP = r.skip || 0;
    const protect = key === "kick" || key === "snare";
    if (skipP > 0) {
      hits = hits.map((h) => h && (protect || rng() >= skipP));
    }
    if (protect) {
      const kept = hits.filter(Boolean).length;
      const floor = Math.max(2, Math.round(n / 8));
      if (kept < Math.min(pulses, floor)) {
        const raw = rotateBools(euclidHits(n, pulses), rot);
        let need = Math.min(pulses, floor) - kept;
        for (let i = 0; i < n && need > 0; i++) {
          if (raw[i] && !hits[i]) {
            hits[i] = true;
            need -= 1;
          }
        }
      }
    }
    out[key] = { n, hits };
  }
  return out;
}

const STINGS = {
  unlock: { inst: "bell", gap: 0.09, dur: 0.32, g: 0.09, notes: [62, 69, 74] },
  repair: { inst: "glass", gap: 0.16, dur: 0.55, g: 0.055, notes: [57, 64] },
  upgrade: { inst: "lead", gap: 0.06, dur: 0.28, g: 0.08, notes: [67, 71, 74, 79] },
  wake: { inst: "bell", gap: 0.11, dur: 0.4, g: 0.09, notes: [64, 67, 71, 76] },
  rod: { inst: "organ", gap: 0.07, dur: 0.3, g: 0.085, notes: [53, 60, 65, 72] },
  credits: { inst: "bell", gap: 0.14, dur: 0.62, g: 0.11, notes: [67, 71, 74, 79, 86] },
  fall: { inst: "glass", gap: 0.22, dur: 1.15, g: 0.055, notes: [72, 68, 63, 58, 53] },
};

function bed(partial) {
  return {
    bpm: 54,
    hold: [32, 24, 32, 16],
    padInst: "darkPad",
    padG: 0.046,
    padVoices: 3,
    bassInst: "bass",
    bassEvery: 16,
    bassSkip: [5, 8],
    bassG: 0.03,
    bassMode: "root",
    bassVol: "none",
    trebleInst: "glass",
    trebleEvery: 8,
    trebleEvery2: 0,
    treblePhase: 32,
    trebleSkip: [4, 7, 5],
    trebleMode: "fifth",
    trebleMode2: "",
    trebleG: 0.028,
    trebleHuman: 0.02,
    trebleVol: "hill",
    kick: "",
    snare: "",
    hat: "",
    tom: "",
    clap: "",
    ride: "",
    cow: "",
    drumG: 0.12,
    sos: false,
    ...partial,
  };
}

const BEDS = {
  scene1: bed({
    bpm: 88,
    hold: [16, 16, 16, 16],
    padInst: "darkPad",
    padG: 0.07,
    padVoices: 3,
    bassEvery: 8,
    bassSkip: [6, 4],
    bassG: 0.04,
    bassMode: "fifth",
    bassVol: "hill",
    trebleInst: "glass",
    trebleEvery: 4,
    trebleEvery2: 8,
    treblePhase: 32,
    trebleSkip: [5, 3, 7],
    trebleMode: "descend",
    trebleMode2: "fifth",
    trebleG: 0.042,
    trebleVol: "downhill",
    drumG: 0.24,
    circle: {
      morphEvery: 64,
      kick: { n: 16, pulses: 3, rot: 0, pulseCycle: [3, 3, 4, 3] },
      hat: { n: 16, pulses: 5, rot: 1, rotStep: 1, skip: 0.45, pulseVar: true },
      tom: { n: 32, pulses: 2, rot: 20, skip: 0.3 },
    },
    progs: [
      [midi("D", 3, "min7"), midi("Bb", 2, "sus2"), midi("A", 2, "m7b5"), midi("G", 2, "madd9")],
      [midi("D", 3, "madd9"), midi("F", 2, "min7"), midi("G", 2, "sus2"), midi("A", 2, "min7")],
    ],
  }),
  victory: bed({
    bpm: 96,
    hold: [8, 8, 8, 16],
    padInst: "organ",
    padG: 0.062,
    padVoices: 4,
    bassEvery: 4,
    bassMode: "octave",
    bassG: 0.044,
    bassSkip: [11, 13],
    trebleInst: "bell",
    trebleEvery: 2,
    trebleEvery2: 4,
    trebleMode: "arp",
    trebleMode2: "fifth",
    trebleSkip: [7, 11],
    trebleG: 0.048,
    kick: "x-------x-------",
    hat: "----x-------x---",
    ride: "x---------------x-------x-------",
    drumG: 0.2,
    bassVol: "uphill",
    progs: [
      [midi("C", 3, "maj7"), midi("G", 3, "add9"), midi("A", 2, "min7"), midi("F", 3, "maj7")],
      [midi("C", 3, "add9"), midi("E", 3, "min7"), midi("F", 3, "maj7"), midi("G", 3, "sus2")],
    ],
  }),
  talk: bed({
    bpm: 52,
    hold: [32, 32, 32, 32],
    padInst: "piano",
    padG: 0.08,
    padVoices: 3,
    bassEvery: 16,
    bassG: 0.034,
    trebleInst: "bell",
    trebleEvery: 8,
    trebleMode: "fifth",
    trebleG: 0.036,
    drumG: 0,
    progs: [
      [midi("F", 3, "maj7"), midi("C", 3, "add9"), midi("G", 2, "sus2"), midi("A", 2, "min7")],
    ],
  }),
  play: bed({
    bpm: 112,
    hold: [8, 8, 8, 8],
    padInst: "organ",
    padG: 0.05,
    bassEvery: 4,
    bassMode: "octave",
    bassG: 0.062,
    trebleInst: "pluck",
    trebleEvery: 2,
    trebleMode: "arp",
    trebleG: 0.055,
    drumG: 0.3,
    kick: "x---x---x---x---",
    hat: "x-x-x-x-x-x-x-x-",
    snare: "----x-------x---",
    progs: [
      [midi("C", 3, "maj7"), midi("A", 2, "min7"), midi("F", 3, "maj7"), midi("G", 3, "sus4")],
      [midi("C", 3, "add9"), midi("E", 3, "min7"), midi("F", 3, "maj"), midi("G", 3, "add9")],
    ],
  }),
  lab: bed({
    bpm: 94,
    hold: [16, 16, 16, 16],
    padInst: "glass",
    padG: 0.055,
    bassEvery: 8,
    bassMode: "fifth",
    bassG: 0.05,
    trebleInst: "lead",
    trebleEvery: 4,
    trebleMode: "arp8",
    trebleG: 0.046,
    drumG: 0.2,
    circle: {
      morphEvery: 64,
      kick: { n: 16, pulses: 4, rot: 0 },
      hat: { n: 16, pulses: 8, rot: 1, skip: 0.15 },
      tom: { n: 16, pulses: 2, rot: 6, skip: 0.28 },
    },
    progs: [
      [midi("E", 2, "min7"), midi("C", 3, "maj7"), midi("G", 2, "sus2"), midi("D", 3, "min7")],
      [midi("E", 2, "madd9"), midi("A", 2, "min"), midi("C", 3, "maj"), midi("B", 2, "min7")],
    ],
  }),
  design: bed({
    bpm: 84,
    hold: [16, 16, 16, 8],
    padInst: "organ",
    padG: 0.06,
    padVoices: 3,
    bassEvery: 8,
    bassMode: "walk",
    bassG: 0.05,
    trebleInst: "piano",
    trebleEvery: 4,
    trebleMode: "block",
    trebleG: 0.044,
    drumG: 0.16,
    kick: "x-------x-------",
    hat: "--x---x---x---x-",
    progs: [
      [midi("G", 2, "maj7"), midi("D", 3, "sus2"), midi("E", 2, "min7"), midi("C", 3, "maj7")],
      [midi("G", 2, "add9"), midi("B", 2, "min7"), midi("C", 3, "maj7"), midi("D", 3, "sus4")],
    ],
  }),
  close: bed({
    bpm: 64,
    hold: [32, 32, 32],
    padInst: "darkPad",
    padG: 0.07,
    padVoices: 3,
    bassEvery: 16,
    bassG: 0.03,
    trebleInst: "bell",
    trebleEvery: 8,
    trebleMode: "descend",
    trebleG: 0.032,
    drumG: 0.06,
    hat: "x---------------",
    progs: [
      [midi("A", 2, "min7"), midi("F", 2, "maj7"), midi("C", 3, "add9"), midi("G", 2, "sus2")],
    ],
  }),
};

const TRACK_STEPS = 256;

const OK_PLAYLIST = [
  bed({
    bpm: 48,
    hold: [32, 32, 24, 32],
    padInst: "darkPad",
    padG: 0.052,
    bassEvery: 16,
    bassG: 0.022,
    trebleInst: "glass",
    trebleEvery: 8,
    trebleMode: "fifth",
    trebleSkip: [4, 7, 6],
    trebleG: 0.026,
    trebleVol: "downhill",
    drumG: 0.06,
    progs: [
      [midi("D", 3, "madd9"), midi("G", 2, "sus2"), midi("A", 2, "min7"), midi("C", 3, "sus2")],
      [midi("D", 3, "min7"), midi("Bb", 2, "sus2"), midi("F", 2, "maj7"), midi("A", 2, "min")],
    ],
  }),
  bed({
    bpm: 58,
    hold: [16, 24, 16, 16],
    padInst: "darkPad",
    padG: 0.04,
    bassEvery: 8,
    bassMode: "fifth",
    bassG: 0.032,
    trebleInst: "piano",
    trebleEvery: 4,
    trebleMode: "arp",
    trebleSkip: [6, 4, 8],
    trebleG: 0.024,
    drumG: 0.11,
    circle: {
      morphEvery: 64,
      kick: { n: 16, pulses: 3, rot: 0, pulseCycle: [3, 2, 3, 3] },
      hat: { n: 16, pulses: 4, rot: 2, skip: 0.4 },
      tom: { n: 32, pulses: 2, rot: 18, skip: 0.35 },
    },
    progs: [
      [midi("A", 2, "min7"), midi("F", 2, "add9"), midi("G", 2, "sus2"), midi("E", 2, "min7")],
      [midi("A", 2, "madd9"), midi("C", 3, "sus2"), midi("D", 3, "min7"), midi("G", 2, "min")],
    ],
  }),
  bed({
    bpm: 52,
    hold: [32, 16, 32, 24],
    padInst: "string",
    padG: 0.036,
    bassEvery: 16,
    bassG: 0.024,
    trebleInst: "glass",
    trebleEvery: 8,
    trebleMode: "descend",
    trebleSkip: [5, 8, 4],
    trebleG: 0.022,
    trebleVol: "hill",
    kick: "",
    hat: "",
    drumG: 0.05,
    progs: [
      [midi("E", 2, "min7"), midi("C", 3, "sus2"), midi("A", 2, "madd9"), midi("B", 2, "m7b5")],
      [midi("E", 2, "madd9"), midi("G", 2, "sus2"), midi("D", 3, "min7"), midi("A", 2, "min")],
    ],
  }),
  bed({
    bpm: 68,
    hold: [16, 16, 16, 16],
    padInst: "darkPad",
    padG: 0.034,
    bassEvery: 8,
    bassMode: "walk",
    bassG: 0.034,
    trebleInst: "pluck",
    trebleEvery: 4,
    trebleMode: "arp",
    trebleSkip: [5, 3, 7],
    trebleG: 0.026,
    trebleVol: "valley",
    drumG: 0.13,
    circle: {
      morphEvery: 48,
      kick: { n: 16, pulses: 4, rot: 0, pulseCycle: [4, 3, 5, 4] },
      hat: { n: 16, pulses: 6, rot: 1, skip: 0.38 },
      tom: { n: 16, pulses: 2, rot: 10, skip: 0.25 },
      ride: { n: 32, pulses: 3, rot: 4, skip: 0.4 },
    },
    progs: [
      [midi("G", 2, "min7"), midi("D", 3, "sus2"), midi("Eb", 3, "maj7"), midi("C", 3, "madd9")],
      [midi("G", 2, "madd9"), midi("Bb", 2, "maj"), midi("F", 2, "sus2"), midi("D", 3, "min7")],
    ],
  }),
  bed({
    bpm: 46,
    hold: [32, 32, 32, 24],
    padInst: "darkPad",
    padG: 0.055,
    bassEvery: 16,
    bassG: 0.02,
    trebleInst: "bell",
    trebleEvery: 8,
    trebleMode: "fifth",
    trebleSkip: [3, 8, 5],
    trebleG: 0.022,
    trebleVol: "downhill",
    drumG: 0.05,
    progs: [
      [midi("F", 2, "min7"), midi("Db", 3, "sus2"), midi("Eb", 3, "add9"), midi("C", 3, "m7b5")],
      [midi("F", 2, "madd9"), midi("Ab", 2, "maj"), midi("Bb", 2, "sus2"), midi("C", 3, "min7")],
    ],
  }),
  bed({
    bpm: 74,
    hold: [16, 8, 16, 16],
    padInst: "warmPad",
    padG: 0.03,
    bassEvery: 8,
    bassMode: "fifth",
    bassG: 0.036,
    trebleInst: "piano",
    trebleEvery: 4,
    trebleEvery2: 8,
    trebleMode: "walk",
    trebleMode2: "fifth",
    trebleSkip: [6, 4, 5],
    trebleG: 0.024,
    drumG: 0.14,
    circle: {
      morphEvery: 64,
      kick: { n: 16, pulses: 5, rot: 0, pulseCycle: [5, 4, 5, 3] },
      hat: { n: 16, pulses: 7, rot: 0, skip: 0.42 },
      tom: { n: 32, pulses: 3, rot: 12, skip: 0.28 },
    },
    progs: [
      [midi("D", 3, "min7"), midi("A", 2, "sus2"), midi("Bb", 2, "maj"), midi("G", 2, "madd9")],
      [midi("D", 3, "madd9"), midi("F", 2, "maj7"), midi("C", 3, "sus2"), midi("A", 2, "min7")],
    ],
  }),
];

const SOS_PLAYLIST = [
  bed({
    sos: true,
    bpm: 58,
    hold: [16, 16, 24, 16],
    padInst: "darkPad",
    padG: 0.032,
    bassEvery: 8,
    bassG: 0.038,
    bassMode: "root",
    trebleInst: "glass",
    trebleEvery: 8,
    trebleMode: "descend",
    trebleG: 0.016,
    drumG: 0.16,
    circle: {
      morphEvery: 64,
      kick: { n: 16, pulses: 2, rot: 0, pulseCycle: [2, 2, 3, 2] },
      tom: { n: 16, pulses: 1, rot: 12, skip: 0.2 },
    },
    progs: [
      [midi("D", 3, "dim"), midi("A", 2, "m7b5"), midi("Bb", 2, "dim"), midi("F", 2, "min7")],
      [midi("D", 3, "m7b5"), midi("G", 2, "dim"), midi("C", 3, "madd9"), midi("A", 2, "dim")],
    ],
  }),
  bed({
    sos: true,
    bpm: 70,
    hold: [16, 8, 16, 16],
    padInst: "organ",
    padG: 0.018,
    bassEvery: 8,
    bassG: 0.04,
    trebleInst: "pluck",
    trebleEvery: 8,
    trebleMode: "descend",
    trebleG: 0.014,
    drumG: 0.18,
    circle: {
      morphEvery: 48,
      kick: { n: 16, pulses: 4, rot: 0, pulseCycle: [4, 5, 3, 4] },
      hat: { n: 16, pulses: 4, rot: 2, skip: 0.35 },
      tom: { n: 16, pulses: 2, rot: 8, skip: 0.2 },
    },
    progs: [
      [midi("E", 2, "dim"), midi("B", 2, "m7b5"), midi("C", 3, "dim"), midi("G", 2, "min7")],
      [midi("A", 2, "m7b5"), midi("E", 2, "dim"), midi("F", 2, "dim7"), midi("D", 3, "madd9")],
    ],
  }),
  bed({
    sos: true,
    bpm: 50,
    hold: [32, 24, 32, 16],
    padInst: "string",
    padG: 0.034,
    bassEvery: 16,
    bassG: 0.028,
    trebleInst: "piano",
    trebleEvery: 16,
    trebleMode: "descend",
    trebleG: 0.014,
    kick: "x---------------",
    drumG: 0.12,
    progs: [
      [midi("A", 2, "dim"), midi("E", 2, "dim7"), midi("F", 2, "min7"), midi("C", 3, "m7b5")],
      [midi("E", 2, "madd9"), midi("A", 2, "m7b5"), midi("D", 3, "dim"), midi("G", 2, "dim")],
    ],
  }),
  bed({
    sos: true,
    bpm: 78,
    hold: [8, 16, 8, 16],
    padInst: "darkPad",
    padG: 0.022,
    bassEvery: 8,
    bassG: 0.042,
    trebleInst: "lead",
    trebleEvery: 8,
    trebleMode: "descend",
    trebleG: 0.012,
    drumG: 0.17,
    circle: {
      morphEvery: 32,
      kick: { n: 16, pulses: 5, rot: 0, pulseCycle: [5, 4, 6, 5] },
      hat: { n: 16, pulses: 5, rot: 1, skip: 0.4 },
      tom: { n: 16, pulses: 2, rot: 6, skip: 0.22 },
    },
    progs: [
      [midi("D", 3, "dim"), midi("A", 2, "dim7"), midi("F", 2, "min7"), midi("C", 3, "m7b5")],
      [midi("A", 2, "madd9"), midi("D", 3, "m7b5"), midi("G", 2, "dim"), midi("C", 3, "min7")],
    ],
  }),
];

function playlistBed(kind, index) {
  const list = kind === "sos" ? SOS_PLAYLIST : OK_PLAYLIST;
  if (!list.length) return BEDS.scene1;
  return list[((index % list.length) + list.length) % list.length];
}

function bedOf(name) {
  if (name === "sos") return playlistBed("sos", 0);
  if (name === "ok") return playlistBed("ok", 0);
  return BEDS[name] || BEDS.scene1;
}

export class ShipMusic {
  constructor() {
    this._on = false;
    this._mood = "scene1";
    this._wantMood = "scene1";
    this._step = 0;
    this._nextT = 0;
    this._timer = 0;
    this._bus = null;
    this._drum = null;
    this._harm = null;
    this._layer = null;
    this._sting = null;
    this._duck = null;
    this._duckAmt = 1;
    this._wantDuck = 1;
    this._pendingMood = "scene1";
    this._pendingAt = 0;
    this._okI = 0;
    this._sosI = 0;
    this._trackLeft = TRACK_STEPS;
    this._progI = 0;
    this._chordI = 0;
    this._holdLeft = 0;
    this._holdTotal = 16;
    this._tones = [];
    this._nextTones = [];
    this._bassSkip = null;
    this._trebleSkip = null;
    this._cycle = 0;
    this._chordState = { prevMidi: null, resolveArmed: false, nextWalkIdx: null };
    this._circle = null;
    this._circleGen = 0;
  }

  start() {
    const ctx = getAudioCtx();
    if (!ctx || this._on) {
      void resumeAudio();
      return;
    }
    void resumeAudio();
    const dest = busOut("music") || ctx.destination;
    const duck = ctx.createGain();
    duck.gain.value = 1;
    duck.connect(dest);
    const sting = ctx.createGain();
    sting.gain.value = 1;
    sting.connect(duck);
    this._on = true;
    this._duck = duck;
    this._sting = sting;
    this._bus = dest;
    this._openLayer(ctx);
    this._nextT = ctx.currentTime + 0.06;
    this._step = 0;
    this._mood = "scene1";
    this._wantMood = "scene1";
    this._pendingMood = "scene1";
    this._pendingAt = 0;
    this._armBed(bedOf("scene1"));
    this._tick();
  }

  stop() {
    this._on = false;
    if (this._timer) clearTimeout(this._timer);
    this._timer = 0;
  }

  setMood(name) {
    const allowed = ["sos", "scene1", "victory", "ok", "talk", "play", "lab", "design", "close"];
    const next = allowed.includes(name) ? name : "ok";
    if (next === this._pendingMood) return;
    this._pendingMood = next;
    this._pendingAt = performance.now();
    this._wantMood = next;
  }

  _liveBed() {
    if (this._mood === "sos") return playlistBed("sos", this._sosI);
    if (this._mood === "ok") return playlistBed("ok", this._okI);
    return bedOf(this._mood);
  }

  _openLayer(ctx) {
    const t = ctx.currentTime;
    const old = this._layer;
    if (old) {
      try {
        old.gain.cancelScheduledValues(t);
        old.gain.setValueAtTime(Math.max(0.0001, old.gain.value), t);
        old.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      } catch (_) {}
      window.setTimeout(() => {
        try {
          old.disconnect();
        } catch (_) {}
      }, 320);
    }
    const layer = ctx.createGain();
    layer.gain.setValueAtTime(old ? 0.0001 : 1, t);
    if (old) layer.gain.linearRampToValueAtTime(1, t + 0.16);
    layer.connect(this._duck);
    const harm = ctx.createGain();
    harm.gain.value = 0.72;
    harm.connect(layer);
    const drum = ctx.createGain();
    drum.gain.value = 0.5;
    drum.connect(layer);
    this._layer = layer;
    this._harm = harm;
    this._drum = drum;
  }

  setDuck(speaking) {
    if (!speaking) {
      this._wantDuck = 1;
      return;
    }
    this._wantDuck = this._mood === "scene1" ? 0.58 : 0.38;
  }

  sting(kind) {
    const spec = STINGS[kind];
    const ctx = getAudioCtx();
    if (!spec || !ctx) return;
    void resumeAudio();
    const dest = this._sting || this._duck || busOut("music") || ctx.destination;
    let t = ctx.currentTime + 0.02;
    if (this._duck) {
      try {
        this._duck.gain.setTargetAtTime(0.45, t, 0.04);
        this._duck.gain.setTargetAtTime(this._wantDuck, t + 0.85, 0.18);
      } catch (_) {}
    }
    for (const n of spec.notes) {
      playNote(ctx, dest, n, t, spec.dur, spec.g, spec.inst);
      t += spec.gap;
    }
  }

  update() {
    if (!this._on || !this._duck) return;
    if ((getMixerLevels().music || 0) < 0.02) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (Math.abs(this._duckAmt - this._wantDuck) > 0.01) {
      this._duckAmt += (this._wantDuck - this._duckAmt) * 0.14;
      this._duck.gain.setTargetAtTime(this._duckAmt, ctx.currentTime, 0.08);
    }
  }

  _armBed(b) {
    this._bassSkip = skipState(b.bassSkip);
    this._trebleSkip = skipState(b.trebleSkip);
    this._progI = 0;
    this._chordI = 0;
    this._holdLeft = 0;
    this._holdTotal = 16;
    this._cycle = 0;
    this._tones = [];
    this._nextTones = [];
    this._chordState = { prevMidi: null, resolveArmed: false, nextWalkIdx: null };
    this._circleGen = 0;
    this._circle = bakeCircle(b.circle, 0);
    this._trackLeft = TRACK_STEPS;
  }

  _tick() {
    if (!this._on) return;
    const ctx = getAudioCtx();
    if (!ctx) {
      this._timer = setTimeout(() => this._tick(), 280);
      return;
    }
    const horizon = ctx.currentTime + 0.16;
    while (this._nextT < horizon) this._sixteenth(ctx, this._nextT);
    this._timer = setTimeout(() => this._tick(), 70);
  }

  _peekNext() {
    const b = this._liveBed();
    const progs = b.progs || [];
    if (!progs.length) return this._tones;
    let pi = this._progI;
    let ci = this._chordI + 1;
    if (ci >= progs[pi % progs.length].length) {
      ci = 0;
      pi = (pi + 1) % progs.length;
    }
    const prog = progs[pi % progs.length];
    return prog[ci % prog.length] || prog[0] || this._tones;
  }

  _sixteenth(ctx, t) {
    if (this._pendingMood !== this._mood && performance.now() - this._pendingAt >= 280) {
      this._mood = this._pendingMood;
      this._wantMood = this._mood;
      this._openLayer(ctx);
      this._armBed(this._liveBed());
      this._step = 0;
    }
    const b = this._liveBed();
    const step16 = 60 / Math.max(48, b.bpm) / 4;
    const barStep = this._step % 16;
    const pos = this._holdTotal > 0 ? 1 - this._holdLeft / this._holdTotal : 0;

    if (this._holdLeft <= 0) this._nextChord(ctx, b, t, step16);
    this._holdLeft -= 1;

    const dg = b.drumG || 0.2;
    this._drums(ctx, b, t, step16, dg);

    const bassEvery = Math.max(1, b.bassEvery || 8);
    if (this._step % bassEvery === 0 && !shouldSkip(this._bassSkip) && this._tones[0]) {
      const notes = bassNotes(this._tones, b.bassMode || "root", Math.floor(this._step / bassEvery));
      const g = (b.bassG || 0.05) * volMod(b.bassVol, barStep, 0.45);
      playNote(ctx, this._harm, notes[0], t, step16 * bassEvery * 0.92, g, b.bassInst || "bass");
    }

    const phase = b.treblePhase || 32;
    const useB = b.trebleEvery2 > 0 && Math.floor(this._step / phase) % 2 === 1;
    const trebleEvery = Math.max(1, useB ? b.trebleEvery2 : b.trebleEvery || 2);
    const trebleMode = (useB && b.trebleMode2) || b.trebleMode || "walk";
    if (this._step % trebleEvery === 0 && !shouldSkip(this._trebleSkip)) {
      const notes = trebleNotes(this._tones, this._nextTones, trebleMode, this._cycle, pos, this._chordState);
      this._cycle += 1;
      if (notes[0] != null) this._chordState.prevMidi = notes[0];
      const human = (b.trebleHuman || 0) * ((this._step * 13) % 5) * 0.2;
      const dur = step16 * trebleEvery * (trebleMode === "block" || trebleMode === "normal" ? 0.85 : 0.7);
      const g = (b.trebleG || 0.04) * volMod(b.trebleVol, barStep, 0.4);
      for (let i = 0; i < notes.length; i++) {
        playNote(ctx, this._harm, notes[i], t + human + i * 0.012, dur, g * (i ? 0.72 : 1), b.trebleInst || "pluck");
      }
    }

    this._step += 1;
    this._trackLeft -= 1;
    if (
      (this._mood === "ok" || this._mood === "sos") &&
      this._trackLeft <= 0
    ) {
      if (this._mood === "ok") this._okI += 1;
      else this._sosI += 1;
      this._openLayer(ctx);
      this._armBed(this._liveBed());
      this._step = 0;
    }
    this._nextT = t + step16;
  }

  _drums(ctx, b, t, step16, dg) {
    const dest = this._drum;
    if (this._circle) {
      const every = this._circle.morphEvery || 64;
      if (this._step > 0 && this._step % every === 0) {
        this._circleGen += 1;
        this._circle = bakeCircle(b.circle, this._circleGen);
      }
      const swing = this._step % 2 === 1 ? step16 * 0.07 : 0;
      const tt = t + swing;
      const s = this._step;
      if (circHit(this._circle.kick, s)) playKick(ctx, dest, tt, dg);
      if (circHit(this._circle.snare, s)) playSnare(ctx, dest, tt, dg * 0.82);
      if (circHit(this._circle.hatOpen, s)) playHat(ctx, dest, tt, dg * 0.3, true);
      else if (circHit(this._circle.hat, s)) playHat(ctx, dest, tt, dg * 0.34, false);
      if (circHit(this._circle.tom, s)) playTom(ctx, dest, tt, dg * 0.62);
      if (circHit(this._circle.clap, s)) playClap(ctx, dest, tt, dg * 0.48);
      if (circHit(this._circle.ride, s)) playRide(ctx, dest, tt, dg * 0.32);
      if (circHit(this._circle.cow, s)) playCowbell(ctx, dest, tt, dg * 0.4);
      return;
    }
    const barStep = this._step % 16;
    if (hit(b.kick, barStep)) playKick(ctx, dest, t, dg);
    if (hit(b.snare, barStep)) playSnare(ctx, dest, t, dg * 0.85);
    if (hit(b.hat, barStep)) playHat(ctx, dest, t, dg * (hatOpen(b.hat, barStep) ? 0.38 : 0.42), hatOpen(b.hat, barStep));
    if (hit(b.tom, barStep)) playTom(ctx, dest, t, dg * 0.7);
    if (hit(b.clap, barStep)) playClap(ctx, dest, t, dg * 0.6);
    if (hit(b.ride, barStep)) playRide(ctx, dest, t, dg * 0.4);
    if (hit(b.cow, barStep)) playCowbell(ctx, dest, t, dg * 0.45);
  }

  _nextChord(ctx, b, t, step16) {
    const progs = b.progs || [];
    if (!progs.length) return;
    if (this._tones.length) {
      this._chordI += 1;
      if (this._chordI >= progs[this._progI % progs.length].length) {
        this._chordI = 0;
        this._progI = (this._progI + 1) % progs.length;
      }
    }
    const holds = b.hold || [16];
    this._holdTotal = holds[(this._chordI + this._progI) % holds.length] || 16;
    this._holdLeft = this._holdTotal;
    const prog = progs[this._progI % progs.length];
    this._tones = prog[this._chordI % prog.length] || prog[0];
    this._nextTones = this._peekNext();
    this._chordState.resolveArmed = false;
    this._chordState.nextWalkIdx = null;
    if (b.padInst && b.padG > 0.008 && this._tones.length) {
      const dur = this._holdLeft * step16 * 0.96;
      const voices = Math.min(b.padVoices || 2, this._tones.length);
      for (let i = 0; i < voices; i++) {
        playNote(ctx, this._harm, this._tones[i], t + i * 0.018, dur, b.padG * (i ? 0.62 : 1), b.padInst);
      }
    }
  }
}

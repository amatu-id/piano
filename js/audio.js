// Mesin suara: sampel piano Salamander (Yamaha C5, CC-BY) + synth cadangan, reverb, metronom.
import { store } from './util.js';

const SAMPLE_URL = 'https://tonejs.github.io/audio/salamander/';
const SAMPLE_MIDIS = []; for (let m = 21; m <= 108; m += 3) SAMPLE_MIDIS.push(m);
const sampleName = m => ({ 9: 'A', 0: 'C', 3: 'Ds', 6: 'Fs' }[m % 12]) + (Math.floor(m / 12) - 1);

let ctx = null, bus, master, comp, wet, conv;
const buffers = new Map();
const listeners = new Set();

export const audio = {
  inst: store.get('inst', 'piano'),
  volume: store.get('vol', 0.8),
  reverb: store.get('rev', 0.22),
  sustain: false,
  loaded: 0, total: SAMPLE_MIDIS.length,
  get ctx() { return ctx; },
  now() { return ctx ? ctx.currentTime : 0; },
  onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = this.volume;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
    bus = ctx.createGain();
    conv = ctx.createConvolver(); conv.buffer = impulse(2.4);
    wet = ctx.createGain(); wet.gain.value = this.reverb;
    bus.connect(master); bus.connect(conv); conv.connect(wet); wet.connect(master);
    master.connect(comp); comp.connect(ctx.destination);
    loadSamples();
    return ctx;
  },
  setVolume(v) { this.volume = v; store.set('vol', v); if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
  setReverb(v) { this.reverb = v; store.set('rev', v); if (wet) wet.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
  setInst(i) { this.inst = i; store.set('inst', i); },

  // live: noteOn/noteOff (ikut pedal sustain)
  held: new Map(), sustained: new Set(),
  noteOn(m, vel = 0.8) {
    this.init();
    this.noteOff(m, true);
    const v = makeVoice(m, vel, ctx.currentTime);
    this.held.set(m, v);
    return v;
  },
  noteOff(m, force = false) {
    const v = this.held.get(m);
    if (!v) return;
    this.held.delete(m);
    if (this.sustain && !force) { this.sustained.add(v); return; }
    v.stop(ctx.currentTime);
  },
  setSustain(on) {
    this.sustain = on;
    if (!on && ctx) { for (const v of this.sustained) v.stop(ctx.currentTime); this.sustained.clear(); }
    listeners.forEach(f => f());
  },
  // terjadwal: mainkan nada dengan durasi detik
  play(m, dur = 1, when = null, vel = 0.75) {
    this.init();
    const t = when ?? ctx.currentTime;
    const v = makeVoice(m, vel, t);
    v.stop(t + dur);
    return v;
  },
  chord(ms, dur = 1.6, when = null, vel = 0.7, strum = 0) {
    this.init();
    const t = when ?? ctx.currentTime + 0.01;
    ms.forEach((m, i) => this.play(m, dur, t + i * strum, vel));
  },
  arp(ms, step = 0.18, when = null, vel = 0.7, hold = 1.2) {
    this.init();
    const t = when ?? ctx.currentTime + 0.01;
    ms.forEach((m, i) => this.play(m, hold + (ms.length - i) * step, t + i * step, vel));
  },
  click(when, accent = false, vol = 1) {
    this.init();
    const t = when ?? ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((accent ? 0.55 : 0.32) * vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.08);
  },
  stopAll() {
    if (!ctx) return;
    for (const v of active) v.stop(ctx.currentTime, true);
    this.held.clear(); this.sustained.clear();
  },
};

const active = new Set();
const freq = m => 440 * Math.pow(2, (m - 69) / 12);

function nearestSample(m) {
  let best = null, bd = 99;
  for (const [sm, buf] of buffers) { const d = Math.abs(sm - m); if (d < bd) { bd = d; best = [sm, buf]; } }
  return bd <= 9 ? best : null;
}

function makeVoice(m, vel, t) {
  const inst = audio.inst;
  const out = ctx.createGain();
  out.connect(bus);
  const nodes = [];
  let release = 0.35;
  const s = inst === 'piano' ? nearestSample(m) : null;
  if (s) {
    const src = ctx.createBufferSource();
    src.buffer = s[1]; src.playbackRate.value = Math.pow(2, (m - s[0]) / 12);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = 900 + Math.pow(vel, 1.6) * 11000; lp.Q.value = 0.3;
    src.connect(lp); lp.connect(out);
    const g = 0.12 + 0.95 * Math.pow(vel, 1.4);
    out.gain.setValueAtTime(g, t);
    src.start(t);
    nodes.push(src);
    release = m > 88 ? 0.6 : 0.22;
  } else if (inst === 'epiano') {
    const f = freq(m);
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f * 1; mod.type = 'sine';
    mg.gain.setValueAtTime(f * (1.2 + vel * 2.5), t);
    mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 1.2);
    mod.connect(mg); mg.connect(car.frequency);
    const bell = ctx.createOscillator(), bg = ctx.createGain();
    bell.frequency.value = f * 14; bg.gain.setValueAtTime(0.06 * vel, t); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    bell.connect(bg); bg.connect(out);
    car.connect(out);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.32 * (0.3 + vel), t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.06 * (0.3 + vel), t + 2.8);
    [car, mod, bell].forEach(o => o.start(t)); nodes.push(car, mod, bell);
    release = 0.3;
  } else if (inst === 'organ') {
    const f = freq(m);
    [[1, 0.5], [2, 0.32], [3, 0.2], [4, 0.14], [0.5, 0.25]].forEach(([h, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f * h; g.gain.value = a; o.connect(g); g.connect(out); o.start(t); nodes.push(o);
    });
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(0.16, t + 0.02);
    release = 0.06;
  } else if (inst === 'strings') {
    const f = freq(m);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(9000, f * 6); lp.connect(out);
    [-7, 0, 7].forEach(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); nodes.push(o); });
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(0.09 * (0.5 + vel), t + 0.25);
    release = 0.5;
  } else { // synth piano cadangan (sebelum sampel termuat)
    const f = freq(m);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(16000, f * (4 + vel * 10)), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.5), t + 1.5);
    lp.connect(out);
    const o = ctx.createOscillator();
    o.setPeriodicWave(pianoWave());
    o.frequency.value = f; o.connect(lp); o.start(t); nodes.push(o);
    const o2 = ctx.createOscillator(); o2.setPeriodicWave(pianoWave()); o2.frequency.value = f; o2.detune.value = 4; o2.connect(lp); o2.start(t); nodes.push(o2);
    const decay = Math.max(1.2, 6 - (m - 40) * 0.07);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.22 * (0.25 + vel), t + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    release = 0.25;
  }
  const v = {
    m, stopped: false,
    stop(at, hard = false) {
      if (v.stopped) return; v.stopped = true;
      const tt = Math.max(at, ctx.currentTime);
      const r = hard ? 0.03 : release;
      out.gain.cancelScheduledValues(tt);
      out.gain.setTargetAtTime(0, tt, r / 3);
      nodes.forEach(n => { try { n.stop(tt + r * 3 + 0.05); } catch { } });
      setTimeout(() => { active.delete(v); try { out.disconnect(); } catch { } }, (tt - ctx.currentTime + r * 3 + 0.2) * 1000);
    },
  };
  active.add(v);
  // batas polifoni
  if (active.size > 96) { const first = active.values().next().value; first.stop(ctx.currentTime, true); }
  return v;
}

let pw = null;
function pianoWave() {
  if (pw) return pw;
  const n = 24, re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 1; i < n; i++) im[i] = (1 / Math.pow(i, 1.35)) * (i % 7 === 0 ? 0.3 : 1);
  pw = ctx.createPeriodicWave(re, im);
  return pw;
}

function impulse(sec) {
  const rate = ctx.sampleRate, len = Math.floor(rate * sec);
  const b = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) { const x = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 3.2) * (i < rate * 0.01 ? i / (rate * 0.01) : 1); }
  }
  return b;
}

async function loadSamples() {
  const order = [...SAMPLE_MIDIS].sort((a, b) => Math.abs(a - 62) - Math.abs(b - 62));
  let i = 0;
  const worker = async () => {
    while (i < order.length) {
      const m = order[i++];
      try {
        const r = await fetch(SAMPLE_URL + sampleName(m) + '.mp3');
        if (!r.ok) throw new Error(r.status);
        const buf = await ctx.decodeAudioData(await r.arrayBuffer());
        buffers.set(m, buf);
      } catch (e) { /* tetap pakai synth cadangan */ }
      audio.loaded++;
      listeners.forEach(f => f());
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

// Jam presisi (lookahead) untuk metronom & pemutar progresi
export class Clock {
  constructor(bpm = 80, sub = 1) { this.bpm = bpm; this.sub = sub; this.timer = null; }
  get step() { return 60 / this.bpm / this.sub; }
  start(onTick) {
    audio.init();
    this.stop();
    this.i = 0; this.next = audio.now() + 0.1;
    const run = () => {
      while (this.next < audio.now() + 0.15) { onTick(this.i, this.next); this.next += this.step; this.i++; }
    };
    run(); this.timer = setInterval(run, 25);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  get running() { return !!this.timer; }
}

// jalankan fn tepat saat waktu audio `when` tiba (untuk sinkron visual)
export function at(when, fn) {
  const ms = (when - audio.now()) * 1000;
  return setTimeout(fn, Math.max(0, ms));
}
